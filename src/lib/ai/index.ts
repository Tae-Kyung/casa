/**
 * 통합 AI 클라이언트
 * Claude, OpenAI, Gemini를 통합하여 사용
 */

import { callClaude, streamClaude, createSSEResponse } from './claude'
import { callOpenAI, streamOpenAI } from './openai'
import { callGemini, streamGemini } from './gemini'

export type AIProvider = 'claude' | 'openai' | 'gemini'

export interface AIOptions {
  provider?: AIProvider
  model?: string
  temperature?: number
  maxTokens?: number
  jsonMode?: boolean
}

export interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  stopReason: string | null
  provider: AIProvider
}

// 기본 모델 설정
const DEFAULT_MODELS: Record<AIProvider, string> = {
  claude: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  gemini: 'gemini-2.5-flash',
}

// 환경변수에서 기본 프로바이더 결정
function getDefaultProvider(): AIProvider {
  if (process.env.ANTHROPIC_API_KEY) return 'claude'
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.GOOGLE_AI_API_KEY) return 'gemini'
  return 'claude' // 기본값
}

// API 키 존재 여부 확인
function isProviderAvailable(provider: AIProvider): boolean {
  switch (provider) {
    case 'claude':
      return !!process.env.ANTHROPIC_API_KEY
    case 'openai':
      return !!process.env.OPENAI_API_KEY
    case 'gemini':
      return !!process.env.GOOGLE_AI_API_KEY
    default:
      return false
  }
}

/**
 * 통합 AI 호출 (동기)
 */
export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): Promise<AIResponse> {
  const provider = options.provider || getDefaultProvider()
  const model = options.model || DEFAULT_MODELS[provider]

  if (!isProviderAvailable(provider)) {
    throw new Error(`${provider} API key is not configured`)
  }

  const providerOptions = {
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
  }

  let response

  switch (provider) {
    case 'claude':
      response = await callClaude(systemPrompt, userPrompt, providerOptions)
      break
    case 'openai':
      response = await callOpenAI(systemPrompt, userPrompt, providerOptions)
      break
    case 'gemini':
      response = await callGemini(systemPrompt, userPrompt, providerOptions)
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  return {
    ...response,
    provider,
  }
}

/**
 * 통합 AI 스트리밍 호출
 */
export async function* streamAI(
  systemPrompt: string,
  userPrompt: string,
  options: AIOptions = {}
): AsyncGenerator<{ type: string; data: string }, void, unknown> {
  const provider = options.provider || getDefaultProvider()
  const model = options.model || DEFAULT_MODELS[provider]

  if (!isProviderAvailable(provider)) {
    throw new Error(`${provider} API key is not configured`)
  }

  const providerOptions = {
    model,
    temperature: options.temperature,
    maxTokens: options.maxTokens,
    jsonMode: options.jsonMode,
  }

  let generator

  switch (provider) {
    case 'claude':
      generator = streamClaude(systemPrompt, userPrompt, providerOptions)
      break
    case 'openai':
      generator = streamOpenAI(systemPrompt, userPrompt, providerOptions)
      break
    case 'gemini':
      generator = streamGemini(systemPrompt, userPrompt, providerOptions)
      break
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }

  yield* generator
}

/**
 * 사용 가능한 프로바이더 목록 반환
 */
export function getAvailableProviders(): AIProvider[] {
  const providers: AIProvider[] = []
  if (isProviderAvailable('claude')) providers.push('claude')
  if (isProviderAvailable('openai')) providers.push('openai')
  if (isProviderAvailable('gemini')) providers.push('gemini')
  return providers
}

// 기존 함수들도 re-export
export { callClaude, streamClaude, createSSEResponse } from './claude'
export { callOpenAI, streamOpenAI } from './openai'
export { callGemini, streamGemini } from './gemini'
