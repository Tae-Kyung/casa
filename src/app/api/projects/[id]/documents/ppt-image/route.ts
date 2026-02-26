import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { callGemini, generateImage } from '@/lib/ai/gemini'
import { getPromptCreditCost } from '@/lib/prompts'
import { buildPptImageHtml } from '@/lib/templates/ppt-image-template'

// Phase 1 (text) + Phase 2 (8 images) 병렬 생성이므로 타임아웃 확장
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ id: string }>
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'
const TEXT_MODEL = 'gemini-2.5-flash'

// Phase 1: 스토리 생성 시스템 프롬프트
const STORY_SYSTEM_PROMPT = `You are a professional presentation storytelling expert. Given information about a startup, generate a cohesive 8-slide presentation story in JSON format.

IMPORTANT RULES:
- All slide titles, subtitles, and points MUST be in Korean (한국어).
- All visualDescription fields MUST be in English (for image generation AI).
- visualDescription should describe ONLY visual scenes, objects, and abstract imagery. DO NOT include any text, letters, numbers, or written words in the visual description.
- Each slide should flow naturally as a coherent narrative.
- Keep text concise: titles under 20 characters, points under 40 characters each.

Return ONLY valid JSON with this exact structure:
{
  "theme": {
    "primaryColor": "#hex color matching the brand mood",
    "secondaryColor": "#hex complementary color",
    "style": "one word mood: modern, elegant, bold, warm, tech, creative"
  },
  "slides": [
    {
      "type": "cover",
      "title": "서비스명",
      "subtitle": "핵심 가치를 표현하는 한 줄 태그라인",
      "visualDescription": "Cinematic wide shot of [abstract visual metaphor for the service]. No text, no letters, no numbers. Dramatic lighting, depth of field."
    },
    {
      "type": "problem",
      "title": "문제 정의",
      "subtitle": "현재 시장이 겪고 있는 핵심 문제",
      "points": ["핵심 문제점 1", "핵심 문제점 2", "핵심 문제점 3"],
      "visualDescription": "Dark dramatic scene symbolizing [the problem]. Abstract, moody. No text, no words."
    },
    {
      "type": "solution",
      "title": "솔루션",
      "subtitle": "우리의 해결 방식을 한 문장으로",
      "points": ["핵심 기능 1", "핵심 기능 2", "핵심 기능 3"],
      "visualDescription": "Bright hopeful scene showing [solution metaphor]. Clean, optimistic. No text."
    },
    {
      "type": "features",
      "title": "주요 기능",
      "points": ["기능 1: 설명", "기능 2: 설명", "기능 3: 설명", "기능 4: 설명"],
      "visualDescription": "Clean modern interface elements, floating UI cards, holographic display. Abstract tech. No text."
    },
    {
      "type": "market",
      "title": "시장 기회",
      "subtitle": "타겟 시장과 성장 가능성",
      "points": ["타겟 고객층", "시장 규모", "성장률"],
      "visualDescription": "Expansive aerial view of growing cityscape, network connections, global map visualization. No text."
    },
    {
      "type": "competitive",
      "title": "경쟁 우위",
      "points": ["차별점 1", "차별점 2", "차별점 3"],
      "visualDescription": "Single glowing object standing above others, spotlight effect, trophy, podium. Abstract victory. No text."
    },
    {
      "type": "roadmap",
      "title": "성장 로드맵",
      "points": ["Phase 1: 목표", "Phase 2: 목표", "Phase 3: 목표"],
      "visualDescription": "Ascending staircase leading to bright horizon, milestone markers, forward-moving arrows. No text."
    },
    {
      "type": "cta",
      "title": "함께 시작하세요",
      "subtitle": "다음 단계를 위한 제안 메시지",
      "visualDescription": "Inspiring wide landscape, sunrise over mountains, open road leading to bright future. Warm colors. No text."
    }
  ]
}`

// Phase 2: 이미지 생성 스타일 프리픽스
const IMAGE_STYLE_PREFIX = `Professional presentation background image, 16:9 aspect ratio, cinematic quality, high resolution. ABSOLUTELY NO TEXT, NO LETTERS, NO WORDS, NO NUMBERS in the image. Pure visual imagery only.`

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

    // ─── Phase 1: 텍스트 모델로 스토리 JSON 생성 ───
    const storyUserPrompt = `다음 스타트업 정보를 바탕으로 프레젠테이션 스토리를 생성해주세요.

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

위 정보를 바탕으로 8장 슬라이드의 프레젠테이션 스토리를 JSON으로 생성하세요.`

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

    // ─── Phase 2: 각 슬라이드의 visualDescription으로 이미지 병렬 생성 ───
    const imageResults = await Promise.allSettled(
      slides.map(async (slide: Record<string, unknown>, index: number) => {
        const visualDesc = typeof slide.visualDescription === 'string'
          ? slide.visualDescription
          : 'Abstract professional background with soft gradient lighting'

        const prompt = `${IMAGE_STYLE_PREFIX} Slide ${index + 1} of ${slides.length}. ${visualDesc}`

        const result = await generateImage('', prompt, {
          model: IMAGE_MODEL,
          temperature: 0.8,
        })
        return { index, ...result }
      })
    )

    // 성공한 이미지들 업로드
    const imageUrls: (string | null)[] = new Array(slides.length).fill(null)
    const timestamp = Date.now()

    for (const result of imageResults) {
      if (result.status === 'fulfilled') {
        const { index, imageData, mimeType } = result.value
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

        imageUrls[index] = publicUrl.publicUrl
      } else {
        console.error(`Failed to generate slide ${result.reason}`)
      }
    }

    const successCount = imageUrls.filter(Boolean).length
    if (successCount === 0) {
      return errorResponse('이미지 생성에 실패했습니다. 다시 시도해주세요.', 500)
    }

    // ─── Phase 3: HTML 슬라이드쇼 빌드 ───
    const htmlContent = buildPptImageHtml(storyData, imageUrls)
    const firstImageUrl = imageUrls.find(Boolean) || null

    let documentId: string

    if (existingDoc?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('bi_documents')
        .update({
          content: htmlContent,
          storage_path: firstImageUrl,
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
          title: `${project.name} 서비스 소개 PPT`,
          content: htmlContent,
          storage_path: firstImageUrl,
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
      slideCount: slides.length,
      imageCount: successCount,
      model: `${TEXT_MODEL} + ${IMAGE_MODEL}`,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
