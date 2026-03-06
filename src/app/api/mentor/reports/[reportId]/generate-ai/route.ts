import { NextRequest } from 'next/server'
import { requireMentor } from '@/lib/auth/guards'
import { createClient } from '@/lib/supabase/server'
import { errorResponse, handleApiError } from '@/lib/utils/api-response'

interface RouteContext {
  params: Promise<{ reportId: string }>
}

// POST: AI 보고서 생성 (SSE 스트리밍)
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { reportId } = await context.params
    const user = await requireMentor()

    const supabase = await createClient()

    // 보고서 조회
    const { data: report, error: reportError } = await supabase
      .from('bi_mentoring_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return errorResponse('보고서를 찾을 수 없습니다.', 404)
    }

    // 소유권 확인: report -> match -> mentor_id
    const { data: match, error: matchError } = await supabase
      .from('bi_mentor_matches')
      .select('mentor_id, project_id')
      .eq('id', report.match_id)
      .single()

    if (matchError || !match) {
      return errorResponse('매칭 정보를 찾을 수 없습니다.', 404)
    }

    if (match.mentor_id !== user.id && user.role !== 'admin') {
      return errorResponse('보고서에 대한 접근 권한이 없습니다.', 403)
    }

    // 프로젝트 정보 조회
    const { data: project } = await supabase
      .from('bi_projects')
      .select('name')
      .eq('id', match.project_id)
      .single()

    // 멘토링 세션 조회
    const { data: sessions } = await supabase
      .from('bi_mentoring_sessions')
      .select('*')
      .eq('match_id', report.match_id)
      .order('session_date', { ascending: true })

    const sessionList = sessions || []

    // SSE 스트리밍 응답 생성
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // 템플릿 기반 AI 보고서 생성 (MVP)
          const projectName = project?.name || '프로젝트'
          const sessionCount = sessionList.length
          const sessionSummaries = sessionList.map((s, i) => {
            const date = s.session_date || '날짜 미정'
            const comment = s.revision_summary || (typeof s.comments === 'string' ? s.comments : JSON.stringify(s.comments)) || '코멘트 없음'
            return `  ${i + 1}. [${date}] ${comment}`
          }).join('\n')

          const mentorOpinion = report.mentor_opinion || '작성되지 않음'
          const strengths = report.strengths || '작성되지 않음'
          const improvements = report.improvements || '작성되지 않음'
          const rating = report.overall_rating ? `${report.overall_rating}/5` : '미평가'

          const reportChunks = [
            `# 멘토링 종합 보고서\n\n`,
            `## 프로젝트: ${projectName}\n\n`,
            `---\n\n`,
            `## 1. 멘토링 개요\n\n`,
            `- 총 멘토링 횟수: ${sessionCount}회\n`,
            sessionCount > 0
              ? `- 멘토링 기간: ${sessionList[0]?.session_date || '-'} ~ ${sessionList[sessionCount - 1]?.session_date || '-'}\n`
              : `- 멘토링 기간: 아직 진행된 세션이 없습니다.\n`,
            `- 종합 평점: ${rating}\n\n`,
            `## 2. 세션별 활동 내역\n\n`,
            sessionCount > 0
              ? `${sessionSummaries}\n\n`
              : `  아직 진행된 멘토링 세션이 없습니다.\n\n`,
            `## 3. 멘토 종합 의견\n\n`,
            `${mentorOpinion}\n\n`,
            `## 4. 강점 분석\n\n`,
            `${strengths}\n\n`,
            `## 5. 개선 필요 사항\n\n`,
            `${improvements}\n\n`,
            `## 6. 종합 평가 및 권고사항\n\n`,
            `본 프로젝트는 총 ${sessionCount}회의 멘토링을 통해 `,
            `체계적인 피드백과 방향 제시가 이루어졌습니다. `,
            strengths !== '작성되지 않음'
              ? `특히 강점으로 평가된 부분을 기반으로 지속적인 성장이 기대됩니다. `
              : '',
            improvements !== '작성되지 않음'
              ? `개선이 필요한 영역에 대해서는 후속 멘토링을 통해 보완해 나갈 것을 권고합니다.\n\n`
              : '\n\n',
            `---\n\n`,
            `*본 보고서는 멘토링 활동 기록을 기반으로 자동 생성되었습니다.*\n`,
          ]

          let fullContent = ''

          for (const chunk of reportChunks) {
            fullContent += chunk
            const sseData = JSON.stringify({ chunk })
            controller.enqueue(encoder.encode(`event: data\ndata: ${sseData}\n\n`))
            // 스트리밍 효과를 위한 지연
            await new Promise((resolve) => setTimeout(resolve, 50))
          }

          // 완료 이벤트
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`))

          // DB에 AI 생성 보고서 저장
          try {
            const supabaseUpdate = await createClient()
            await supabaseUpdate
              .from('bi_mentoring_reports')
              .update({
                ai_generated_report: fullContent,
                ai_summary: fullContent.substring(0, 500),
                updated_at: new Date().toISOString(),
              })
              .eq('id', reportId)
          } catch (saveError) {
            console.error('AI report save error:', saveError)
          }

          controller.close()
        } catch (error) {
          console.error('SSE stream error:', error)
          const errorData = JSON.stringify({ error: '보고서 생성 중 오류가 발생했습니다.' })
          controller.enqueue(encoder.encode(`event: error\ndata: ${errorData}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
