'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, UserCheck } from 'lucide-react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface MentorProfile {
  user_id: string
  specialty: string[]
  career_summary: string | null
  is_approved: boolean
  is_active: boolean
  created_at: string
  user: {
    id: string
    email: string
    name: string | null
    role: string
  }
}

interface MentorDetail extends MentorProfile {
  institutions: Array<{
    institution: { id: string; name: string; region: string }
  }>
  matchCount: number
}

export default function MentorsPage() {
  const t = useTranslations()
  const [mentors, setMentors] = useState<MentorProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [approvedFilter, setApprovedFilter] = useState('all')

  // 상세 모달
  const [selectedMentor, setSelectedMentor] = useState<MentorDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)

  const fetchMentors = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })
      if (approvedFilter !== 'all') params.set('approved', approvedFilter)

      const response = await fetch(`/api/admin/mentors?${params}`)
      const result = await response.json()

      if (result.success) {
        setMentors(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('admin.mentors.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMentors()
  }, [currentPage, approvedFilter])

  const viewDetail = async (mentorId: string) => {
    setIsDetailLoading(true)
    try {
      const response = await fetch(`/api/admin/mentors/${mentorId}`)
      const result = await response.json()

      if (result.success) {
        setSelectedMentor(result.data)
      }
    } catch {
      toast.error(t('admin.mentors.fetchFailed'))
    } finally {
      setIsDetailLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.mentors.title')}</h1>
          <p className="text-muted-foreground">{t('admin.mentors.description')}</p>
        </div>
        <Button variant="outline" onClick={fetchMentors}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Select value={approvedFilter} onValueChange={(v) => { setApprovedFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="true">{t('admin.mentors.approved')}</SelectItem>
            <SelectItem value="false">{t('admin.mentors.pendingApproval')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : mentors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserCheck className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('admin.mentors.noMentors')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {mentors.map((mentor) => (
              <Card key={mentor.user_id}>
                <CardContent className="flex items-center justify-between px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{mentor.user?.name || mentor.user?.email}</p>
                    <p className="text-sm text-muted-foreground">{mentor.user?.email}</p>
                    {mentor.specialty && mentor.specialty.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {mentor.specialty.map((s) => (
                          <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {mentor.is_approved ? (
                      <Badge className="bg-green-500 text-white">{t('admin.mentors.approved')}</Badge>
                    ) : (
                      <Badge variant="secondary">{t('admin.mentors.pendingApproval')}</Badge>
                    )}
                    <Button variant="outline" size="sm" onClick={() => viewDetail(mentor.user_id)}>
                      {t('admin.mentors.viewDetail')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          )}
        </>
      )}

      {/* 상세 모달 */}
      <Dialog open={!!selectedMentor || isDetailLoading} onOpenChange={() => setSelectedMentor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedMentor?.user?.name || t('admin.mentors.viewDetail')}</DialogTitle>
          </DialogHeader>
          {isDetailLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : selectedMentor && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.mentors.email')}</span>
                  <span>{selectedMentor.user?.email}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.mentors.status')}</span>
                  <span>{selectedMentor.is_approved ? t('admin.mentors.approved') : t('admin.mentors.pendingApproval')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{t('admin.mentors.matches')}</span>
                  <span>{selectedMentor.matchCount}</span>
                </div>
              </div>

              {selectedMentor.specialty && selectedMentor.specialty.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">{t('admin.mentors.specialty')}</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedMentor.specialty.map((s) => (
                      <Badge key={s} variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedMentor.career_summary && (
                <div>
                  <p className="mb-1 text-sm font-medium">Career</p>
                  <p className="text-sm text-muted-foreground">{selectedMentor.career_summary}</p>
                </div>
              )}

              {selectedMentor.institutions && selectedMentor.institutions.length > 0 && (
                <div>
                  <p className="mb-1 text-sm font-medium">{t('admin.mentors.institutions')}</p>
                  <div className="space-y-1">
                    {selectedMentor.institutions.map((item) => (
                      <p key={item.institution.id} className="text-sm">
                        {item.institution.name} ({item.institution.region})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {!selectedMentor.is_approved && (
                <p className="text-sm text-center text-muted-foreground">
                  {t('admin.mentors.approveInUsers')}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
