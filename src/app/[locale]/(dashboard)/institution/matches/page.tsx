'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link2, RefreshCw, Plus, Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface Match {
  id: string
  project_id: string
  mentor_id: string
  mentor_role: 'primary' | 'secondary'
  status: 'assigned' | 'in_progress' | 'review' | 'completed' | 'cancelled'
  project: { id: string; name: string }
  mentor: { id: string; name: string; email: string }
}

interface SelectOption {
  id: string
  name: string
}

interface MentorOption {
  id: string
  name: string
  email: string
}

const STATUS_COLORS: Record<string, string> = {
  assigned: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  review: 'bg-purple-500',
  completed: 'bg-green-500',
  cancelled: 'bg-red-500',
}

const STATUSES = ['assigned', 'in_progress', 'review', 'completed', 'cancelled'] as const

export default function InstitutionMatchesPage() {
  const t = useTranslations()
  const [matches, setMatches] = useState<Match[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Create/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  const [projects, setProjects] = useState<SelectOption[]>([])
  const [mentors, setMentors] = useState<MentorOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedMentorId, setSelectedMentorId] = useState('')
  const [selectedRole, setSelectedRole] = useState<'primary' | 'secondary'>('primary')
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const fetchMatches = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      const response = await fetch(`/api/institution/matches?${params}`)
      const result = await response.json()

      if (result.success) {
        setMatches(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('institution.matches.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMatches()
  }, [currentPage])

  const fetchSelectOptions = async () => {
    try {
      const [projectsRes, mentorsRes] = await Promise.all([
        fetch('/api/institution/projects'),
        fetch('/api/institution/mentors'),
      ])
      const [projectsData, mentorsData] = await Promise.all([
        projectsRes.json(),
        mentorsRes.json(),
      ])

      if (projectsData.success) {
        setProjects(
          projectsData.data.items.map((p: { id: string; name: string }) => ({
            id: p.id,
            name: p.name,
          }))
        )
      }
      if (mentorsData.success) {
        setMentors(
          mentorsData.data.items
            .filter((m: { mentor_id: string; mentor?: { id: string; name: string | null; email: string } }) => m.mentor)
            .map((m: { mentor_id: string; mentor: { id: string; name: string | null; email: string } }) => ({
              id: m.mentor_id,
              name: m.mentor?.name || m.mentor?.email || '-',
              email: m.mentor?.email || '',
            }))
        )
      }
    } catch {
      // ignore
    }
  }

  const openCreateModal = async () => {
    await fetchSelectOptions()
    setEditingMatch(null)
    setSelectedProjectId('')
    setSelectedMentorId('')
    setSelectedRole('primary')
    setIsModalOpen(true)
  }

  const openEditModal = async (match: Match) => {
    await fetchSelectOptions()
    setEditingMatch(match)
    setSelectedProjectId(match.project_id)
    setSelectedMentorId(match.mentor_id)
    setSelectedRole(match.mentor_role)
    setIsModalOpen(true)
  }

  const handleSaveMatch = async () => {
    if (!selectedProjectId || !selectedMentorId) return

    setIsSaving(true)
    try {
      if (editingMatch) {
        // Update
        const response = await fetch(`/api/institution/matches/${editingMatch.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mentor_id: selectedMentorId !== editingMatch.mentor_id ? selectedMentorId : undefined,
            mentor_role: selectedRole !== editingMatch.mentor_role ? selectedRole : undefined,
          }),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('institution.matches.updateSuccess'))
          setIsModalOpen(false)
          fetchMatches()
        } else {
          toast.error(result.error || t('institution.matches.updateFailed'))
        }
      } else {
        // Create
        const response = await fetch('/api/institution/matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            project_id: selectedProjectId,
            mentor_id: selectedMentorId,
            mentor_role: selectedRole,
          }),
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('institution.matches.createSuccess'))
          setIsModalOpen(false)
          fetchMatches()
        } else {
          toast.error(result.error || t('institution.matches.createFailed'))
        }
      }
    } catch {
      toast.error(editingMatch ? t('institution.matches.updateFailed') : t('institution.matches.createFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteMatch = async (id: string) => {
    try {
      const response = await fetch(`/api/institution/matches/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.matches.deleteSuccess'))
        fetchMatches()
      } else {
        toast.error(result.error || t('institution.matches.deleteFailed'))
      }
    } catch {
      toast.error(t('institution.matches.deleteFailed'))
    } finally {
      setDeleteConfirmId(null)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/institution/matches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()
      if (result.success) {
        toast.success(t('institution.matches.statusUpdated'))
        fetchMatches()
      } else {
        toast.error(result.error || t('institution.matches.statusUpdateFailed'))
      }
    } catch {
      toast.error(t('institution.matches.statusUpdateFailed'))
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      assigned: t('institution.matches.statusAssigned'),
      in_progress: t('institution.matches.statusInProgress'),
      review: t('institution.matches.statusReview'),
      completed: t('institution.matches.statusCompleted'),
      cancelled: t('institution.matches.statusCancelled'),
    }
    return labels[status] || status
  }

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      primary: t('institution.matches.rolePrimary'),
      secondary: t('institution.matches.roleSecondary'),
    }
    return labels[role] || role
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.matches.title')}</h1>
          <p className="text-muted-foreground">{t('institution.matches.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMatches}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('institution.matches.createMatch')}
          </Button>
        </div>
      </div>

      {/* Match list */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : matches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('institution.matches.noMatches')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => (
              <Card key={match.id}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-base">
                    <span className="truncate">{match.project?.name || '-'}</span>
                    <Badge
                      variant="outline"
                      className={
                        match.mentor_role === 'primary'
                          ? 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300'
                          : 'border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300'
                      }
                    >
                      {getRoleLabel(match.mentor_role)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">{match.mentor?.name || '-'}</p>
                    <p className="text-xs text-muted-foreground">{match.mentor?.email || '-'}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge className={`${STATUS_COLORS[match.status]} text-white`}>
                      {getStatusLabel(match.status)}
                    </Badge>
                    <Select
                      value={match.status}
                      onValueChange={(v) => handleStatusChange(match.id, v)}
                    >
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {getStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(match)}
                    >
                      <Pencil className="mr-1 h-3 w-3" />
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteConfirmId(match.id)}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {t('common.delete')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      )}

      {/* Create/Edit match modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMatch ? t('institution.matches.editMatch') : t('institution.matches.createMatch')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('institution.matches.project')}</Label>
              <Select
                value={selectedProjectId}
                onValueChange={setSelectedProjectId}
                disabled={!!editingMatch}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('institution.matches.selectProject')} />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('institution.matches.mentor')}</Label>
              <Select value={selectedMentorId} onValueChange={setSelectedMentorId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('institution.matches.selectMentor')} />
                </SelectTrigger>
                <SelectContent>
                  {mentors.map((mentor) => (
                    <SelectItem key={mentor.id} value={mentor.id}>
                      {mentor.name} ({mentor.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('institution.matches.role')}</Label>
              <Select
                value={selectedRole}
                onValueChange={(v) => setSelectedRole(v as 'primary' | 'secondary')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="primary">
                    {t('institution.matches.rolePrimary')}
                  </SelectItem>
                  <SelectItem value="secondary">
                    {t('institution.matches.roleSecondary')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSaveMatch}
              disabled={isSaving || !selectedProjectId || !selectedMentorId}
            >
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('institution.matches.deleteConfirmTitle')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('institution.matches.deleteConfirmMessage')}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDeleteMatch(deleteConfirmId)}
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
