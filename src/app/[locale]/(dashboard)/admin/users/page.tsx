'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

interface UserProject {
  id: string
  name: string
  current_stage: string
  current_gate: string
  created_at: string
}

interface UserWithProjects {
  id: string
  name: string | null
  email: string
  role: string
  created_at: string
  projects: UserProject[]
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function AdminUsersPage() {
  const t = useTranslations()
  const router = useRouter()

  const [users, setUsers] = useState<UserWithProjects[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
      })

      if (searchQuery) {
        params.append('search', searchQuery)
      }
      if (roleFilter !== 'all') {
        params.append('role', roleFilter)
      }

      const response = await fetch(`/api/admin/users?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.data.users)
        setPagination(result.data.pagination)
      }
    } catch {
      toast.error(t('admin.users.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [currentPage, searchQuery, roleFilter, t])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // 검색 시 페이지 리셋
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, roleFilter])

  const toggleExpanded = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  const getRoleBadge = (role: string) => {
    const config: Record<string, { variant: 'default' | 'secondary' | 'outline'; label: string }> = {
      admin: { variant: 'default', label: t('admin.users.roleAdmin') },
      mentor: { variant: 'secondary', label: t('admin.users.roleMentor') },
      user: { variant: 'outline', label: t('admin.users.roleUser') },
    }
    const c = config[role] || config.user
    return <Badge variant={c.variant}>{c.label}</Badge>
  }

  const getStageBadge = (stage: string) => {
    const stageLabels: Record<string, string> = {
      idea: t('project.idea'),
      evaluation: t('project.evaluation'),
      document: t('project.document'),
      deploy: t('project.deploy'),
      done: t('project.done'),
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.users.title')}</h1>
          <p className="text-muted-foreground">
            {t('admin.users.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 검색 + 필터 */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('admin.users.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="user">{t('admin.users.roleUser')}</SelectItem>
                <SelectItem value="mentor">{t('admin.users.roleMentor')}</SelectItem>
                <SelectItem value="admin">{t('admin.users.roleAdmin')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* 사용자 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : users.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="text-lg font-semibold">{t('admin.users.noUsers')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('admin.users.noUsersDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* 테이블 헤더 */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-1" />
            <div className="col-span-3">{t('admin.users.nameLabel')}</div>
            <div className="col-span-3">{t('admin.users.emailLabel')}</div>
            <div className="col-span-2">{t('admin.users.roleLabel')}</div>
            <div className="col-span-1">{t('admin.users.projectCount')}</div>
            <div className="col-span-2">{t('admin.users.joinDate')}</div>
          </div>

          {users.map((user) => {
            const isExpanded = expandedUsers.has(user.id)
            return (
              <Card key={user.id}>
                <CardContent className="p-0">
                  {/* 사용자 행 */}
                  <button
                    className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 md:grid md:grid-cols-12"
                    onClick={() => toggleExpanded(user.id)}
                  >
                    <div className="col-span-1 flex items-center">
                      {user.projects.length > 0 ? (
                        isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )
                      ) : (
                        <div className="w-4" />
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.name || '-'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground md:hidden">
                        {user.email}
                      </p>
                    </div>
                    <div className="col-span-3 hidden min-w-0 md:block">
                      <p className="truncate text-sm">{user.email}</p>
                    </div>
                    <div className="col-span-2">
                      {getRoleBadge(user.role)}
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm">{user.projects.length}</span>
                    </div>
                    <div className="col-span-2 hidden md:block">
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </button>

                  {/* 프로젝트 목록 (펼침) */}
                  {isExpanded && user.projects.length > 0 && (
                    <div className="border-t bg-muted/30 px-4 py-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        {t('admin.users.userProjects', { name: user.name || user.email })}
                      </p>
                      <div className="space-y-2">
                        {user.projects.map((project) => (
                          <div
                            key={project.id}
                            className="flex items-center justify-between rounded-lg bg-background px-3 py-2"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                {project.name}
                              </span>
                              {getStageBadge(project.current_stage)}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground">
                                {new Date(project.created_at).toLocaleDateString()}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/projects/${project.id}`)
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
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
