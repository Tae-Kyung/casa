'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, FolderKanban, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { StageProgress } from '@/components/common/progress-bar'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import type { Project, ProjectStatus } from '@/types/database'

const statusLabels: Record<ProjectStatus, string> = {
  draft: '초안',
  in_progress: '진행 중',
  completed: '완료',
  archived: '보관됨',
}

const statusColors: Record<ProjectStatus, string> = {
  draft: 'bg-gray-500',
  in_progress: 'bg-blue-500',
  completed: 'bg-green-500',
  archived: 'bg-gray-400',
}

export default function ProjectsPage() {
  const t = useTranslations()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [status, setStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // 새 프로젝트 생성 모달
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const stageLabels = [
    t('project.idea'),
    t('project.evaluation'),
    t('project.document'),
    t('project.deploy'),
    t('project.done'),
  ]

  const stageToIndex: Record<string, number> = {
    idea: 0,
    evaluation: 1,
    document: 2,
    deploy: 3,
    done: 4,
  }

  const fetchProjects = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (status !== 'all') {
        params.set('status', status)
      }

      const response = await fetch(`/api/projects?${params}`)
      const result = await response.json()

      if (result.success) {
        setProjects(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      toast.error('프로젝트 목록을 불러오는데 실패했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [page, status])

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error('프로젝트 이름을 입력해주세요.')
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success('프로젝트가 생성되었습니다.')
        setShowCreateModal(false)
        setNewProjectName('')
        router.push(`/projects/${result.data.id}`)
      } else {
        toast.error(result.error || '프로젝트 생성에 실패했습니다.')
      }
    } catch (error) {
      toast.error('프로젝트 생성에 실패했습니다.')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.projects')}</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('nav.newProject')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('nav.newProject')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">{t('project.name')}</Label>
                <Input
                  id="projectName"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="프로젝트 이름을 입력하세요"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject()
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleCreateProject} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.create')
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 필터 */}
      <div className="flex gap-4">
        <Select value={status} onValueChange={(value) => {
          setStatus(value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('project.status')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="draft">{t('project.draft')}</SelectItem>
            <SelectItem value="in_progress">{t('project.inProgress')}</SelectItem>
            <SelectItem value="completed">{t('project.completed')}</SelectItem>
            <SelectItem value="archived">{t('project.archived')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 프로젝트 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title={t('dashboard.noProjects')}
          description={t('dashboard.createFirst')}
          action={{
            label: t('nav.newProject'),
            onClick: () => setShowCreateModal(true),
          }}
        />
      ) : (
        <>
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{project.name}</CardTitle>
                      <Badge
                        variant="secondary"
                        className={`${statusColors[project.status]} text-white`}
                      >
                        {statusLabels[project.status]}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <StageProgress
                      currentStage={stageToIndex[project.current_stage] || 0}
                      totalStages={5}
                      stages={stageLabels}
                    />
                    <div className="mt-4 flex justify-between text-sm text-muted-foreground">
                      <span>{t('project.createdAt')}: {new Date(project.created_at).toLocaleDateString()}</span>
                      <span>{t('project.updatedAt')}: {new Date(project.updated_at).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
