'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText,
  Presentation,
  Globe,
  Check,
  RefreshCw,
  Download,
  ChevronDown,
  Eye,
  AlertTriangle,
  Edit3,
  ArrowLeft,
  Undo2
} from 'lucide-react'
import { exportToPdf, exportToDocx } from '@/lib/utils/document-export'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Document as DocType } from '@/types/database'

interface DocumentStageProps {
  projectId: string
  documents: DocType[]
  isGate3Passed: boolean
  canGenerate: boolean  // Gate 2가 통과되었는지
  onUpdate: () => void
}

type DocumentTypeKey = 'business_plan' | 'pitch' | 'landing'

export function DocumentStage({
  projectId,
  documents,
  isGate3Passed,
  canGenerate,
  onUpdate,
}: DocumentStageProps) {
  const t = useTranslations()

  const documentConfig: Record<DocumentTypeKey, {
    icon: typeof FileText
    label: string
    description: string
    apiPath: string
  }> = {
    business_plan: {
      icon: FileText,
      label: t('document.businessPlan'),
      description: t('documentStage.businessPlanDesc'),
      apiPath: 'business-plan',
    },
    pitch: {
      icon: Presentation,
      label: t('document.pitch'),
      description: t('documentStage.pitchDesc'),
      apiPath: 'pitch',
    },
    landing: {
      icon: Globe,
      label: t('document.landing'),
      description: t('documentStage.landingDesc'),
      apiPath: 'landing',
    },
  }
  const [generatingType, setGeneratingType] = useState<DocumentTypeKey | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [generatingModel, setGeneratingModel] = useState<string | null>(null)
  const [streamingLength, setStreamingLength] = useState(0)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null)

  // 섹션 수정 관련 상태
  const [reviseDoc, setReviseDoc] = useState<DocType | null>(null)
  const [reviseSection, setReviseSection] = useState('')
  const [reviseInstruction, setReviseInstruction] = useState('')
  const [isRevising, setIsRevising] = useState(false)
  const [reviseStreamContent, setReviseStreamContent] = useState('')

  // 문서 확정 해제 관련 상태
  const [unconfirmingId, setUnconfirmingId] = useState<string | null>(null)

  // 평가 단계로 돌아가기 관련 상태
  const [showGoBackDialog, setShowGoBackDialog] = useState(false)
  const [isGoingBack, setIsGoingBack] = useState(false)

  // 문서 타입별로 매핑
  const docByType: Partial<Record<DocumentTypeKey, DocType>> = {}
  documents.forEach(doc => {
    docByType[doc.type as DocumentTypeKey] = doc
  })

  const handleGenerate = useCallback(async (type: DocumentTypeKey) => {
    setGeneratingType(type)
    setStreamingContent('')
    setGeneratingModel(null)
    setStreamingLength(0)

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentConfig[type].apiPath}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('documentStage.generateFailed'))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('documentStage.streamError'))
      }

      let buffer = ''
      let totalLength = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split('\n\n')
        buffer = blocks.pop() || ''

        for (const block of blocks) {
          // "event: type\ndata: value" 형식 파싱
          const lines = block.split('\n')
          const eventLine = lines.find(l => l.startsWith('event: '))
          const dataLine = lines.find(l => l.startsWith('data: '))
          if (!dataLine) continue

          const eventType = eventLine ? eventLine.slice(7) : null
          const rawData = dataLine.slice(6)

          try {
            const parsed = JSON.parse(rawData)

            if (eventType === 'start') {
              // start 이벤트: 모델 정보 추출 (double-stringified JSON)
              try {
                const inner = typeof parsed === 'string' ? JSON.parse(parsed) : parsed
                if (inner.model) setGeneratingModel(inner.model)
              } catch { /* ignore */ }
            } else if (eventType === 'text') {
              // text 이벤트: 스트리밍 콘텐츠
              const text = typeof parsed === 'string' ? parsed : String(parsed)
              totalLength += text.length
              setStreamingLength(totalLength)
              setStreamingContent(prev => prev + text)
            } else if (eventType === 'complete') {
              toast.success(t('documentStage.generateComplete', { label: documentConfig[type].label }))
              onUpdate()
            }
          } catch {
            // 파싱 오류 무시
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('documentStage.generateFailed'))
    } finally {
      setGeneratingType(null)
      setStreamingContent('')
      setGeneratingModel(null)
      setStreamingLength(0)
    }
  }, [projectId, onUpdate])

  const handleConfirm = async (docId: string) => {
    setConfirmingId(docId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${docId}/confirm`,
        { method: 'POST' }
      )

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
      setConfirmingId(null)
    }
  }

  const handleUnconfirm = async (docId: string) => {
    setUnconfirmingId(docId)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${docId}/unconfirm`,
        { method: 'POST' }
      )

      const result = await response.json()

      if (result.success) {
        toast.success(t('documentStage.unconfirmSuccess'))
        onUpdate()
      } else {
        toast.error(result.error || t('documentStage.unconfirmFailed'))
      }
    } catch {
      toast.error(t('documentStage.unconfirmFailed'))
    } finally {
      setUnconfirmingId(null)
    }
  }

  const handleDownloadMd = (doc: DocType) => {
    if (!doc.content) return

    const isLanding = doc.type === 'landing'
    const blob = new Blob([doc.content], {
      type: isLanding ? 'text/html' : 'text/markdown'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = isLanding ? `${doc.title}.html` : `${doc.title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = async (doc: DocType) => {
    if (!doc.content) return
    try {
      await exportToPdf(doc.title, doc.content)
    } catch {
      toast.error('PDF export failed')
    }
  }

  const handleDownloadDocx = (doc: DocType) => {
    if (!doc.content) return
    try {
      exportToDocx(doc.title, doc.content)
    } catch {
      toast.error('Word export failed')
    }
  }

  const handleRevise = async () => {
    if (!reviseDoc || !reviseSection.trim() || !reviseInstruction.trim()) return

    setIsRevising(true)
    setReviseStreamContent('')

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${reviseDoc.id}/revise`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section: reviseSection,
            instruction: reviseInstruction,
          }),
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || t('documentStage.reviseFailed'))
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error(t('documentStage.streamError'))
      }

      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('event: ')) continue

          const eventMatch = line.match(/event: (\w+)\ndata: (.*)/)
          if (!eventMatch) continue

          const [, eventType, data] = eventMatch

          if (eventType === 'text') {
            try {
              const text = JSON.parse(data)
              setReviseStreamContent(prev => prev + text)
            } catch {
              // 파싱 오류 무시
            }
          } else if (eventType === 'complete') {
            toast.success(t('documentStage.reviseComplete'))
            onUpdate()
            setReviseDoc(null)
            setReviseSection('')
            setReviseInstruction('')
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('documentStage.reviseFailed'))
    } finally {
      setIsRevising(false)
      setReviseStreamContent('')
    }
  }

  const handleGoBack = async () => {
    setIsGoingBack(true)
    try {
      const response = await fetch(
        `/api/projects/${projectId}/evaluation/reset`,
        { method: 'POST' }
      )
      const result = await response.json()
      if (result.success) {
        toast.success(t('documentStage.goBackSuccess'))
        setShowGoBackDialog(false)
        onUpdate()
      } else {
        toast.error(result.error || t('documentStage.goBackFailed'))
      }
    } catch {
      toast.error(t('documentStage.goBackFailed'))
    } finally {
      setIsGoingBack(false)
    }
  }

  // 문서에서 섹션 목록 추출 (## 로 시작하는 헤더)
  const extractSections = (content: string | null): string[] => {
    if (!content) return []
    const matches = content.match(/^##\s+(.+)$/gm)
    return matches ? matches.map(m => m.replace(/^##\s+/, '').trim()) : []
  }

  if (!canGenerate) {
    return (
      <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950">
        <CardContent className="flex items-center gap-4 py-6">
          <div className="rounded-full bg-orange-500 p-2">
            <AlertTriangle className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-orange-700 dark:text-orange-300">
              {t('documentStage.gate2Required')}
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              {t('documentStage.gate2RequiredDesc')}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const confirmedCount = documents.filter(d => d.is_confirmed).length

  return (
    <div className="space-y-6">
      {/* 진행 상태 요약 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">{t('documentStage.docStatus')}</h3>
              <p className="text-sm text-muted-foreground">
                {t('documentStage.docStatusDesc')}
              </p>
            </div>
            <Badge variant={confirmedCount === 3 ? 'default' : 'secondary'}>
              {t('documentStage.confirmedCount', { count: confirmedCount })}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* 평가 단계로 돌아가기 */}
      {!isGate3Passed && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <ArrowLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-medium text-blue-700 dark:text-blue-300">
                  {t('documentStage.goBackToEvaluation')}
                </h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  {confirmedCount > 0
                    ? t('documentStage.goBackHasConfirmedDocs')
                    : t('documentStage.goBackToEvaluationDesc')}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowGoBackDialog(true)}
              disabled={confirmedCount > 0}
              className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              {t('documentStage.goBackToEvaluation')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 문서 카드 목록 */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.entries(documentConfig) as [DocumentTypeKey, typeof documentConfig.business_plan][]).map(([type, config]) => {
          const Icon = config.icon
          const doc = docByType[type]
          const isGenerating = generatingType === type
          const isConfirming = confirmingId === doc?.id

          return (
            <Card key={type} className={doc?.is_confirmed ? 'border-green-500' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </div>
                  {doc?.is_confirmed && (
                    <Badge className="bg-green-500">{t('documentStage.confirmed')}</Badge>
                  )}
                </div>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isGenerating ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm">{t('documentStage.generating')}</span>
                      {generatingModel && (
                        <Badge variant="outline" className="text-xs">
                          {generatingModel}
                        </Badge>
                      )}
                    </div>
                    {streamingLength > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t('documentStage.generatingChars', { count: streamingLength.toLocaleString() })}
                      </p>
                    )}
                    {streamingContent && (
                      <div className="max-h-32 overflow-y-auto rounded bg-muted p-2">
                        <pre className="whitespace-pre-wrap text-xs">
                          {streamingContent.slice(-500)}...
                        </pre>
                      </div>
                    )}
                  </div>
                ) : doc ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{t('documentStage.createdAt', { date: new Date(doc.created_at).toLocaleDateString() })}</span>
                      {doc.ai_model_used && (
                        <Badge variant="outline" className="text-xs">
                          {doc.ai_model_used}
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {t('document.preview')}
                      </Button>
                      {doc.type === 'landing' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadMd(doc)}
                        >
                          <Download className="mr-1 h-4 w-4" />
                          {t('document.download')}
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Download className="mr-1 h-4 w-4" />
                              {t('document.downloadAs')}
                              <ChevronDown className="ml-1 h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem onClick={() => handleDownloadMd(doc)}>
                              {t('document.downloadMd')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPdf(doc)}>
                              {t('document.downloadPdf')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadDocx(doc)}>
                              {t('document.downloadDoc')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                    {doc.is_confirmed ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUnconfirm(doc.id)}
                          disabled={unconfirmingId === doc.id}
                        >
                          {unconfirmingId === doc.id ? (
                            <LoadingSpinner size="sm" className="mr-1" />
                          ) : (
                            <Undo2 className="mr-1 h-4 w-4" />
                          )}
                          {t('documentStage.unconfirm')}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviseDoc(doc)
                            setReviseSection('')
                            setReviseInstruction('')
                          }}
                          disabled={!!generatingType || doc.type === 'landing'}
                          title={doc.type === 'landing' ? t('documentStage.landingNoRevise') : ''}
                        >
                          <Edit3 className="mr-1 h-4 w-4" />
                          {t('documentStage.sectionRevise')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerate(type)}
                          disabled={!!generatingType}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          {t('documentStage.regenerate')}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleConfirm(doc.id)}
                          disabled={isConfirming}
                        >
                          {isConfirming ? (
                            <LoadingSpinner size="sm" className="mr-1" />
                          ) : (
                            <Check className="mr-1 h-4 w-4" />
                          )}
                          {t('common.confirm')}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => handleGenerate(type)}
                    disabled={!!generatingType}
                  >
                    {t('documentStage.generate', { label: config.label })}
                  </Button>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Gate 3 통과 메시지 */}
      {isGate3Passed && (
        <Card className="border-green-500 bg-green-50 dark:bg-green-950">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="rounded-full bg-green-500 p-2">
              <Check className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                {t('documentStage.gate3Passed')}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                {t('documentStage.gate3PassedDesc')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미리보기 다이얼로그 */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto">
            {previewDoc?.type === 'landing' ? (
              <iframe
                srcDoc={previewDoc.content || ''}
                className="h-[60vh] w-full rounded border"
                title="Landing Page Preview"
              />
            ) : (
              <div className="prose prose-sm max-w-none dark:prose-invert">
                <pre className="whitespace-pre-wrap">
                  {previewDoc?.content}
                </pre>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 평가 단계로 돌아가기 확인 다이얼로그 */}
      <Dialog open={showGoBackDialog} onOpenChange={(open) => !isGoingBack && setShowGoBackDialog(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('documentStage.goBackConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('documentStage.goBackConfirmDesc')}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowGoBackDialog(false)}
              disabled={isGoingBack}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleGoBack}
              disabled={isGoingBack}
            >
              {isGoingBack ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <ArrowLeft className="mr-2 h-4 w-4" />
              )}
              {t('documentStage.goBackToEvaluation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 섹션 수정 다이얼로그 */}
      <Dialog open={!!reviseDoc} onOpenChange={() => !isRevising && setReviseDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('documentStage.sectionReviseDialogTitle', { title: reviseDoc?.title || '' })}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section">{t('documentStage.sectionLabel')}</Label>
              <div className="mt-1.5">
                {extractSections(reviseDoc?.content || '').length > 0 ? (
                  <select
                    id="section"
                    value={reviseSection}
                    onChange={(e) => setReviseSection(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={isRevising}
                  >
                    <option value="">{t('documentStage.selectSection')}</option>
                    {extractSections(reviseDoc?.content || '').map((section) => (
                      <option key={section} value={section}>
                        {section}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="section"
                    value={reviseSection}
                    onChange={(e) => setReviseSection(e.target.value)}
                    placeholder={t('documentStage.sectionInputPlaceholder')}
                    disabled={isRevising}
                  />
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="instruction">{t('documentStage.instructionLabel')}</Label>
              <Textarea
                id="instruction"
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                placeholder={t('documentStage.instructionPlaceholder')}
                rows={4}
                disabled={isRevising}
                className="mt-1.5"
              />
            </div>
            {isRevising && reviseStreamContent && (
              <div className="rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-medium">{t('documentStage.revising')}</p>
                <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs">
                  {reviseStreamContent}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviseDoc(null)}
              disabled={isRevising}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRevise}
              disabled={isRevising || !reviseSection.trim() || !reviseInstruction.trim()}
            >
              {isRevising ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('documentStage.revising')}
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  {t('documentStage.sectionRevise')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
