'use client'

import { useState, useMemo } from 'react'
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
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Edit2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { usePaginatedFetch } from '@/hooks/usePaginatedFetch'

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
  is_approved: boolean
  created_at: string
  projects: UserProject[]
}

export default function AdminUsersPage() {
  const t = useTranslations()
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const fetchParams = useMemo(() => {
    const p: Record<string, string> = {}
    if (searchQuery) p.search = searchQuery
    if (roleFilter !== 'all') p.role = roleFilter
    return p
  }, [searchQuery, roleFilter])

  const {
    data: users,
    pagination,
    isLoading,
    currentPage,
    setCurrentPage,
    refetch,
  } = usePaginatedFetch<UserWithProjects>({
    url: '/api/admin/users',
    limit: 20,
    params: fetchParams,
    dataKey: 'users',
  })

  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())
  const [processingUserId, setProcessingUserId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null)

  // 수정 모달
  const [editUser, setEditUser] = useState<UserWithProjects | null>(null)
  const [editForm, setEditForm] = useState({ name: '', email: '', password: '' })
  const [isSaving, setIsSaving] = useState(false)

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

  const handleApproval = async (userId: string, action: 'approve' | 'reject') => {
    setProcessingUserId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(action === 'approve' ? t('admin.users.approveSuccess') : t('admin.users.rejectSuccess'))
        refetch()
      } else {
        toast.error(result.error || t('admin.users.actionFailed'))
      }
    } catch {
      toast.error(t('admin.users.actionFailed'))
    } finally {
      setProcessingUserId(null)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setChangingRoleId(userId)
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('admin.users.roleChangeSuccess'))
        refetch()
      } else {
        toast.error(result.error || t('admin.users.roleChangeFailed'))
      }
    } catch {
      toast.error(t('admin.users.roleChangeFailed'))
    } finally {
      setChangingRoleId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.users.deleted'))
        setDeleteConfirmId(null)
        refetch()
      } else {
        toast.error(result.error || t('admin.users.deleteFailed'))
      }
    } catch {
      toast.error(t('admin.users.deleteFailed'))
    } finally {
      setDeletingId(null)
    }
  }

  const openEditModal = (user: UserWithProjects) => {
    setEditUser(user)
    setEditForm({ name: user.name || '', email: user.email, password: '' })
  }

  const handleEditSave = async () => {
    if (!editUser) return

    const updates: Record<string, string> = {}
    if (editForm.name && editForm.name !== (editUser.name || '')) updates.name = editForm.name
    if (editForm.email && editForm.email !== editUser.email) updates.email = editForm.email
    if (editForm.password) updates.password = editForm.password

    if (Object.keys(updates).length === 0) {
      setEditUser(null)
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch(`/api/admin/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('admin.users.editSuccess'))
        setEditUser(null)
        refetch()
      } else {
        toast.error(result.error || t('admin.users.editFailed'))
      }
    } catch {
      toast.error(t('admin.users.editFailed'))
    } finally {
      setIsSaving(false)
    }
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
        <Button variant="outline" onClick={refetch}>
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
                <SelectItem value="pending">{t('admin.users.filterPending')}</SelectItem>
                <SelectItem value="user">{t('admin.users.roleUser')}</SelectItem>
                <SelectItem value="mentor">{t('admin.users.roleMentor')}</SelectItem>
                <SelectItem value="institution">{t('admin.users.roleInstitution')}</SelectItem>
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
                  <div
                    role="button"
                    tabIndex={0}
                    className="flex w-full cursor-pointer items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/50 md:grid md:grid-cols-12"
                    onClick={() => toggleExpanded(user.id)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleExpanded(user.id) }}
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
                    <div className="col-span-2 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.id, value)}
                        disabled={changingRoleId === user.id}
                      >
                        <SelectTrigger className="h-7 w-24 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">{t('admin.users.roleUser')}</SelectItem>
                          <SelectItem value="mentor">{t('admin.users.roleMentor')}</SelectItem>
                          <SelectItem value="institution">{t('admin.users.roleInstitution')}</SelectItem>
                          <SelectItem value="admin">{t('admin.users.roleAdmin')}</SelectItem>
                        </SelectContent>
                      </Select>
                      {!user.is_approved && (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-600 dark:text-yellow-400 gap-0.5">
                          <Clock className="h-3 w-3" />
                          {t('admin.users.pendingApproval')}
                        </Badge>
                      )}
                    </div>
                    <div className="col-span-1">
                      <span className="text-sm">{user.projects.length}</span>
                    </div>
                    <div className="col-span-2 hidden items-center justify-between md:flex">
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); openEditModal(user) }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(user.id) }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* 승인 대기 중인 경우 승인/거절 버튼 */}
                  {!user.is_approved && (
                    <div className="flex items-center gap-2 border-t px-4 py-2 bg-yellow-50 dark:bg-yellow-950/20">
                      <Clock className="h-4 w-4 text-yellow-500" />
                      <span className="text-sm text-muted-foreground flex-1">
                        {t('admin.users.pendingApproval')}
                      </span>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleApproval(user.id, 'approve') }}
                        disabled={processingUserId === user.id}
                      >
                        <CheckCircle className="mr-1 h-3.5 w-3.5" />
                        {t('admin.users.approveUser')}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={(e) => { e.stopPropagation(); handleApproval(user.id, 'reject') }}
                        disabled={processingUserId === user.id}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" />
                        {t('admin.users.rejectUser')}
                      </Button>
                    </div>
                  )}

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

      {/* 삭제 확인 모달 */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('admin.users.deleteConfirmMessage')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              disabled={!!deletingId}
            >
              {deletingId ? <LoadingSpinner size="sm" className="mr-2" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 사용자 수정 모달 */}
      <Dialog open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.users.editUser')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('admin.users.nameLabel')}</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder={t('admin.users.nameLabel')}
              />
            </div>
            <div>
              <Label>{t('admin.users.emailLabel')}</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder={t('admin.users.emailLabel')}
              />
            </div>
            <div>
              <Label>{t('admin.users.newPassword')}</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder={t('admin.users.newPasswordPlaceholder')}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t('admin.users.passwordHint')}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUser(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleEditSave} disabled={isSaving}>
              {isSaving && <LoadingSpinner size="sm" className="mr-2" />}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
