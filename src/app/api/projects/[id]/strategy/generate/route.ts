import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: AI 성장 전략 생성 (SSE 스트리밍)
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

    if (!review.diagnosis_result) {
      return errorResponse('비즈니스 진단을 먼저 완료해주세요.', 400)
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

    const systemPrompt = `당신은 전략적 비즈니스 컨설턴트입니다. 비즈니스 진단 결과를 바탕으로 상세한 성장 전략을 수립합니다.

응답은 반드시 다음 JSON 형식으로 제공하세요:
{
  "vision": "비전 선언문",
  "strategic_goals": [
    {
      "goal": "전략 목표",
      "timeline": "달성 기간",
      "kpis": ["KPI1", "KPI2", ...]
    }
  ],
  "action_plan": [
    {
      "priority": "high 또는 medium 또는 low",
      "action": "실행 항목",
      "responsible": "담당 부서/역할",
      "timeline": "실행 기간",
      "expected_outcome": "기대 효과"
    }
  ],
  "resource_requirements": {
    "budget": "필요 예산",
    "team": "필요 인력",
    "technology": "필요 기술/인프라"
  },
  "risk_mitigation": [
    {
      "risk": "위험 요소",
      "mitigation": "대응 방안"
    }
  ],
  "financial_projections": {
    "revenue_target": "매출 목표",
    "cost_optimization": "비용 최적화 방안",
    "break_even": "손익분기점 예상"
  }
}

규칙:
- 전략 목표는 3~5개, 실행 계획은 5~8개를 작성하세요.
- 각 실행 항목은 구체적이고 측정 가능해야 합니다.
- 위험 요소는 3~5개를 식별하고 각각에 대한 대응 방안을 제시하세요.
- 재무 전망은 현실적이고 근거 있는 수치를 제시하세요.
- 반드시 한국어로 작성하세요.`

    const userPrompt = `다음 사업계획서와 진단 결과를 바탕으로 성장 전략을 수립해주세요:

${companyInfo ? `[기업 정보]\n${companyInfo}\n\n` : ''}[사업계획서]
${review.business_plan_text}

[AI 리뷰 결과]
${JSON.stringify(review.ai_review, null, 2)}

[비즈니스 진단 결과]
${JSON.stringify(review.diagnosis_result, null, 2)}`

    const reviewId = review.id

    async function* generateWithSave() {
      let fullContent = ''

      const stream = streamClaude(systemPrompt, userPrompt, {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.6,
        maxTokens: 5000,
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
            strategy_result: parsed,
            action_items: parsed.action_plan || null,
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
