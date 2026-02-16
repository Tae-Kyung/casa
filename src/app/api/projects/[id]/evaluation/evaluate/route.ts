import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'
import { preparePrompt } from '@/lib/prompts'
import { streamAI, getAvailableProviders, type AIProvider } from '@/lib/ai'

interface RouteContext {
  params: Promise<{ id: string }>
}

interface PersonaResult {
  score: number
  feedback: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
  provider?: string
  model?: string
}

// 페르소나별 기본 프로바이더 매핑
const PERSONA_PROVIDER_MAP: Record<string, AIProvider> = {
  investor: 'claude',
  market: 'openai',
  tech: 'gemini',
}

// 프로바이더별 모델명 약어
const PROVIDER_DISPLAY_NAMES: Record<AIProvider, string> = {
  claude: 'Claude',
  openai: 'GPT-4o',
  gemini: 'Gemini',
}

function resolveProvider(personaName: string): { provider: AIProvider; displayName: string; isFallback: boolean } {
  const preferred = PERSONA_PROVIDER_MAP[personaName]
  const available = getAvailableProviders()

  if (preferred && available.includes(preferred)) {
    return { provider: preferred, displayName: PROVIDER_DISPLAY_NAMES[preferred], isFallback: false }
  }

  const fallback = available[0]
  if (!fallback) {
    throw new Error('No AI provider available. Please configure at least one API key.')
  }

  return { provider: fallback, displayName: PROVIDER_DISPLAY_NAMES[fallback], isFallback: true }
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

    // SSE 이벤트 전송 헬퍼
    const encoder = new TextEncoder()

    function sseEvent(type: string, data: Record<string, unknown>): Uint8Array {
      return encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`)
    }

    // SSE 스트리밍
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const personas = [
            { key: 'evaluation_investor', name: 'investor', label: '투자심사역' },
            { key: 'evaluation_market', name: 'market', label: '시장분석가' },
            { key: 'evaluation_tech', name: 'tech', label: '기술전문가' },
          ]

          const results: Record<string, PersonaResult> = {}
          const modelNames: Record<string, string> = {}
          const providerNames: Record<string, string> = {}

          controller.enqueue(sseEvent('start', { total: 3 }))

          for (let i = 0; i < personas.length; i++) {
            const persona = personas[i]!

            // 프로바이더 결정
            const { provider, displayName, isFallback } = resolveProvider(persona.name)

            controller.enqueue(sseEvent('progress', {
              current: i + 1,
              total: 3,
              persona: persona.label,
              status: 'evaluating',
              provider,
              model: displayName,
              isFallback,
            }))

            try {
              const prompt = await preparePrompt(persona.key, { idea: ideaContext })

              if (!prompt) {
                controller.enqueue(sseEvent('error', {
                  persona: persona.name,
                  message: `${persona.label} 프롬프트를 찾을 수 없습니다.`,
                }))
                continue
              }

              // 실제 사용되는 모델명 기록 (claude만 prompt.model 사용, 나머지는 기본 모델)
              const DEFAULT_MODELS: Record<string, string> = {
                claude: 'claude-sonnet-4-20250514',
                openai: 'gpt-4o',
                gemini: 'gemini-1.5-pro',
              }
              modelNames[persona.name] = provider === 'claude' ? prompt.model : DEFAULT_MODELS[provider] || prompt.model
              providerNames[persona.name] = provider

              let fullContent = ''
              // prompt.model은 DB에 저장된 Claude 모델명이므로, claude provider일 때만 사용
              // 다른 provider는 DEFAULT_MODELS에서 자동 선택
              const aiStream = streamAI(prompt.systemPrompt, prompt.userPrompt, {
                provider,
                model: provider === 'claude' ? prompt.model : undefined,
                temperature: prompt.temperature,
                maxTokens: prompt.maxTokens,
              })

              for await (const event of aiStream) {
                if (event.type === 'text') {
                  fullContent += event.data
                  controller.enqueue(sseEvent('persona_text', {
                    persona: persona.name,
                    text: event.data,
                  }))
                }
              }

              // markdown 코드 펜스 제거
              let cleanContent = fullContent.trim()
              const fenceMatch = cleanContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
              if (fenceMatch) {
                cleanContent = fenceMatch[1].trim()
              }

              try {
                const parsed = JSON.parse(cleanContent) as PersonaResult
                parsed.provider = provider
                parsed.model = displayName
                results[persona.name] = parsed

                controller.enqueue(sseEvent('persona_complete', {
                  persona: persona.name,
                  label: persona.label,
                  result: parsed,
                  provider,
                  model: displayName,
                }))
              } catch {
                results[persona.name] = { score: 0, feedback: fullContent, provider, model: displayName }
                controller.enqueue(sseEvent('persona_complete', {
                  persona: persona.name,
                  label: persona.label,
                  result: results[persona.name],
                  provider,
                  model: displayName,
                  parseError: true,
                }))
              }
            } catch (error) {
              controller.enqueue(sseEvent('error', {
                persona: persona.name,
                message: error instanceof Error ? error.message : 'Unknown error',
              }))
            }
          }

          // 종합 점수 계산
          const investorScore = results.investor?.score || 0
          const marketScore = results.market?.score || 0
          const techScore = results.tech?.score || 0
          const totalScore = Math.round((investorScore + marketScore + techScore) / 3)

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
              investor_ai_model: modelNames.investor || `${providerNames.investor || 'claude'}:claude-sonnet-4-20250514`,
              market_score: marketScore,
              market_feedback: results.market?.feedback || null,
              market_ai_model: modelNames.market || `${providerNames.market || 'claude'}:claude-sonnet-4-20250514`,
              tech_score: techScore,
              tech_feedback: results.tech?.feedback || null,
              tech_ai_model: modelNames.tech || `${providerNames.tech || 'claude'}:claude-sonnet-4-20250514`,
              total_score: totalScore,
              recommendations: recommendations.length > 0 ? recommendations : null,
            })
            .eq('id', evalId)

          await supabaseUpdate
            .from('bi_projects')
            .update({
              status: 'in_progress',
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId)

          controller.enqueue(sseEvent('complete', {
            evaluationId: evalId,
            totalScore,
            investorScore,
            marketScore,
            techScore,
            recommendations,
          }))
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(sseEvent('error', { message: msg }))
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
