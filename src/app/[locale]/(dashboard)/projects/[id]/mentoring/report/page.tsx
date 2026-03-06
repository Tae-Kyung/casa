'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { FileText, Save, Send, Sparkles, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface MentoringReport {
  id: string
  project_id: string
  mentor_opinion: string
  strengths: string
  improvements: string
  overall_rating: number
  ai_generated_report: string
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected'
  created_at: string
  updated_at: string
}

export default function MentoringReportPage() {
  const t = useTranslations()
  const params = useParams()
  const projectId = params.id as string

  const [report, setReport] = useState<MentoringReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  const [mentorOpinion, setMentorOpinion] = useState('')
  const [strengths, setStrengths] = useState('')
  const [improvements, setImprovements] = useState('')
  const [overallRating, setOverallRating] = useState(3)
  const [aiReport, setAiReport] = useState('')
  const [hoveredStar, setHoveredStar] = useState(0)

  const aiReportRef = useRef<HTMLDivElement>(null)

  const fetchOrCreateReport = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/mentor/projects/${projectId}/report`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        const data = result.data as MentoringReport
        setReport(data)
        setMentorOpinion(data.mentor_opinion || '')
        setStrengths(data.strengths || '')
        setImprovements(data.improvements || '')
        setOverallRating(data.overall_rating || 3)
        setAiReport(data.ai_generated_report || '')
      } else {
        toast.error(t('mentor.reports.fetchFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [projectId, t])

  useEffect(() => {
    fetchOrCreateReport()
  }, [fetchOrCreateReport])

  const handleSaveDraft = async () => {
    if (!report) return
    setIsSaving(true)
    try {
      const response = await fetch(`/api/mentor/reports/${report.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mentor_opinion: mentorOpinion,
          strengths,
          improvements,
          overall_rating: overallRating,
        }),
      })
      const result = await response.json()

      if (result.success) {
        setReport(result.data)
        toast.success(t('mentor.reports.savedDraft'))
      } else {
        toast.error(t('mentor.reports.saveFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.saveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async () => {
    if (!report) return
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/mentor/reports/${report.id}/submit`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        setReport(result.data)
        toast.success(t('mentor.reports.submitted'))
      } else {
        toast.error(t('mentor.reports.submitFailed'))
      }
    } catch {
      toast.error(t('mentor.reports.submitFailed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleGenerateAI = async () => {
    if (!report) return
    setIsGeneratingAI(true)
    setAiReport('')

    try {
      const response = await fetch(
        `/api/mentor/reports/${report.id}/generate-ai`,
        { method: 'POST' }
      )

      if (!response.ok) {
        throw new Error('Failed to generate AI report')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No readable stream')
      }

      const decoder = new TextDecoder()
      let accumulated = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                accumulated += parsed.content
                setAiReport(accumulated)

                if (aiReportRef.current) {
                  aiReportRef.current.scrollTop =
                    aiReportRef.current.scrollHeight
                }
              }
            } catch {
              // Non-JSON data chunk, append directly
              accumulated += data
              setAiReport(accumulated)
            }
          }
        }
      }

      toast.success(t('mentor.reports.aiGenerated'))
    } catch {
      toast.error(t('mentor.reports.aiGenerateFailed'))
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { className: string; label: string }
    > = {
      draft: {
        className:
          'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
        label: t('mentor.reports.statusDraft'),
      },
      submitted: {
        className:
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        label: t('mentor.reports.statusSubmitted'),
      },
      confirmed: {
        className:
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        label: t('mentor.reports.statusConfirmed'),
      },
      rejected: {
        className:
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        label: t('mentor.reports.statusRejected'),
      },
    }

    const config = statusConfig[status] || {
      className:
        'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
      label: status,
    }

    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
      >
        {config.label}
      </span>
    )
  }

  const isEditable = report?.status === 'draft' || report?.status === 'rejected'

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('mentor.reports.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('mentor.reports.description')}
          </p>
        </div>
        {report && (
          <div className="flex items-center gap-3">
            {getStatusBadge(report.status)}
          </div>
        )}
      </div>

      {/* Report Form */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Form Fields */}
        <div className="space-y-6">
          {/* Mentor Opinion */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="h-5 w-5" />
                {t('mentor.reports.mentorOpinion')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={mentorOpinion}
                onChange={(e) => setMentorOpinion(e.target.value)}
                placeholder={t('mentor.reports.mentorOpinionPlaceholder')}
                rows={6}
                disabled={!isEditable}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Strengths */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('mentor.reports.strengths')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder={t('mentor.reports.strengthsPlaceholder')}
                rows={4}
                disabled={!isEditable}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Improvements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('mentor.reports.improvements')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder={t('mentor.reports.improvementsPlaceholder')}
                rows={4}
                disabled={!isEditable}
                className="resize-none"
              />
            </CardContent>
          </Card>

          {/* Overall Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('mentor.reports.overallRating')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => isEditable && setOverallRating(star)}
                      onMouseEnter={() => isEditable && setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      disabled={!isEditable}
                      className="p-0.5 transition-colors disabled:cursor-not-allowed"
                    >
                      <Star
                        className={`h-8 w-8 ${
                          star <= (hoveredStar || overallRating)
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300 dark:text-gray-600'
                        }`}
                      />
                    </button>
                  ))}
                  <span className="ml-3 text-lg font-semibold text-muted-foreground">
                    {overallRating} / 5
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="rating-input" className="text-sm text-muted-foreground">
                    {t('mentor.reports.ratingDirect')}
                  </Label>
                  <Input
                    id="rating-input"
                    type="number"
                    min={1}
                    max={5}
                    value={overallRating}
                    onChange={(e) => {
                      const val = Math.min(5, Math.max(1, Number(e.target.value)))
                      setOverallRating(val)
                    }}
                    disabled={!isEditable}
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: AI Report */}
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  {t('mentor.reports.aiReport')}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateAI}
                  disabled={isGeneratingAI || !isEditable}
                >
                  {isGeneratingAI ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      {t('mentor.reports.generating')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('mentor.reports.generateAI')}
                    </>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div
                ref={aiReportRef}
                className="min-h-[300px] max-h-[500px] overflow-y-auto rounded-md border bg-muted/50 p-4 text-sm leading-relaxed whitespace-pre-wrap dark:bg-muted/20"
              >
                {aiReport ? (
                  aiReport
                ) : (
                  <p className="text-muted-foreground italic">
                    {t('mentor.reports.aiReportPlaceholder')}
                  </p>
                )}
              </div>
              {isGeneratingAI && (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <LoadingSpinner size="sm" />
                  {t('mentor.reports.aiStreaming')}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <Card>
            <CardContent className="flex flex-col gap-3 pt-6">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving || !isEditable}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('mentor.reports.saving')}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('mentor.reports.saveDraft')}
                  </>
                )}
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !isEditable}
                className="w-full"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('mentor.reports.submitting')}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {t('mentor.reports.submit')}
                  </>
                )}
              </Button>

              {report?.status === 'submitted' && (
                <p className="text-center text-sm text-muted-foreground">
                  {t('mentor.reports.submittedNote')}
                </p>
              )}
              {report?.status === 'confirmed' && (
                <Badge
                  variant="outline"
                  className="mx-auto border-green-500 text-green-600 dark:text-green-400"
                >
                  {t('mentor.reports.confirmedNote')}
                </Badge>
              )}
              {report?.status === 'rejected' && (
                <p className="text-center text-sm text-red-600 dark:text-red-400">
                  {t('mentor.reports.rejectedNote')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
