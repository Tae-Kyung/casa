import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: AI 사업계획 분석 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 사업 리뷰 조회
    const { data: review, error: reviewError } = await supabase
      .from('bi_business_reviews')
      .select('*')
      .eq('project_id', id)
      .limit(1)
      .single()

    if (reviewError || !review) {
      return errorResponse('사업 리뷰를 먼저 작성해주세요.', 400)
    }

    if (!review.business_plan_text) {
      return errorResponse('사업계획서 텍스트가 필요합니다.', 400)
    }

    // 기업 정보 구성
    const companyInfo = [
      review.company_name && `회사명: ${review.company_name}`,
      review.industry && `산업: ${review.industry}`,
      review.founded_year && `설립연도: ${review.founded_year}`,
      review.employee_count && `직원 수: ${review.employee_count}명`,
      review.annual_revenue && `연 매출: ${review.annual_revenue}`,
      review.funding_stage && `투자 단계: ${review.funding_stage}`,
    ].filter(Boolean).join('\n')

    const systemPrompt = `당신은 비즈니스 컨설팅 전문가입니다. 주어진 사업계획서를 분석하고 구조화된 리뷰를 제공합니다.

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "summary": "1-2문장 요약",
  "strengths": ["강점1", "강점2", ...],
  "weaknesses": ["약점1", "약점2", ...],
  "opportunities": ["기회1", "기회2", ...],
  "threats": ["위협1", "위협2", ...],
  "financial_health": "재무 건전성 평가",
  "market_position": "시장 포지션 평가",
  "score": 0~100 사이 숫자,
  "recommendations": ["개선안1", "개선안2", ...]
}

규칙:
- 각 항목은 구체적이고 실행 가능한 내용으로 작성하세요.
- 강점, 약점, 기회, 위협은 각각 3~5개씩 작성하세요.
- 점수는 사업계획의 완성도, 실현 가능성, 시장성을 종합적으로 반영하세요.
- 추천사항은 우선순위 순으로 5개 이내로 작성하세요.
- 반드시 한국어로 작성하세요.`

    const userPrompt = `다음 사업계획서를 분석해주세요:

${companyInfo ? `[기업 정보]\n${companyInfo}\n\n` : ''}[사업계획서]
${review.business_plan_text}`

    const reviewId = review.id

    async function* generateWithSave() {
      let fullContent = ''

      const stream = streamClaude(systemPrompt, userPrompt, {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.5,
        maxTokens: 4000,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
        }
        yield event
      }

      // 스트리밍 완료 후 DB 저장
      try {
        let cleanContent = fullContent.trim()
        const fenceMatch = cleanContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanContent = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanContent)

        const supabaseUpdate = await createClient()
        await supabaseUpdate
          .from('bi_business_reviews')
          .update({
            ai_review: parsed,
            review_score: typeof parsed.score === 'number' ? parsed.score : null,
          })
          .eq('id', reviewId)
      } catch {
        // 파싱 실패 시 무시
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
