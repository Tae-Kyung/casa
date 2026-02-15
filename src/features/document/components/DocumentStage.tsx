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
  Eye,
  AlertTriangle,
  Edit3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
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

const documentConfig: Record<DocumentTypeKey, {
  icon: typeof FileText
  label: string
  description: string
  apiPath: string
}> = {
  business_plan: {
    icon: FileText,
    label: '사업계획서',
    description: '상세한 사업 계획 문서',
    apiPath: 'business-plan',
  },
  pitch: {
    icon: Presentation,
    label: '요약 피치',
    description: '투자자용 요약 발표 자료',
    apiPath: 'pitch',
  },
  landing: {
    icon: Globe,
    label: '랜딩페이지',
    description: '고객용 웹 페이지',
    apiPath: 'landing',
  },
}

export function DocumentStage({
  projectId,
  documents,
  isGate3Passed,
  canGenerate,
  onUpdate,
}: DocumentStageProps) {
  const t = useTranslations()
  const [generatingType, setGeneratingType] = useState<DocumentTypeKey | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<DocType | null>(null)

  // 섹션 수정 관련 상태
  const [reviseDoc, setReviseDoc] = useState<DocType | null>(null)
  const [reviseSection, setReviseSection] = useState('')
  const [reviseInstruction, setReviseInstruction] = useState('')
  const [isRevising, setIsRevising] = useState(false)
  const [reviseStreamContent, setReviseStreamContent] = useState('')

  // 문서 타입별로 매핑
  const docByType: Partial<Record<DocumentTypeKey, DocType>> = {}
  documents.forEach(doc => {
    docByType[doc.type as DocumentTypeKey] = doc
  })

  const handleGenerate = useCallback(async (type: DocumentTypeKey) => {
    setGeneratingType(type)
    setStreamingContent('')

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentConfig[type].apiPath}`,
        { method: 'POST' }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '문서 생성에 실패했습니다.')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('스트리밍을 시작할 수 없습니다.')
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

            if (event.type === 'text') {
              setStreamingContent(prev => prev + event.data)
            } else if (event.type === 'complete') {
              toast.success(`${documentConfig[type].label} 생성 완료!`)
              onUpdate()
            }
          } catch {
            // 파싱 오류 무시
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '문서 생성에 실패했습니다.')
    } finally {
      setGeneratingType(null)
      setStreamingContent('')
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
        toast.error(result.error || '확정에 실패했습니다.')
      }
    } catch {
      toast.error('확정에 실패했습니다.')
    } finally {
      setConfirmingId(null)
    }
  }

  const handleDownload = (doc: DocType) => {
    if (!doc.content) return

    const blob = new Blob([doc.content], {
      type: doc.type === 'landing' ? 'text/html' : 'text/markdown'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = doc.type === 'landing'
      ? `${doc.title}.html`
      : `${doc.title}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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
        throw new Error(error.error || '섹션 수정에 실패했습니다.')
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('스트리밍을 시작할 수 없습니다.')
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
            toast.success('섹션이 수정되었습니다.')
            onUpdate()
            setReviseDoc(null)
            setReviseSection('')
            setReviseInstruction('')
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '섹션 수정에 실패했습니다.')
    } finally {
      setIsRevising(false)
      setReviseStreamContent('')
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
              Gate 2 통과 필요
            </h3>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              평가 단계(Gate 2)를 먼저 완료해야 문서를 생성할 수 있습니다.
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
              <h3 className="font-semibold">문서 생성 현황</h3>
              <p className="text-sm text-muted-foreground">
                3개 문서 모두 확정하면 Gate 3를 통과합니다.
              </p>
            </div>
            <Badge variant={confirmedCount === 3 ? 'default' : 'secondary'}>
              {confirmedCount} / 3 확정
            </Badge>
          </div>
        </CardContent>
      </Card>

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
                    <Badge className="bg-green-500">확정됨</Badge>
                  )}
                </div>
                <CardDescription>{config.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {isGenerating ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-sm">생성 중...</span>
                    </div>
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
                    <p className="text-sm text-muted-foreground">
                      생성일: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        미리보기
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="mr-1 h-4 w-4" />
                        다운로드
                      </Button>
                    </div>
                    {!doc.is_confirmed && (
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
                          title={doc.type === 'landing' ? '랜딩페이지는 섹션 수정을 지원하지 않습니다' : ''}
                        >
                          <Edit3 className="mr-1 h-4 w-4" />
                          섹션 수정
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerate(type)}
                          disabled={!!generatingType}
                        >
                          <RefreshCw className="mr-1 h-4 w-4" />
                          재생성
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
                          확정
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
                    {config.label} 생성
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
                Gate 3 통과
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400">
                모든 문서가 확정되었습니다. 배포 단계로 이동할 수 있습니다.
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

      {/* 섹션 수정 다이얼로그 */}
      <Dialog open={!!reviseDoc} onOpenChange={() => !isRevising && setReviseDoc(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>섹션 수정 - {reviseDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="section">수정할 섹션</Label>
              <div className="mt-1.5">
                {extractSections(reviseDoc?.content || '').length > 0 ? (
                  <select
                    id="section"
                    value={reviseSection}
                    onChange={(e) => setReviseSection(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    disabled={isRevising}
                  >
                    <option value="">섹션을 선택하세요</option>
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
                    placeholder="수정할 섹션명을 입력하세요"
                    disabled={isRevising}
                  />
                )}
              </div>
            </div>
            <div>
              <Label htmlFor="instruction">수정 지시사항</Label>
              <Textarea
                id="instruction"
                value={reviseInstruction}
                onChange={(e) => setReviseInstruction(e.target.value)}
                placeholder="어떻게 수정해야 하는지 상세히 설명해주세요. (예: 시장 규모 데이터를 최신 자료로 업데이트해주세요)"
                rows={4}
                disabled={isRevising}
                className="mt-1.5"
              />
            </div>
            {isRevising && reviseStreamContent && (
              <div className="rounded-lg bg-muted p-3">
                <p className="mb-2 text-sm font-medium">수정 중...</p>
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
              취소
            </Button>
            <Button
              onClick={handleRevise}
              disabled={isRevising || !reviseSection.trim() || !reviseInstruction.trim()}
            >
              {isRevising ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  수정 중...
                </>
              ) : (
                <>
                  <Edit3 className="mr-2 h-4 w-4" />
                  섹션 수정
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
