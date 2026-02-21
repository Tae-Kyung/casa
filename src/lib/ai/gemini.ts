import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '')

export interface GeminiOptions {
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
  /** Thinking 토큰 예산 (0=비활성, -1=동적). Gemini 2.5만 해당. */
  thinkingBudget?: number
}

export interface GeminiResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
}

/** generationConfig에 thinkingConfig를 포함시키는 헬퍼 */
function buildGenerationConfig(options: {
  temperature: number
  maxOutputTokens: number
  jsonMode?: boolean
  thinkingBudget?: number
}) {
  const config: Record<string, unknown> = {
    temperature: options.temperature,
    maxOutputTokens: options.maxOutputTokens,
    ...(options.jsonMode && { responseMimeType: 'application/json' }),
  }
  // Gemini 2.5 thinking 예산 설정 (SDK 타입에 아직 없으므로 직접 추가)
  if (options.thinkingBudget !== undefined) {
    config.thinkingConfig = { thinkingBudget: options.thinkingBudget }
  }
  return config
}

/**
 * Gemini API 동기 호출
 */
export async function callGemini(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): Promise<GeminiResponse> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const geminiModel = genAI.getGenerativeModel({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: buildGenerationConfig({
      temperature,
      maxOutputTokens: maxTokens,
      jsonMode: options.jsonMode,
      thinkingBudget: options.thinkingBudget,
    }) as any,
  })

  // System prompt와 user prompt를 결합
  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`
  const result = await geminiModel.generateContent(combinedPrompt)
  const response = result.response
  // Gemini 2.5 thinking 모드에서 text()가 에러를 던질 수 있으므로 parts에서 직접 추출
  let content = ''
  try {
    content = response.text()
  } catch {
    const parts = response.candidates?.[0]?.content?.parts
    if (parts) {
      content = parts
        .filter((p: { text?: string }) => typeof p.text === 'string')
        .map((p: { text?: string }) => p.text)
        .join('')
    }
  }

  // Gemini의 usage metadata
  const usageMetadata = response.usageMetadata

  return {
    content,
    usage: {
      inputTokens: usageMetadata?.promptTokenCount || 0,
      outputTokens: usageMetadata?.candidatesTokenCount || 0,
    },
    stopReason: response.candidates?.[0]?.finishReason || null,
  }
}

/**
 * Gemini API 스트리밍 호출
 * SSE 이벤트를 생성하는 AsyncGenerator 반환
 */
export async function* streamGemini(
  systemPrompt: string,
  userPrompt: string,
  options: GeminiOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const {
    model = 'gemini-2.5-flash',
    temperature = 0.7,
    maxTokens = 2000,
  } = options

  const geminiModel = genAI.getGenerativeModel({
    model,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: buildGenerationConfig({
      temperature,
      maxOutputTokens: maxTokens,
      jsonMode: options.jsonMode,
      thinkingBudget: options.thinkingBudget,
    }) as any,
  })

  const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`
  const result = await geminiModel.generateContentStream(combinedPrompt)

  for await (const chunk of result.stream) {
    try {
      const text = chunk.text()
      if (text) {
        yield { type: 'text', data: text }
      }
    } catch {
      // Gemini 2.5 thinking 청크는 text()가 에러를 던지므로 무시
    }
  }

  yield { type: 'done', data: '' }
}
