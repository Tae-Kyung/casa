import { NextRequest } from 'next/server'
import { requireProjectOwner } from '@/lib/auth/guards'
import { deductCredits } from '@/lib/credits'
import { createClient } from '@/lib/supabase/server'
import { successResponse, errorResponse, handleApiError } from '@/lib/utils/api-response'
import { generateImage } from '@/lib/ai/gemini'

// 이미지 8장 병렬 생성이므로 타임아웃 확장
export const maxDuration = 300

interface RouteContext {
  params: Promise<{ id: string }>
}

const IMAGE_MODEL = 'gemini-2.5-flash-image'

interface SlideConfig {
  name: string
  buildPrompt: (ctx: SlideContext) => string
}

interface SlideContext {
  projectName: string
  problem: string
  solution: string
  target: string
  differentiation: string
  totalScore: number
  investorScore: number
  marketScore: number
  techScore: number
}

const STYLE_BASE = `Professional presentation slide design, 16:9 aspect ratio, modern corporate style with clean layout, gradient background (dark navy to purple), high contrast white text. Visually polished like a top-tier pitch deck. Minimal text - use icons, illustrations, and visual elements to convey information.`

const SLIDES: SlideConfig[] = [
  {
    name: 'cover',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} Title slide for a startup service called "${ctx.projectName}". Show the service name prominently in large bold white text at the center. Add a subtle tech-inspired geometric pattern or abstract illustration in the background. Include a short tagline area below the title. Professional, modern, and impactful first impression. The overall mood should be ambitious and innovative.`,
  },
  {
    name: 'problem',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Problem" slide for a startup pitch deck. Visualize this problem: "${ctx.problem}". Use dramatic visual metaphors - broken chains, warning icons, frustrated user silhouettes, or abstract representations of pain points. Use red/orange accent colors to convey urgency. Show 3-4 pain point icons arranged in a clean grid. The slide should make viewers immediately feel the problem's severity.`,
  },
  {
    name: 'solution',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Solution" slide for a startup pitch deck. Visualize this solution: "${ctx.solution}". Show a bright, optimistic design with green/teal accent colors. Use visual metaphors like a lightbulb, puzzle pieces fitting together, or a bridge connecting two sides. Include 3-4 feature icons in a clean layout showing key capabilities. The design should convey relief, innovation, and clarity.`,
  },
  {
    name: 'features',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Key Features" slide for a startup pitch deck about "${ctx.projectName}". Solution: "${ctx.solution}". Display 4 key feature cards in a 2x2 grid layout. Each card has a colorful icon and a short label area. Use distinct accent colors (blue, green, purple, orange) for each feature card. Clean, modern card design with subtle shadows. The layout should be balanced and easy to scan.`,
  },
  {
    name: 'market',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Target Market" slide for a startup pitch deck. Target customers: "${ctx.target}". Show a visual market analysis with: a large circle diagram (TAM/SAM/SOM style), user persona silhouettes, and growth arrow graphics. Use blue accent colors. Include abstract data visualization elements like bar charts or pie charts. The slide should convey a massive market opportunity.`,
  },
  {
    name: 'competitive',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Competitive Advantage" slide for a startup pitch deck. Differentiation: "${ctx.differentiation}". Show a comparison visual where the service stands out - use a podium, a spotlight on a central element, or a radar chart showing superiority. Use gold/amber accent colors for the winning element. Include shield or trophy icons to represent strengths. Clean and confident visual.`,
  },
  {
    name: 'scores',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "AI Evaluation Score" slide for a startup pitch deck. Show a professional scorecard dashboard. Display a large circular progress gauge showing overall score ${ctx.totalScore}/100 in the center. Around it, show 3 smaller gauges: Investor Score ${ctx.investorScore}, Market Score ${ctx.marketScore}, Tech Score ${ctx.techScore}. Use green for high scores (80+), yellow for medium (60-79), red for low. Modern data dashboard aesthetic.`,
  },
  {
    name: 'cta',
    buildPrompt: (ctx) =>
      `${STYLE_BASE} "Call to Action" closing slide for a startup pitch deck about "${ctx.projectName}". Create an impactful final slide with a large inspirational visual - a rocket launching, a handshake, or a path leading to a bright horizon. Include space for contact information and next steps. Use vibrant gradient accents (cyan to purple). The slide should leave viewers excited and motivated to engage. Add "Thank You" text area.`,
  },
]

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params
    const user = await requireProjectOwner(id)

    // 5 크레딧 차감
    await deductCredits(user.id, 5, 'ai_doc_ppt_image', id)

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

    const slideContext: SlideContext = {
      projectName: project.name || '',
      problem: ideaCard.problem || ideaCard.raw_input || '',
      solution: ideaCard.solution || '',
      target: ideaCard.target || '',
      differentiation: ideaCard.differentiation || '',
      totalScore: evaluation.total_score ?? 0,
      investorScore: evaluation.investor_score ?? 0,
      marketScore: evaluation.market_score ?? 0,
      techScore: evaluation.tech_score ?? 0,
    }

    // 8장 슬라이드 이미지 병렬 생성
    const results = await Promise.allSettled(
      SLIDES.map(async (slide) => {
        const prompt = slide.buildPrompt(slideContext)
        const result = await generateImage(
          '', // system prompt는 사용하지 않음 (이미지 모델은 미지원)
          prompt,
          { model: IMAGE_MODEL, temperature: 0.8 }
        )
        return { name: slide.name, ...result }
      })
    )

    // 성공한 이미지들만 업로드
    const imageUrls: string[] = []
    const timestamp = Date.now()

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      if (result.status === 'fulfilled') {
        const { name, imageData, mimeType } = result.value
        const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
        const fileName = `ppt-image-${id}-${name}-${timestamp}.${ext}`
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
          console.error(`Failed to upload slide ${name}:`, uploadError)
          continue
        }

        const { data: publicUrl } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        imageUrls.push(publicUrl.publicUrl)
      } else {
        console.error(`Failed to generate slide ${SLIDES[i].name}:`, result.reason)
      }
    }

    if (imageUrls.length === 0) {
      return errorResponse('이미지 생성에 실패했습니다. 다시 시도해주세요.', 500)
    }

    // content에 JSON 배열로 모든 이미지 URL 저장
    // storage_path에 첫 번째 이미지 (썸네일용)
    const contentJson = JSON.stringify(imageUrls)
    let documentId: string

    if (existingDoc?.id) {
      const { data: updated, error: updateError } = await supabase
        .from('bi_documents')
        .update({
          content: contentJson,
          storage_path: imageUrls[0],
          file_name: `ppt-image-${id}-${timestamp}`,
          ai_model_used: IMAGE_MODEL,
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
          ai_model_used: IMAGE_MODEL,
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
      totalSlides: SLIDES.length,
      model: IMAGE_MODEL,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
