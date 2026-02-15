'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  TrendingUp,
  Users,
  Cpu,
  Check,
  RefreshCw,
  AlertTriangle,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import type { Evaluation } from '@/types/database'

interface EvaluationStageProps {
  projectId: string
  evaluation: Evaluation | null
  isConfirmed: boolean
  canEvaluate: boolean  // Gate 1이 통과되었는지
  onUpdate: () => void
}

interface PersonaResult {
  score: number
  feedback: string
  strengths?: string[]
  weaknesses?: string[]
  recommendations?: string[]
}

interface EvaluationProgress {
  current: number
  total: number
  persona: string
  status: string
}

type PersonaName = 'investor' | 'market' | 'tech'

export function EvaluationStage({
  projectId,
  evaluation,
  isConfirmed,
  canEvaluate,
  onUpdate,
}: EvaluationStageProps) {
  const t = useTranslations()
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [progress, setProgress] = useState<EvaluationProgress | null>(null)
  const [personaResults, setPersonaResults] = useState<Partial<Record<PersonaName, PersonaResult>>>({})
  const [streamingText, setStreamingText] = useState<Partial<Record<PersonaName, string>>>({})
  const [showDisputeDialog, setShowDisputeDialog] = useState(false)
  const [disputeComment, setDisputeComment] = useState('')
  const [isSubmittingDispute, setIsSubmittingDispute] = useState(false)

  // 기존 평가 결과 로드
  useEffect(() => {
    if (evaluation) {
      const results: Partial<Record<PersonaName, PersonaResult>> = {}
      if (evaluation.investor_score !== null) {
        results.investor = {
          score: evaluation.investor_score,
          feedback: evaluation.investor_feedback || '',
        }
      }
      if (evaluation.market_score !== null) {
        results.market = {
          score: evaluation.market_score,
          feedback: evaluation.market_feedback || '',
        }
      }
      if (evaluation.tech_score !== null) {
        results.tech = {
          score: evaluation.tech_score,
          feedback: evaluation.tech_feedback || '',
        }
      }
      setPersonaResults(results)
    }
  }, [evaluation])

  const handleEvaluate = useCallback(async () => {
    setIsEvaluating(true)
    setProgress(null)
    setPersonaResults({})
    setStreamingText({})

    try {
      const response = await fetch(`/api/projects/${projectId}/evaluation/evaluate`, {
        method: 'POST',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('evaluationStage.evalFailed'))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('evaluationStage.streamError'))
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)

          try {
            const event = JSON.parse(data)

            if (event.type === 'progress') {
              const progressData = JSON.parse(event.data)
              setProgress(progressData)
            } else if (event.type === 'persona_text') {
              const textData = JSON.parse(event.data)
              setStreamingText((prev) => ({
                ...prev,
                [textData.persona as PersonaName]: (prev[textData.persona as PersonaName] || '') + textData.text,
              }))
            } else if (event.type === 'persona_complete') {
              const resultData = JSON.parse(event.data)
              setPersonaResults((prev) => ({
                ...prev,
                [resultData.persona as PersonaName]: resultData.result,
              }))
              setStreamingText((prev) => {
                const next = { ...prev }
                delete next[resultData.persona as PersonaName]
                return next
              })
            } else if (event.type === 'complete') {
              const completeData = JSON.parse(event.data)
              toast.success(t('evaluationStage.evalComplete', { score: completeData.totalScore }))
              onUpdate()
            } else if (event.type === 'error') {
              const errorData = JSON.parse(event.data)
              toast.error(`${errorData.persona}: ${errorData.message}`)
            }
          } catch {
            // 파싱 오류 무시
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('toast.evalFailed'))
    } finally {
      setIsEvaluating(false)
      setProgress(null)
    }
  }, [projectId, onUpdate])

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/evaluation/retry`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        setPersonaResults({})
        onUpdate()
      } else {
        toast.error(result.error || t('toast.retryFailed'))
      }
    } catch {
      toast.error(t('toast.retryFailed'))
    } finally {
      setIsRetrying(false)
    }
  }

  const handleDispute = async () => {
    if (disputeComment.length < 10) {
      toast.error(t('evaluationStage.disputeMinLength'))
      return
    }

    setIsSubmittingDispute(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/evaluation/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: disputeComment }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        setShowDisputeDialog(false)
        setDisputeComment('')
        onUpdate()
      } else {
        toast.error(result.error || t('toast.disputeFailed'))
      }
    } catch {
      toast.error(t('toast.disputeFailed'))
    } finally {
      setIsSubmittingDispute(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/evaluation/confirm`, {
        method: 'POST',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(result.data.message)
        onUpdate()
      } else {
        toast.error(result.error || t('toast.confirmFailed'))
      }
    } catch {
      toast.error(t('toast.confirmFailed'))
    } finally {
      setIsConfirming(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400'
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getScoreBadgeVariant = (score: number): 'default' | 'secondary' | 'destructive' => {
    if (score >= 80) return 'default'
    if (score >= 60) return 'secondary'
    return 'destructive'
  }

  const personaConfig = {
    investor: {
      icon: TrendingUp,
      label: t('evaluation.investor'),
      description: t('evaluationStage.investorDesc'),
    },
    market: {
      icon: Users,
      label: t('evaluation.market'),
      description: t('evaluationStage.marketDesc'),
    },
    tech: {
      icon: Cpu,
      label: t('evaluation.tech'),
      description: t('evaluationStage.techDesc'),
    },
  }

  if (!canEvaluate) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('evaluationStage.gate1Required')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('evaluationStage.gate1RequiredDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const hasResults = Object.keys(personaResults).length > 0
  const totalScore = evaluation?.total_score

  return (
    <div className="space-y-6">
      {/* 평가 시작 버튼 */}
      {!hasResults && !isEvaluating && !isConfirmed && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-4 py-12">
            <div className="flex gap-4">
              {Object.values(personaConfig).map((config, i) => {
                const Icon = config.icon
                return (
                  <div key={i} className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-muted p-3">
                      <Icon className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-muted-foreground">{config.label}</span>
                  </div>
                )
              })}
            </div>
            <div className="text-center">
              <h3 className="text-lg font-semibold">{t('evaluationStage.aiMultiEval')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('evaluationStage.aiMultiEvalDesc')}
              </p>
            </div>
            <Button size="lg" onClick={handleEvaluate}>
              {t('evaluation.start')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 평가 진행 중 */}
      {isEvaluating && progress && (
        <Card>
          <CardContent className="py-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('evaluationStage.evaluatingPersona', { persona: progress.persona })}</span>
                <span className="text-sm text-muted-foreground">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 페르소나별 결과 카드 */}
      {(hasResults || isEvaluating) && (
        <div className="grid gap-4 md:grid-cols-3">
          {(Object.entries(personaConfig) as [PersonaName, typeof personaConfig.investor][]).map(([key, config]) => {
            const Icon = config.icon
            const result = personaResults[key]
            const streaming = streamingText[key]
            const isCurrentlyEvaluating = isEvaluating && progress?.persona === config.label

            return (
              <Card key={key} className={isCurrentlyEvaluating ? 'border-primary' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-base">{config.label}</CardTitle>
                    </div>
                    {result && (
                      <Badge variant={getScoreBadgeVariant(result.score)}>
                        {t('evaluationStage.score', { score: result.score })}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  {isCurrentlyEvaluating && streaming ? (
                    <div className="space-y-2">
                      <LoadingSpinner size="sm" />
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {streaming.slice(-200)}...
                      </p>
                    </div>
                  ) : result ? (
                    <div className="space-y-2">
                      <p className={`text-2xl font-bold ${getScoreColor(result.score)}`}>
                        {t('evaluationStage.score', { score: result.score })}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {result.feedback}
                      </p>
                    </div>
                  ) : isEvaluating ? (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-sm text-muted-foreground">{t('evaluationStage.waiting')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <span className="text-sm text-muted-foreground">-</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 종합 점수 */}
      {totalScore !== null && totalScore !== undefined && !isEvaluating && (
        <Card className="border-2">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('evaluation.totalScore')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('evaluationStage.averageScore')}
                </p>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(totalScore)}`}>
                {t('evaluationStage.score', { score: totalScore })}
              </div>
            </div>
            {evaluation?.recommendations && Array.isArray(evaluation.recommendations) && (
              <div className="mt-4 border-t pt-4">
                <h4 className="mb-2 font-medium">{t('evaluation.recommendations')}</h4>
                <ul className="space-y-1">
                  {(evaluation.recommendations as string[]).slice(0, 5).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 이의 제기 표시 */}
      {evaluation?.dispute_comment && !isConfirmed && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="flex items-start gap-4 py-4">
            <MessageSquare className="h-5 w-5 text-yellow-600" />
            <div>
              <h4 className="font-medium text-yellow-700 dark:text-yellow-300">
                {t('evaluationStage.disputeReceived')}
              </h4>
              <p className="mt-1 text-sm text-yellow-600 dark:text-yellow-400">
                {evaluation.dispute_comment}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 액션 버튼들 */}
      {hasResults && !isConfirmed && !isEvaluating && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleRetry}
                disabled={isRetrying}
              >
                {isRetrying ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('common.processing')}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t('evaluationStage.retryEval')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowDisputeDialog(true)}
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                {t('evaluation.dispute')}
              </Button>
            </div>
            <Button
              size="lg"
              onClick={handleConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  {t('evaluationStage.confirmGate2')}
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
                {t('evaluationStage.gate2Passed')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('evaluationStage.gate2PassedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 이의 제기 다이얼로그 */}
      <Dialog open={showDisputeDialog} onOpenChange={setShowDisputeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('evaluationStage.disputeTitle')}</DialogTitle>
            <DialogDescription>
              {t('evaluationStage.disputeDesc')}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={disputeComment}
            onChange={(e) => setDisputeComment(e.target.value)}
            placeholder={t('evaluationStage.disputePlaceholder')}
            rows={5}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisputeDialog(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDispute}
              disabled={isSubmittingDispute || disputeComment.length < 10}
            >
              {isSubmittingDispute ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.submitting')}
                </>
              ) : (
                t('common.submit')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
