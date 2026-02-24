import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST: AI 종합 보고서 생성 (SSE 스트리밍)
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

    if (!review.strategy_result) {
      return errorResponse('성장 전략을 먼저 완료해주세요.', 400)
    }

    // 프로젝트 정보 조회
    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('name')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
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

    const systemPrompt = `당신은 비즈니스 보고서 전문가입니다. 모든 분석 결과를 종합하여 포괄적인 경영 보고서를 작성합니다.

보고서는 마크다운 형식으로 작성하세요. 다음 섹션을 반드시 포함해야 합니다:

1. **Executive Summary (경영진 요약)** - 핵심 내용 2~3문단
2. **Business Overview (사업 개요)** - 기업 및 사업 소개
3. **Review Findings (리뷰 분석 결과)** - AI 리뷰의 주요 발견사항
4. **SWOT Analysis (SWOT 분석)** - 강점, 약점, 기회, 위협
5. **Diagnosis Results (진단 결과)** - 비즈니스 건강도 및 핵심 이슈
6. **Strategic Recommendations (전략 권고)** - 성장 전략 요약
7. **Action Plan (실행 계획)** - 우선순위별 실행 항목
8. **Financial Outlook (재무 전망)** - 재무 목표 및 전망
9. **Conclusion (결론)** - 종합 평가 및 향후 방향

규칙:
- 전문적이고 격식 있는 문체를 사용하세요.
- 각 섹션은 충분히 상세하게 작성하세요.
- 데이터와 근거를 기반으로 작성하세요.
- 실행 가능한 인사이트를 제공하세요.
- 반드시 한국어로 작성하세요.`

    const userPrompt = `다음 정보를 종합하여 경영 보고서를 작성해주세요:

[프로젝트명]
${project.name}

${companyInfo ? `[기업 정보]\n${companyInfo}\n\n` : ''}[사업계획서]
${review.business_plan_text}

[AI 리뷰 결과]
${JSON.stringify(review.ai_review, null, 2)}

[SWOT 분석]
${review.swot_analysis ? JSON.stringify(review.swot_analysis, null, 2) : 'N/A'}

[비즈니스 진단 결과]
${JSON.stringify(review.diagnosis_result, null, 2)}

[성장 전략]
${JSON.stringify(review.strategy_result, null, 2)}`

    const reviewId = review.id

    async function* generateWithSave() {
      let fullContent = ''

      const stream = streamClaude(systemPrompt, userPrompt, {
        model: 'claude-sonnet-4-20250514',
        temperature: 0.6,
        maxTokens: 6000,
      })

      for await (const event of stream) {
        if (event.type === 'text') {
          fullContent += event.data
        }
        yield event
      }

      // 스트리밍 완료 후 DB 저장
      try {
        // Executive Summary 추출 (첫 번째 섹션의 첫 문단)
        let executiveSummary: string | null = null
        const summaryMatch = fullContent.match(/(?:Executive Summary|경영진 요약)[^\n]*\n+([\s\S]*?)(?=\n##|\n\*\*[^*]+\*\*\n|$)/)
        if (summaryMatch) {
          executiveSummary = summaryMatch[1].trim().split('\n\n')[0].trim()
        }
        if (!executiveSummary) {
          // 폴백: 첫 번째 실질적인 문단 추출
          const lines = fullContent.split('\n').filter(line => line.trim() && !line.startsWith('#') && !line.startsWith('**'))
          executiveSummary = lines[0]?.trim() || null
        }

        const supabaseUpdate = await createClient()
        await supabaseUpdate
          .from('bi_business_reviews')
          .update({
            report_content: fullContent,
            executive_summary: executiveSummary,
          })
          .eq('id', reviewId)
      } catch {
        // 저장 실패 시 무시
      }
    }

    return createSSEResponse(generateWithSave())
  } catch (error) {
    return handleApiError(error)
  }
}
