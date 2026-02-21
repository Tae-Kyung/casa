import { GoogleGenAI } from '@google/genai'

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_AI_API_KEY || '' })

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

  const response = await ai.models.generateContent({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      ...(options.jsonMode && { responseMimeType: 'application/json' }),
      ...(options.thinkingBudget !== undefined && {
        thinkingConfig: { thinkingBudget: options.thinkingBudget },
      }),
    },
  })

  const content = response.text ?? ''
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

  const stream = await ai.models.generateContentStream({
    model,
    contents: userPrompt,
    config: {
      systemInstruction: systemPrompt,
      temperature,
      maxOutputTokens: maxTokens,
      ...(options.jsonMode && { responseMimeType: 'application/json' }),
      ...(options.thinkingBudget !== undefined && {
        thinkingConfig: { thinkingBudget: options.thinkingBudget },
      }),
    },
  })

  for await (const chunk of stream) {
    // 새 SDK의 .text는 thinking 파트를 자동 제외
    const text = chunk.text
    if (text) {
      yield { type: 'text', data: text }
    }
  }

  yield { type: 'done', data: '' }
}
