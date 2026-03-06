'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useParams } from 'next/navigation'
import { FileText, MessageSquare, Plus, Send, Save } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import Link from 'next/link'
import { toast } from 'sonner'

interface IdeaCard {
  id: string
  problem: string | null
  solution: string | null
  target_market: string | null
  value_proposition: string | null
  is_confirmed: boolean
}

interface EvaluationItem {
  id: string
  category: string
  score: number | null
  feedback: string | null
  status: string
}

interface DocumentItem {
  id: string
  doc_type: string
  title: string | null
  status: string
}

interface ProjectDetail {
  id: string
  name: string
  current_stage: string
  ideaCards: IdeaCard[]
  evaluations: EvaluationItem[]
  documents: DocumentItem[]
}

interface Session {
  id: string
  round_number: number
  session_type: string
  comments: unknown
  status: string
  session_date: string | null
  duration_minutes: number | null
}

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
}

export default function MentoringWorkstationPage() {
  const t = useTranslations()
  const params = useParams()
  const id = params.id as string

  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null)
  const [editingComments, setEditingComments] = useState<Record<string, string>>({})
  const [savingSessionId, setSavingSessionId] = useState<string | null>(null)
  const [submittingSessionId, setSubmittingSessionId] = useState<string | null>(null)
  const [creatingSession, setCreatingSession] = useState(false)

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/mentor/projects/${id}`)
      const result = await response.json()
      if (result.success) {
        setProject(result.data)
      } else {
        toast.error(t('mentor.workstation.fetchFailed'))
      }
    } catch {
      toast.error(t('mentor.workstation.fetchFailed'))
    }
  }

  const fetchSessions = async () => {
    try {
      const response = await fetch(`/api/mentor/projects/${id}/sessions`)
      const result = await response.json()
      if (result.success) {
        setSessions(result.data)
      }
    } catch {
      // silent fail for sessions
    }
  }

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      await Promise.all([fetchProject(), fetchSessions()])
      setIsLoading(false)
    }
    load()
  }, [id])

  const handleCreateSession = async () => {
    setCreatingSession(true)
    try {
      const response = await fetch(`/api/mentor/projects/${id}/sessions`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.created'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.createFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.createFailed'))
    } finally {
      setCreatingSession(false)
    }
  }

  const handleSaveComments = async (sessionId: string) => {
    setSavingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: editingComments[sessionId] || '' }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.saved'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.saveFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.saveFailed'))
    } finally {
      setSavingSessionId(null)
    }
  }

  const handleSubmitSession = async (sessionId: string) => {
    setSubmittingSessionId(sessionId)
    try {
      const response = await fetch(`/api/mentor/sessions/${sessionId}/submit`, {
        method: 'POST',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentor.sessions.submitted'))
        await fetchSessions()
      } else {
        toast.error(result.error || t('mentor.sessions.submitFailed'))
      }
    } catch {
      toast.error(t('mentor.sessions.submitFailed'))
    } finally {
      setSubmittingSessionId(null)
    }
  }

  const toggleSession = (session: Session) => {
    if (expandedSessionId === session.id) {
      setExpandedSessionId(null)
    } else {
      setExpandedSessionId(session.id)
      if (!(session.id in editingComments)) {
        const commentsText =
          typeof session.comments === 'string'
            ? session.comments
            : session.comments
              ? JSON.stringify(session.comments, null, 2)
              : ''
        setEditingComments((prev) => ({ ...prev, [session.id]: commentsText }))
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  const ideaCard = project.ideaCards?.[0] || null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            {t('mentor.workstation.title')}
          </p>
        </div>
        <Link href={`/projects/${id}/mentoring/report`}>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            {t('mentor.workstation.viewReport')}
          </Button>
        </Link>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="artifacts">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="artifacts">
            <FileText className="mr-2 h-4 w-4" />
            {t('mentor.workstation.artifacts')}
          </TabsTrigger>
          <TabsTrigger value="sessions">
            <MessageSquare className="mr-2 h-4 w-4" />
            {t('mentor.workstation.sessions')}
          </TabsTrigger>
        </TabsList>

        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="mt-6 space-y-6">
          {/* Idea Card */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.ideaCard')}</CardTitle>
            </CardHeader>
            <CardContent>
              {ideaCard ? (
                <div className="space-y-3 text-sm">
                  {ideaCard.problem && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        {t('mentor.workstation.problem')}:
                      </span>
                      <p className="mt-1">{ideaCard.problem}</p>
                    </div>
                  )}
                  {ideaCard.solution && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        {t('mentor.workstation.solution')}:
                      </span>
                      <p className="mt-1">{ideaCard.solution}</p>
                    </div>
                  )}
                  {ideaCard.target_market && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        {t('mentor.workstation.targetMarket')}:
                      </span>
                      <p className="mt-1">{ideaCard.target_market}</p>
                    </div>
                  )}
                  {ideaCard.value_proposition && (
                    <div>
                      <span className="font-medium text-muted-foreground">
                        {t('mentor.workstation.valueProp')}:
                      </span>
                      <p className="mt-1">{ideaCard.value_proposition}</p>
                    </div>
                  )}
                  <Badge variant={ideaCard.is_confirmed ? 'default' : 'secondary'}>
                    {ideaCard.is_confirmed
                      ? t('mentor.workstation.confirmed')
                      : t('mentor.workstation.draft')}
                  </Badge>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noIdeaCard')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.evaluations')}</CardTitle>
            </CardHeader>
            <CardContent>
              {project.evaluations.length > 0 ? (
                <div className="space-y-3">
                  {project.evaluations.map((evaluation) => (
                    <div
                      key={evaluation.id}
                      className="flex items-start justify-between rounded-lg border p-3"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{evaluation.category}</p>
                        {evaluation.feedback && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {evaluation.feedback}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {evaluation.score !== null && (
                          <Badge variant="outline">{evaluation.score}/10</Badge>
                        )}
                        <Badge variant="secondary">{evaluation.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noEvaluations')}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle>{t('mentor.workstation.documents')}</CardTitle>
            </CardHeader>
            <CardContent>
              {project.documents.length > 0 ? (
                <div className="space-y-2">
                  {project.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {doc.title || doc.doc_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{doc.doc_type}</Badge>
                        <Badge variant="secondary">{doc.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t('mentor.workstation.noDocuments')}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sessions Tab */}
        <TabsContent value="sessions" className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t('mentor.sessions.title')}
            </h2>
            <Button onClick={handleCreateSession} disabled={creatingSession}>
              {creatingSession ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t('mentor.sessions.newSession')}
            </Button>
          </div>

          {sessions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t('mentor.sessions.noSessions')}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <Card key={session.id}>
                  <CardHeader
                    className="cursor-pointer"
                    onClick={() => toggleSession(session)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-base">
                          {t('mentor.sessions.round')} {session.round_number}
                        </CardTitle>
                        <Badge variant="outline">{session.session_type}</Badge>
                        <Badge
                          className={statusColor[session.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'}
                        >
                          {session.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {session.session_date
                          ? new Date(session.session_date).toLocaleDateString()
                          : '-'}
                        {session.duration_minutes && (
                          <span className="ml-2">
                            ({session.duration_minutes}{t('mentor.sessions.minutes')})
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {expandedSessionId === session.id && (
                    <CardContent className="space-y-4">
                      <div>
                        <label className="mb-2 block text-sm font-medium">
                          {t('mentor.sessions.comments')}
                        </label>
                        <Textarea
                          value={editingComments[session.id] || ''}
                          onChange={(e) =>
                            setEditingComments((prev) => ({
                              ...prev,
                              [session.id]: e.target.value,
                            }))
                          }
                          rows={6}
                          placeholder={t('mentor.sessions.commentsPlaceholder')}
                          disabled={session.status === 'completed'}
                        />
                      </div>
                      {session.status !== 'completed' && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => handleSaveComments(session.id)}
                            disabled={savingSessionId === session.id}
                          >
                            {savingSessionId === session.id ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <Save className="mr-2 h-4 w-4" />
                            )}
                            {t('mentor.sessions.save')}
                          </Button>
                          <Button
                            onClick={() => handleSubmitSession(session.id)}
                            disabled={submittingSessionId === session.id}
                          >
                            {submittingSessionId === session.id ? (
                              <LoadingSpinner size="sm" className="mr-2" />
                            ) : (
                              <Send className="mr-2 h-4 w-4" />
                            )}
                            {t('mentor.sessions.submit')}
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
