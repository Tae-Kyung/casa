import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamClaude, createSSEResponse } from '@/lib/ai/claude'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface PersonaResult {
  score: number
  feedback: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

// POST: AI 다면 평가 실행 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    await requireProjectOwner(id)

    const supabase = await createClient()

    // 아이디어 카드 조회
    const { data: ideaCard, error: ideaError } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (ideaError || !ideaCard) {
      return errorResponse('확정된 아이디어가 없습니다. Gate 1을 먼저 완료해주세요.', 400)
    }

    // 평가 레코드 확인 또는 생성
    let evaluationId: string
    const { data: existingEvaluation } = await supabase
      .from('bi_evaluations')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingEvaluation?.is_confirmed) {
      return errorResponse('이미 확정된 평가가 있습니다.', 400)
    }

    if (existingEvaluation) {
      evaluationId = existingEvaluation.id
    } else {
      const { data: newEvaluation, error: createError } = await supabase
        .from('bi_evaluations')
        .insert({ project_id: id })
        .select('id')
        .single()

      if (createError) throw createError
      evaluationId = newEvaluation.id
    }

    // 아이디어 정보 구성
    const ideaContext = JSON.stringify({
      raw_input: ideaCard.raw_input,
      problem: ideaCard.problem,
      solution: ideaCard.solution,
      target: ideaCard.target,
      differentiation: ideaCard.differentiation,
      ai_expanded: ideaCard.ai_expanded,
    }, null, 2)

    // 저장을 위한 변수
    const projectId = id
    const evalId = evaluationId

    // SSE 스트리밍 생성기
    async function* generateEvaluations() {
      const personas = [
        { key: 'evaluation_investor', name: 'investor', label: '투자심사역' },
        { key: 'evaluation_market', name: 'market', label: '시장분석가' },
        { key: 'evaluation_tech', name: 'tech', label: '기술전문가' },
      ]

      const results: Record<string, PersonaResult> = {}

      // 시작 이벤트
      yield { type: 'start', data: JSON.stringify({ total: 3 }) }

      for (let i = 0; i < personas.length; i++) {
        const persona = personas[i]!

        // 진행률 이벤트
        yield {
          type: 'progress',
          data: JSON.stringify({
            current: i + 1,
            total: 3,
            persona: persona.label,
            status: 'evaluating'
          })
        }

        try {
          // 프롬프트 준비
          const prompt = await preparePrompt(persona.key, { idea: ideaContext })

          if (!prompt) {
            yield {
              type: 'error',
              data: JSON.stringify({
                persona: persona.name,
                message: `${persona.label} 프롬프트를 찾을 수 없습니다.`
              })
            }
            continue
          }

          // AI 호출 및 스트리밍
          let fullContent = ''
          const stream = streamClaude(prompt.systemPrompt, prompt.userPrompt, {
            model: prompt.model,
            temperature: prompt.temperature,
            maxTokens: prompt.maxTokens,
          })

          for await (const event of stream) {
            if (event.type === 'text') {
              fullContent += event.data
              // 각 페르소나의 스트리밍 텍스트 전송
              yield {
                type: 'persona_text',
                data: JSON.stringify({
                  persona: persona.name,
                  text: event.data
                })
              }
            }
          }

          // 결과 파싱
          try {
            const parsed = JSON.parse(fullContent) as PersonaResult
            results[persona.name] = parsed

            // 페르소나 완료 이벤트
            yield {
              type: 'persona_complete',
              data: JSON.stringify({
                persona: persona.name,
                label: persona.label,
                result: parsed
              })
            }
          } catch {
            // JSON 파싱 실패 시 기본 구조 생성
            results[persona.name] = {
              score: 0,
              feedback: fullContent,
            }
            yield {
              type: 'persona_complete',
              data: JSON.stringify({
                persona: persona.name,
                label: persona.label,
                result: results[persona.name],
                parseError: true
              })
            }
          }
        } catch (error) {
          yield {
            type: 'error',
            data: JSON.stringify({
              persona: persona.name,
              message: error instanceof Error ? error.message : 'Unknown error'
            })
          }
        }
      }

      // 종합 점수 계산
      const investorScore = results.investor?.score || 0
      const marketScore = results.market?.score || 0
      const techScore = results.tech?.score || 0
      const totalScore = Math.round((investorScore + marketScore + techScore) / 3)

      // 종합 추천 생성
      const recommendations = [
        ...(results.investor?.recommendations || []),
        ...(results.market?.recommendations || []),
        ...(results.tech?.recommendations || []),
      ]

      // DB 저장
      const supabaseUpdate = await createClient()
      await supabaseUpdate
        .from('bi_evaluations')
        .update({
          investor_score: investorScore,
          investor_feedback: results.investor?.feedback || null,
          investor_ai_model: 'claude-sonnet-4-20250514',
          market_score: marketScore,
          market_feedback: results.market?.feedback || null,
          market_ai_model: 'claude-sonnet-4-20250514',
          tech_score: techScore,
          tech_feedback: results.tech?.feedback || null,
          tech_ai_model: 'claude-sonnet-4-20250514',
          total_score: totalScore,
          recommendations: recommendations.length > 0 ? recommendations : null,
        })
        .eq('id', evalId)

      // 프로젝트 상태 업데이트
      await supabaseUpdate
        .from('bi_projects')
        .update({
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        })
        .eq('id', projectId)

      // 완료 이벤트
      yield {
        type: 'complete',
        data: JSON.stringify({
          evaluationId: evalId,
          totalScore,
          investorScore,
          marketScore,
          techScore,
          recommendations,
        })
      }
    }

    return createSSEResponse(generateEvaluations())
  } catch (error) {
    return handleApiError(error)
  }
}
