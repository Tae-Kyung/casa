'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  FolderOpen,
  RefreshCw,
  Users,
  ChevronDown,
  ChevronRight,
  Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface ProjectUser {
  id: string
  name: string | null
  email: string
}

interface ProjectMentor {
  id: string
  name: string | null
  email: string
  role: string
}

interface Project {
  id: string
  name: string
  current_stage: string
  status: string
  created_at: string
  user: ProjectUser
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function InstitutionProjectsPage() {
  const t = useTranslations()

  const [projects, setProjects] = useState<Project[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [mentorsMap, setMentorsMap] = useState<Record<string, ProjectMentor[]>>({})
  const [loadingMentors, setLoadingMentors] = useState<Set<string>>(new Set())

  const fetchProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/institution/projects?${params}`)
      const result = await response.json()

      if (result.success) {
        setProjects(result.data.items)
        setPagination(result.data.pagination)
      } else {
        toast.error(t('institution.projects.fetchFailed'))
      }
    } catch {
      toast.error(t('institution.projects.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, statusFilter, t])

  useEffect(() => {
    fetchProjects()
  }, [fetchProjects])

  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter])

  const fetchMentors = async (projectId: string) => {
    if (mentorsMap[projectId]) return

    setLoadingMentors((prev) => new Set(prev).add(projectId))
    try {
      const response = await fetch(`/api/institution/projects/${projectId}/mentors`)
      const result = await response.json()

      if (result.success) {
        setMentorsMap((prev) => ({ ...prev, [projectId]: result.data.mentors }))
      } else {
        toast.error(t('institution.projects.mentorsFetchFailed'))
      }
    } catch {
      toast.error(t('institution.projects.mentorsFetchFailed'))
    } finally {
      setLoadingMentors((prev) => {
        const next = new Set(prev)
        next.delete(projectId)
        return next
      })
    }
  }

  const toggleExpanded = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
        fetchMentors(projectId)
      }
      return next
    })
  }

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; label: string }> = {
      pending: { variant: 'secondary', label: t('institution.projects.statusPending') },
      approved: { variant: 'default', label: t('institution.projects.statusApproved') },
      rejected: { variant: 'destructive', label: t('institution.projects.statusRejected') },
      completed: { variant: 'outline', label: t('institution.projects.statusCompleted') },
    }
    const config = statusConfig[status] || { variant: 'outline' as const, label: status }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getStageBadge = (stage: string) => {
    const stageLabels: Record<string, string> = {
      idea: t('institution.projects.stageIdea'),
      evaluation: t('institution.projects.stageEvaluation'),
      document: t('institution.projects.stageDocument'),
      deploy: t('institution.projects.stageDeploy'),
      done: t('institution.projects.stageDone'),
    }
    const stageColors: Record<string, string> = {
      idea: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      evaluation: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      document: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      deploy: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      done: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stageColors[stage] || ''}`}>
        {stageLabels[stage] || stage}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.projects.title')}</h1>
          <p className="text-muted-foreground">
            {t('institution.projects.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchProjects}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.projects.statusLabel')}
            </span>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="pending">{t('institution.projects.statusPending')}</SelectItem>
                <SelectItem value="approved">{t('institution.projects.statusApproved')}</SelectItem>
                <SelectItem value="rejected">{t('institution.projects.statusRejected')}</SelectItem>
                <SelectItem value="completed">{t('institution.projects.statusCompleted')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Project List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FolderOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('institution.projects.noProjects')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.projects.noProjectsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* Table Header (desktop) */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-1" />
            <div className="col-span-3">{t('institution.projects.projectName')}</div>
            <div className="col-span-2">{t('institution.projects.userName')}</div>
            <div className="col-span-2">{t('institution.projects.stage')}</div>
            <div className="col-span-2">{t('institution.projects.status')}</div>
            <div className="col-span-2">{t('institution.projects.createdAt')}</div>
          </div>

          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id)
            const mentors = mentorsMap[project.id]
            const isMentorsLoading = loadingMentors.has(project.id)

            return (
              <Card key={project.id}>
                <CardContent className="p-0">
                  {/* Project Row */}
                  <button
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 md:grid md:grid-cols-12"
                    onClick={() => toggleExpanded(project.id)}
                  >
                    <div className="col-span-1 flex items-center">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate text-sm font-medium">{project.name}</p>
                      {/* Mobile: show user info below project name */}
                      <p className="truncate text-xs text-muted-foreground md:hidden">
                        {project.user.name || project.user.email}
                      </p>
                    </div>
                    <div className="col-span-2 hidden min-w-0 md:block">
                      <p className="truncate text-sm">{project.user.name || '-'}</p>
                      <p className="truncate text-xs text-muted-foreground">{project.user.email}</p>
                    </div>
                    <div className="col-span-2">
                      {getStageBadge(project.current_stage)}
                    </div>
                    <div className="col-span-2">
                      {getStatusBadge(project.status)}
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-sm text-muted-foreground">
                        {new Date(project.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>

                  {/* Expanded Mentors Panel */}
                  {isExpanded && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-xs font-medium text-muted-foreground">
                          {t('institution.projects.assignedMentors')}
                        </p>
                      </div>

                      {isMentorsLoading ? (
                        <div className="flex items-center justify-center py-4">
                          <LoadingSpinner size="sm" />
                        </div>
                      ) : mentors && mentors.length > 0 ? (
                        <div className="space-y-2">
                          {mentors.map((mentor) => (
                            <div
                              key={mentor.id}
                              className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                            >
                              <div className="flex items-center gap-3">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">
                                    {mentor.name || '-'}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {mentor.email}
                                  </p>
                                </div>
                              </div>
                              <Badge variant="outline">{mentor.role}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="py-2 text-sm text-muted-foreground">
                          {t('institution.projects.noMentors')}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}
    </div>
  )
}
