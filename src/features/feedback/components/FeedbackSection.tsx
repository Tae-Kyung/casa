'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { MessageSquare, Send, Trash2, Edit2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface Feedback {
  id: string
  stage: string
  gate: string | null
  comment: string
  feedback_type: string
  created_at: string
  user_id: string
  author: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface FeedbackSectionProps {
  projectId: string
  currentGate: string
  currentUserId?: string
  userRole?: string
}

export function FeedbackSection({
  projectId,
  currentGate,
  currentUserId,
  userRole,
}: FeedbackSectionProps) {
  const t = useTranslations()
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [newType, setNewType] = useState<string>('comment')
  const [newStage, setNewStage] = useState<string>('idea')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isMentorOrAdmin = userRole === 'mentor' || userRole === 'admin'

  const fetchFeedbacks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks`)
      const result = await response.json()

      if (result.success) {
        setFeedbacks(result.data)
      }
    } catch (error) {
      console.error('Failed to fetch feedbacks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchFeedbacks()
  }, [projectId])

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: newStage,
          comment: newComment,
          feedback_type: newType,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('피드백이 등록되었습니다.')
        setNewComment('')
        setShowForm(false)
        fetchFeedbacks()
      } else {
        toast.error(result.error || '피드백 등록에 실패했습니다.')
      }
    } catch (error) {
      toast.error('피드백 등록에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (feedbackId: string) => {
    try {
      const response = await fetch(`/api/projects/${projectId}/feedbacks/${feedbackId}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success('피드백이 삭제되었습니다.')
        fetchFeedbacks()
      } else {
        toast.error(result.error || '피드백 삭제에 실패했습니다.')
      }
    } catch (error) {
      toast.error('피드백 삭제에 실패했습니다.')
    }
  }

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { color: string; label: string }> = {
      comment: { color: 'bg-blue-500', label: '코멘트' },
      revision_request: { color: 'bg-orange-500', label: '수정요청' },
      approval: { color: 'bg-green-500', label: '승인' },
      rejection: { color: 'bg-red-500', label: '반려' },
    }
    return configs[type] || configs.comment
  }

  const getStageLabel = (stage: string) => {
    const labels: Record<string, string> = {
      idea: '아이디어',
      evaluation: '평가',
      document: '문서',
      deploy: '배포',
      done: '완료',
    }
    return labels[stage] || stage
  }

  // 스테이지별로 피드백 그룹핑
  const groupedFeedbacks = feedbacks.reduce((acc, feedback) => {
    if (!acc[feedback.stage]) {
      acc[feedback.stage] = []
    }
    acc[feedback.stage].push(feedback)
    return acc
  }, {} as Record<string, Feedback[]>)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            멘토 피드백
          </CardTitle>
          {isMentorOrAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '취소' : '피드백 작성'}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* 피드백 작성 폼 (멘토/관리자용) */}
        {showForm && isMentorOrAdmin && (
          <div className="mb-6 space-y-4 rounded-lg border p-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">단계</label>
                <Select value={newStage} onValueChange={setNewStage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="idea">아이디어</SelectItem>
                    <SelectItem value="evaluation">평가</SelectItem>
                    <SelectItem value="document">문서</SelectItem>
                    <SelectItem value="deploy">배포</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium">유형</label>
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comment">코멘트</SelectItem>
                    <SelectItem value="suggestion">제안</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">내용</label>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="피드백 내용을 입력하세요..."
                rows={4}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  등록 중...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  피드백 등록
                </>
              )}
            </Button>
          </div>
        )}

        {/* 피드백 목록 */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        ) : feedbacks.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            아직 피드백이 없습니다.
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedFeedbacks)
              .sort(([a], [b]) => {
                const order = ['idea', 'evaluation', 'document', 'deploy', 'done']
                return order.indexOf(a) - order.indexOf(b)
              })
              .map(([stage, stageFeedbacks]) => (
                <div key={stage}>
                  <h4 className="mb-3 font-medium text-muted-foreground">
                    {getStageLabel(stage)}
                  </h4>
                  <div className="space-y-3">
                    {stageFeedbacks.map((feedback) => {
                      const typeConfig = getTypeConfig(feedback.feedback_type)
                      const isAuthor = feedback.author?.id === currentUserId

                      return (
                        <div
                          key={feedback.id}
                          className="rounded-lg border p-4"
                        >
                          <div className="mb-2 flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {feedback.author?.name || feedback.author?.email || '알 수 없음'}
                              </span>
                              <Badge variant="secondary" className="text-xs">
                                {feedback.author?.role === 'admin' ? '관리자' : '멘토'}
                              </Badge>
                              <Badge className={`${typeConfig.color} text-white text-xs`}>
                                {typeConfig.label}
                              </Badge>
                            </div>
                            {isAuthor && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleDelete(feedback.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <p className="whitespace-pre-wrap text-sm">
                            {feedback.comment}
                          </p>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {new Date(feedback.created_at).toLocaleString()}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
