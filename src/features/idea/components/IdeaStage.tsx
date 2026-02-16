'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Sparkles, Edit2, Check, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { useSSE } from '@/hooks/useSSE'
import { toast } from 'sonner'
import type { IdeaCard } from '@/types/database'

interface IdeaStageProps {
  projectId: string
  ideaCard: IdeaCard | null
  isConfirmed: boolean
  onUpdate: () => void
}

interface ExpandedIdea {
  problem?: string
  solution?: string
  target?: string
  differentiation?: string
  marketSize?: string
  revenueModel?: string
  challenges?: string[]
  raw?: string
}

export function IdeaStage({
  projectId,
  ideaCard,
  isConfirmed,
  onUpdate,
}: IdeaStageProps) {
  const t = useTranslations()
  const [rawInput, setRawInput] = useState(ideaCard?.raw_input || '')
  const [isEditing, setIsEditing] = useState(!ideaCard)
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [expandedIdea, setExpandedIdea] = useState<ExpandedIdea | null>(
    ideaCard?.ai_expanded as ExpandedIdea || null
  )

  const { data: streamData, isLoading: isExpanding, start: startExpand, stop: stopExpand } = useSSE({
    onDone: () => {
      onUpdate()
    },
    onError: (error) => {
      toast.error(t('ideaStage.aiExpandError', { error }))
    },
  })

  // 스트리밍 데이터 파싱
  useEffect(() => {
    if (streamData) {
      try {
        // markdown 코드 펜스 제거 (```json ... ``` 또는 ``` ... ```)
        let cleanData = streamData.trim()
        const fenceMatch = cleanData.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
        if (fenceMatch) {
          cleanData = fenceMatch[1].trim()
        }
        const parsed = JSON.parse(cleanData)
        setExpandedIdea(parsed)
      } catch {
        // JSON 파싱 실패 시 raw로 저장
        setExpandedIdea({ raw: streamData })
      }
    }
  }, [streamData])

  const handleSave = async () => {
    if (rawInput.length < 50) {
      toast.error(t('ideaStage.writeMore'))
      return
    }

    setIsSaving(true)
    try {
      const method = ideaCard ? 'PATCH' : 'POST'
      const response = await fetch(`/api/projects/${projectId}/idea`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_input: rawInput }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('ideaStage.saved'))
        setIsEditing(false)
        onUpdate()
      } else {
        toast.error(result.error || t('toast.saveFailed'))
      }
    } catch (error) {
      toast.error(t('toast.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleExpand = async () => {
    setExpandedIdea(null)
    startExpand(`/api/projects/${projectId}/idea/expand`)
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/idea/confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        onUpdate()
      } else {
        toast.error(result.error || t('toast.confirmFailed'))
      }
    } catch (error) {
      toast.error(t('toast.confirmFailed'))
    } finally {
      setIsConfirming(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 아이디어 입력/표시 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('idea.title')}</CardTitle>
          {ideaCard && !isConfirmed && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="mr-2 h-4 w-4" />
              {t('common.edit')}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditing || !ideaCard ? (
            <>
              <p className="text-sm text-muted-foreground">
                {t('idea.description')}
              </p>
              <Textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={t('idea.placeholder')}
                rows={8}
                disabled={isSaving || isConfirmed}
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {rawInput.length}자
                  {rawInput.length < 500 && (
                    <span className="text-orange-500"> ({t('idea.minLength')})</span>
                  )}
                </span>
                <div className="flex gap-2">
                  {ideaCard && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setRawInput(ideaCard.raw_input)
                        setIsEditing(false)
                      }}
                      disabled={isSaving}
                    >
                      {t('common.cancel')}
                    </Button>
                  )}
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        {t('common.loading')}
                      </>
                    ) : (
                      t('common.save')
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="whitespace-pre-wrap rounded bg-muted p-4">
              {ideaCard.raw_input}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI 확장 버튼 */}
      {ideaCard && !isEditing && !isConfirmed && (
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleExpand}
            disabled={isExpanding}
          >
            {isExpanding ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('idea.expanding')}
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-5 w-5" />
                {expandedIdea ? t('idea.regenerate') : t('idea.expand')}
              </>
            )}
          </Button>
        </div>
      )}

      {/* AI 확장 결과 */}
      {(expandedIdea || isExpanding) && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('idea.problem')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isExpanding && !expandedIdea?.problem ? (
                <LoadingSpinner />
              ) : (
                <p>{expandedIdea?.problem || '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('idea.solution')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isExpanding && !expandedIdea?.solution ? (
                <LoadingSpinner />
              ) : (
                <p>{expandedIdea?.solution || '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('idea.target')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isExpanding && !expandedIdea?.target ? (
                <LoadingSpinner />
              ) : (
                <p>{expandedIdea?.target || '-'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('idea.differentiation')}</CardTitle>
            </CardHeader>
            <CardContent>
              {isExpanding && !expandedIdea?.differentiation ? (
                <LoadingSpinner />
              ) : (
                <p>{expandedIdea?.differentiation || '-'}</p>
              )}
            </CardContent>
          </Card>

          {expandedIdea?.raw && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg">{t('ideaStage.aiResponseRaw')}</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap text-sm">
                  {expandedIdea.raw}
                </pre>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Gate 1 승인 버튼 */}
      {expandedIdea && !isConfirmed && !isExpanding && expandedIdea.problem && (
        <Card className="border-primary">
          <CardContent className="flex items-center justify-between py-6">
            <div>
              <h3 className="font-semibold">{t('gate.gate1')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('ideaStage.confirmQuestion')}
              </p>
            </div>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('idea.confirm')}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 확정 완료 메시지 */}
      {isConfirmed && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-green-500 p-2">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                {t('gate.gate1')} {t('gate.passed')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('ideaStage.confirmedMessage')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
