'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus, RefreshCw, User2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface MentorItem {
  id: string
  mentor_id: string
  status: 'active' | 'inactive'
  mentor: {
    id: string
    name: string
    email: string
  }
  profile: {
    specialty: string | string[] | null
    is_approved: boolean
    is_active: boolean
  }
}

export default function InstitutionMentorsPage() {
  const t = useTranslations()
  const [mentors, setMentors] = useState<MentorItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Invite modal state
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  // Status change loading
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  // Remove loading
  const [removingId, setRemovingId] = useState<string | null>(null)

  const fetchMentors = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      const response = await fetch(`/api/institution/mentors?${params}`)
      const result = await response.json()

      if (result.success) {
        setMentors(result.data.items)
        setTotalPages(result.data.totalPages)
      } else {
        toast.error(t('institution.mentors.fetchFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMentors()
  }, [currentPage])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    try {
      const response = await fetch('/api/institution/mentors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim() }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.inviteSuccess'))
        setIsInviteOpen(false)
        setInviteEmail('')
        fetchMentors()
      } else {
        toast.error(result.error || t('institution.mentors.inviteFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.inviteFailed'))
    } finally {
      setIsInviting(false)
    }
  }

  const handleStatusChange = async (mentorId: string, newStatus: 'active' | 'inactive') => {
    setUpdatingId(mentorId)
    try {
      const response = await fetch(`/api/institution/mentors/${mentorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.statusUpdated'))
        setMentors((prev) =>
          prev.map((m) =>
            m.mentor_id === mentorId ? { ...m, status: newStatus } : m
          )
        )
      } else {
        toast.error(result.error || t('institution.mentors.statusUpdateFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.statusUpdateFailed'))
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRemove = async (mentorId: string) => {
    setRemovingId(mentorId)
    try {
      const response = await fetch(`/api/institution/mentors/${mentorId}`, {
        method: 'DELETE',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.mentors.removeSuccess'))
        fetchMentors()
      } else {
        toast.error(result.error || t('institution.mentors.removeFailed'))
      }
    } catch {
      toast.error(t('institution.mentors.removeFailed'))
    } finally {
      setRemovingId(null)
    }
  }

  const getSpecialtyArray = (specialty: string | string[] | null): string[] => {
    if (!specialty) return []
    if (Array.isArray(specialty)) return specialty
    return [specialty]
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.mentors.title')}</h1>
          <p className="text-muted-foreground">{t('institution.mentors.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMentors}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={() => setIsInviteOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            {t('institution.mentors.inviteMentor')}
          </Button>
        </div>
      </div>

      {/* Mentor List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : mentors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <User2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('institution.mentors.noMentors')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {mentors.map((item) => {
              const specialties = getSpecialtyArray(item.profile?.specialty)

              return (
                <Card key={item.id}>
                  <CardContent className="flex items-center justify-between px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {item.mentor?.name || item.mentor?.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {item.mentor?.email}
                      </p>
                      {specialties.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {specialties.map((s) => (
                            <Badge key={s} variant="outline" className="text-xs">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'active' ? (
                        <Badge className="bg-green-500 text-white">
                          {t('institution.mentors.active')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          {t('institution.mentors.inactive')}
                        </Badge>
                      )}
                      <Select
                        value={item.status}
                        onValueChange={(v) =>
                          handleStatusChange(item.mentor_id, v as 'active' | 'inactive')
                        }
                        disabled={updatingId === item.mentor_id}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">
                            {t('institution.mentors.active')}
                          </SelectItem>
                          <SelectItem value="inactive">
                            {t('institution.mentors.inactive')}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemove(item.mentor_id)}
                        disabled={removingId === item.mentor_id}
                      >
                        {removingId === item.mentor_id ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          t('institution.mentors.remove')
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
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

      {/* Invite Mentor Modal */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('institution.mentors.inviteMentor')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('institution.mentors.emailLabel')}</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder={t('institution.mentors.emailPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleInvite()
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
            >
              {isInviting ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('institution.mentors.sendInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
