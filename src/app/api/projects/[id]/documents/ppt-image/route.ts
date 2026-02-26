import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { callGemini, generateImage } from '@/lib/ai/gemini'
import { getPromptCreditCost } from '@/lib/prompts'

// Phase 1 (story) + Phase 2 (8 images) 병렬 생성이므로 타임아웃 확장
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ id: string }>
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'
const TEXT_MODEL = 'gemini-2.5-flash'

// Phase 1: 발표 시나리오 기획 시스템 프롬프트
const STORY_SYSTEM_PROMPT = `You are a top-tier startup pitch deck designer. Given startup information, create a cohesive 8-slide presentation scenario.

IMPORTANT RULES:
- All text content (title, subtitle, points) MUST be in Korean (한국어).
- All imagePrompt fields MUST be in English — these will be sent to an image generation AI.
- imagePrompt should describe a COMPLETE presentation slide design including layout, visual elements, colors, and typography placement. The image AI will generate the full slide image.
- Keep a consistent visual theme across all 8 slides (same color palette, typography style, layout approach).
- Keep text concise: titles max 15 characters, subtitle max 30 characters, each point max 35 characters.

Return ONLY valid JSON with this structure:
{
  "theme": "one word: modern | elegant | bold | tech | creative | minimal",
  "colorScheme": "describe the color palette in English (e.g. 'dark navy to purple gradient with cyan accents')",
  "slides": [
    {
      "slideNumber": 1,
      "type": "cover",
      "title": "서비스명",
      "subtitle": "핵심 태그라인",
      "imagePrompt": "Professional 16:9 pitch deck title slide. [detailed visual description]. Large bold title text area at center. Subtle tagline below. [color/style details]."
    },
    {
      "slideNumber": 2,
      "type": "problem",
      "title": "문제 정의",
      "subtitle": "부제",
      "points": ["문제점 1", "문제점 2", "문제점 3"],
      "imagePrompt": "Professional 16:9 pitch deck slide about problems. [detailed visual description]. Title area at top, 3 bullet point areas with icons. [color/style details]."
    }
  ]
}`

// Phase 2: 슬라이드 이미지 생성용 스타일 프리픽스
const SLIDE_STYLE_PREFIX = `High-quality professional startup pitch deck slide, 16:9 aspect ratio, polished corporate presentation design. This is slide IMAGE — render it as a complete, finished presentation slide with visual elements, icons, and decorative typography areas.`

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

    // 크레딧 차감
    await deductCredits(user.id, await getPromptCreditCost('doc_ppt_image'), 'ai_doc_ppt_image', id)

    const supabase = await createClient()

    const { data: project, error: projectError } = await supabase
      .from('bi_projects')
      .select('*')
      .eq('id', id)
      .single()

    if (projectError || !project) {
      return errorResponse('프로젝트를 찾을 수 없습니다.', 404)
    }

    if (!project.gate_2_passed_at) {
      return errorResponse('평가 단계(Gate 2)를 먼저 완료해주세요.', 400)
    }

    const { data: ideaCard } = await supabase
      .from('bi_idea_cards')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const { data: evaluation } = await supabase
      .from('bi_evaluations')
      .select('*')
      .eq('project_id', id)
      .eq('is_confirmed', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!ideaCard || !evaluation) {
      return errorResponse('확정된 아이디어와 평가가 필요합니다.', 400)
    }

    const { data: existingDoc } = await supabase
      .from('bi_documents')
      .select('id, is_confirmed')
      .eq('project_id', id)
      .eq('type', 'ppt_image')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (existingDoc?.is_confirmed) {
      return errorResponse('이미 확정된 이미지 PPT가 있습니다.', 400)
    }

    // ─── Phase 1: 텍스트 모델로 발표 시나리오 기획 ───
    const storyUserPrompt = `다음 스타트업 정보를 바탕으로 8장 슬라이드 발표 시나리오를 기획해주세요.

## 서비스명
${project.name}

## 문제
${ideaCard.problem || ideaCard.raw_input || ''}

## 솔루션
${ideaCard.solution || ''}

## 타겟 고객
${ideaCard.target || ''}

## 차별점
${ideaCard.differentiation || ''}

## AI 평가 점수
- 종합: ${evaluation.total_score ?? 0}/100
- 투자 관점: ${evaluation.investor_score ?? 0}
- 시장 관점: ${evaluation.market_score ?? 0}
- 기술 관점: ${evaluation.tech_score ?? 0}

슬라이드 구성:
1. 표지 (서비스명 + 태그라인)
2. 문제 정의 (고객이 겪는 핵심 문제)
3. 솔루션 (우리의 해결 방식)
4. 주요 기능 (핵심 기능 4가지)
5. 시장 기회 (타겟 시장과 규모)
6. 경쟁 우위 (차별화 포인트)
7. 성장 로드맵 (단계별 계획)
8. 마무리 (CTA + Thank You)

각 슬라이드의 imagePrompt는 일관된 디자인 테마를 유지하면서, 해당 슬라이드의 내용을 시각적으로 표현하는 완성된 프레젠테이션 슬라이드 이미지를 설명해주세요.`

    const storyResponse = await callGemini(STORY_SYSTEM_PROMPT, storyUserPrompt, {
      model: TEXT_MODEL,
      temperature: 0.7,
      maxTokens: 4000,
      jsonMode: true,
    })

    let storyData: Record<string, unknown>
    try {
      let cleanContent = storyResponse.content.trim()
      const fenceMatch = cleanContent.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
      if (fenceMatch) {
        cleanContent = fenceMatch[1].trim()
      }
      storyData = JSON.parse(cleanContent)
    } catch {
      return errorResponse('스토리 생성에 실패했습니다. 다시 시도해주세요.', 500)
    }

    const slides = Array.isArray(storyData.slides) ? storyData.slides : []
    if (slides.length === 0) {
      return errorResponse('슬라이드 스토리를 생성하지 못했습니다. 다시 시도해주세요.', 500)
    }

    const colorScheme = typeof storyData.colorScheme === 'string'
      ? storyData.colorScheme
      : 'dark navy to purple gradient with cyan and white accents'
    const theme = typeof storyData.theme === 'string'
      ? storyData.theme
      : 'modern'

    // ─── Phase 2: 스토리 기반 나노 바나나 이미지 병렬 생성 ───
    const imageResults = await Promise.allSettled(
      slides.map(async (slide: Record<string, unknown>, index: number) => {
        const imagePrompt = typeof slide.imagePrompt === 'string'
          ? slide.imagePrompt
          : `Professional presentation slide ${index + 1}, ${theme} style, ${colorScheme}`

        // 스토리의 imagePrompt + 일관된 스타일 프리픽스 결합
        const fullPrompt = `${SLIDE_STYLE_PREFIX} Style: ${theme}, Color scheme: ${colorScheme}. Slide ${index + 1} of ${slides.length}. ${imagePrompt}`

        const result = await generateImage('', fullPrompt, {
          model: IMAGE_MODEL,
          temperature: 0.8,
        })
        return { index, ...result }
      })
    )

    // 성공한 이미지들 업로드 (순서 유지)
    const imageUrls: string[] = []
    const orderedResults: { index: number; imageData: Buffer; mimeType: string }[] = []
    const timestamp = Date.now()

    for (const result of imageResults) {
      if (result.status === 'fulfilled') {
        orderedResults.push(result.value)
      } else {
        console.error(`Failed to generate slide:`, result.reason)
      }
    }

    // 인덱스 순서로 정렬
    orderedResults.sort((a, b) => a.index - b.index)

    for (const { index, imageData, mimeType } of orderedResults) {
      const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
      const fileName = `ppt-image-${id}-slide${index + 1}-${timestamp}.${ext}`
      const filePath = `ppt-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, imageData, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          return errorResponse(
            '스토리지 버킷(documents)이 설정되지 않았습니다. 관리자에게 문의하세요.',
            500
          )
        }
        console.error(`Failed to upload slide ${index + 1}:`, uploadError)
        continue
      }

      const { data: publicUrl } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      imageUrls.push(publicUrl.publicUrl)
    }

    if (imageUrls.length === 0) {
      return errorResponse('이미지 생성에 실패했습니다. 다시 시도해주세요.', 500)
    }

    // ─── Phase 3: 멀티 이미지로 DB 저장 ───
    const contentJson = JSON.stringify(imageUrls)
    let documentId: string

    if (existingDoc?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('bi_documents')
        .update({
          content: contentJson,
          storage_path: imageUrls[0],
          file_name: `ppt-image-${id}-${timestamp}`,
          ai_model_used: `${TEXT_MODEL} + ${IMAGE_MODEL}`,
        })
        .eq('id', existingDoc.id)
        .select('id')
        .single()

      if (updateError) throw updateError
      documentId = updated.id
    } else {
      const { data: created, error: createError } = await supabase
        .from('bi_documents')
        .insert({
          project_id: id,
          type: 'ppt_image',
          title: `${project.name} 서비스 소개 PPT (이미지)`,
          content: contentJson,
          storage_path: imageUrls[0],
          file_name: `ppt-image-${id}-${timestamp}`,
          ai_model_used: `${TEXT_MODEL} + ${IMAGE_MODEL}`,
        })
        .select('id')
        .single()

      if (createError) throw createError
      documentId = created.id
    }

    return successResponse({
      documentId,
      type: 'ppt_image',
      imageUrls,
      slideCount: imageUrls.length,
      totalSlides: slides.length,
      model: `${TEXT_MODEL} + ${IMAGE_MODEL}`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
