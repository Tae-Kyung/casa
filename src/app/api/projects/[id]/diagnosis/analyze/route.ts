import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: AI 비즈니스 진단 (SSE 스트리밍)
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

    if (!review.ai_review) {
      return errorResponse('AI 리뷰를 먼저 완료해주세요.', 400)
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

    const systemPrompt = `당신은 비즈니스 진단 전문가입니다. 사업계획서 리뷰 결과를 바탕으로 포괄적인 비즈니스 진단을 수행합니다.

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "overall_health": "healthy 또는 warning 또는 critical",
  "health_score": 0~100 사이 숫자,
  "swot": {
    "strengths": ["강점1", "강점2", ...],
    "weaknesses": ["약점1", "약점2", ...],
    "opportunities": ["기회1", "기회2", ...],
    "threats": ["위협1", "위협2", ...]
  },
  "key_issues": [
    {
      "area": "영역명",
      "severity": "high 또는 medium 또는 low",
      "description": "이슈 설명",
      "recommendation": "개선 권고"
    }
  ],
  "competitive_position": "경쟁 포지션 평가",
  "growth_potential": "성장 잠재력 평가"
}

규칙:
- SWOT 각 항목은 3~5개씩 작성하세요.
- 핵심 이슈는 우선순위 순으로 5개 이내로 작성하세요.
- 각 이슈에는 구체적인 개선 권고를 포함하세요.
- 경쟁 포지션과 성장 잠재력은 2~3문장으로 상세하게 평가하세요.
- 반드시 한국어로 작성하세요.`

    const userPrompt = `다음 사업계획서와 리뷰 결과를 바탕으로 비즈니스 진단을 수행해주세요:

${companyInfo ? `[기업 정보]\n${companyInfo}\n\n` : ''}[사업계획서]
${review.business_plan_text}

[AI 리뷰 결과]
${JSON.stringify(review.ai_review, null, 2)}`

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
            swot_analysis: parsed.swot || null,
            diagnosis_result: parsed,
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
