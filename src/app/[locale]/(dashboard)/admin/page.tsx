'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  Users,
  FolderKanban,
  Clock,
  FileText,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface DashboardData {
  users: {
    total: number
    byRole: { user: number; mentor: number; admin: number }
  }
  projects: {
    total: number
    byStage: {
      idea: number
      evaluation: number
      document: number
      deploy: number
      done: number
    }
  }
  pendingApprovals: number
  documents: { total: number; confirmed: number }
  recentUsers: Array<{
    id: string
    name: string | null
    email: string
    role: string
    created_at: string
  }>
}

export default function AdminDashboardPage() {
  const t = useTranslations()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDashboard = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/dashboard')
      const result = await response.json()
      if (result.success) {
        setData(result.data)
      }
    } catch {
      toast.error(t('admin.dashboard.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!data) return null

  const stageLabels: Record<string, string> = {
    idea: t('project.idea'),
    evaluation: t('project.evaluation'),
    document: t('project.document'),
    deploy: t('project.deploy'),
    done: t('project.done'),
  }

  const stageColors: Record<string, string> = {
    idea: 'bg-blue-500',
    evaluation: 'bg-yellow-500',
    document: 'bg-purple-500',
    deploy: 'bg-orange-500',
    done: 'bg-green-500',
  }

  const roleLabels: Record<string, string> = {
    user: t('admin.dashboard.roleUser'),
    mentor: t('admin.dashboard.roleMentor'),
    admin: t('admin.dashboard.roleAdmin'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.dashboard.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.dashboard.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchDashboard}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 요약 카드 4개 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalUsers')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.users.total}</div>
            <p className="text-xs text-muted-foreground">
              {roleLabels.user} {data.users.byRole.user} · {roleLabels.mentor} {data.users.byRole.mentor} · {roleLabels.admin} {data.users.byRole.admin}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalProjects')}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.projects.total}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.activeProjects', {
                count: data.projects.total - data.projects.byStage.done,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.pendingApprovals')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.awaitingReview')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('admin.dashboard.totalDocuments')}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.documents.total}</div>
            <p className="text-xs text-muted-foreground">
              {t('admin.dashboard.confirmedDocuments', {
                count: data.documents.confirmed,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* 프로젝트 단계 분포 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.projectsByStage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.projects.byStage).map(([stage, count]) => {
                const percentage =
                  data.projects.total > 0
                    ? Math.round((count / data.projects.total) * 100)
                    : 0
                return (
                  <div key={stage} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{stageLabels[stage]}</span>
                      <span className="font-medium">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <div
                        className={`h-2 rounded-full ${stageColors[stage]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* 최근 가입자 */}
        <Card>
          <CardHeader>
            <CardTitle>{t('admin.dashboard.recentUsers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t('admin.dashboard.noRecentUsers')}
              </p>
            ) : (
              <div className="space-y-3">
                {data.recentUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {user.name || user.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {roleLabels[user.role] || user.role}
                      </Badge>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
