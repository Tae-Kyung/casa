'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { DollarSign, RefreshCw, CheckCircle, Download, FileText, ChevronDown, ChevronUp, ExternalLink, AlertCircle, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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

interface MentorDocument {
  mentor_id: string
  name: string | null
  email: string
  resume_url: string | null
  bank_account_url: string | null
  privacy_consent_url: string | null
  documents_complete: boolean
}

interface Mentor {
  id: string
  name: string
  email: string
}

interface Payout {
  id: string
  mentor_id: string
  amount: number
  total_sessions: number
  total_hours: number
  status: 'pending' | 'approved' | 'processing' | 'paid' | 'cancelled'
  approved_at: string | null
  mentor: Mentor
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'processing' | 'paid'

const STATUS_BADGE_CLASSES: Record<Payout['status'], string> = {
  pending: 'bg-yellow-500 text-white',
  approved: 'bg-blue-500 text-white',
  processing: 'bg-purple-500 text-white',
  paid: 'bg-green-500 text-white',
  cancelled: 'bg-red-500 text-white',
}

function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
  }).format(amount)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function InstitutionPayoutsPage() {
  const t = useTranslations()

  const [payouts, setPayouts] = useState<Payout[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isApproving, setIsApproving] = useState(false)
  const [isBulkApproving, setIsBulkApproving] = useState(false)
  const [showMentorDocs, setShowMentorDocs] = useState(false)
  const [mentorDocs, setMentorDocs] = useState<MentorDocument[]>([])
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)

  const fetchPayouts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      if (statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/institution/payouts?${params}`)
      const result = await response.json()

      if (result.success) {
        setPayouts(result.data.items)
        setPagination(result.data.pagination)
      } else {
        toast.error(t('institution.payouts.fetchFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setSelectedIds(new Set())
    fetchPayouts()
  }, [statusFilter, currentPage])

  const handleApprove = async (payoutId: string) => {
    setIsApproving(true)
    try {
      const response = await fetch(`/api/institution/payouts/${payoutId}/approve`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.payouts.approveSuccess'))
        fetchPayouts()
      } else {
        toast.error(result.error || t('institution.payouts.approveFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.approveFailed'))
    } finally {
      setIsApproving(false)
    }
  }

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return

    setIsBulkApproving(true)
    try {
      const response = await fetch('/api/institution/payouts/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout_ids: Array.from(selectedIds) }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.payouts.bulkApproveSuccess'))
        setSelectedIds(new Set())
        fetchPayouts()
      } else {
        toast.error(result.error || t('institution.payouts.bulkApproveFailed'))
      }
    } catch {
      toast.error(t('institution.payouts.bulkApproveFailed'))
    } finally {
      setIsBulkApproving(false)
    }
  }

  const handleExportCSV = () => {
    window.open('/api/institution/payouts/export', '_blank')
  }

  const fetchMentorDocs = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const response = await fetch('/api/institution/mentors/documents')
      const result = await response.json()
      if (result.success) {
        setMentorDocs(result.data)
      }
    } catch {
      toast.error(t('institution.payouts.docsFetchFailed'))
    } finally {
      setIsLoadingDocs(false)
    }
  }, [t])

  useEffect(() => {
    if (showMentorDocs && mentorDocs.length === 0) {
      fetchMentorDocs()
    }
  }, [showMentorDocs, fetchMentorDocs])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const pendingPayouts = payouts.filter((p) => p.status === 'pending')

  const toggleSelectAll = () => {
    if (selectedIds.size === pendingPayouts.length && pendingPayouts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pendingPayouts.map((p) => p.id)))
    }
  }

  const getStatusLabel = (status: Payout['status']): string => {
    return t(`institution.payouts.status.${status}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('institution.payouts.title')}</h1>
          <p className="text-muted-foreground">
            {t('institution.payouts.description')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" />
            {t('institution.payouts.exportCSV')}
          </Button>
          <Button variant="outline" onClick={fetchPayouts}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.payouts.statusFilter')}
            </span>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as StatusFilter)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="pending">{t('institution.payouts.status.pending')}</SelectItem>
                <SelectItem value="approved">{t('institution.payouts.status.approved')}</SelectItem>
                <SelectItem value="processing">{t('institution.payouts.status.processing')}</SelectItem>
                <SelectItem value="paid">{t('institution.payouts.status.paid')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkApprove}
              disabled={isBulkApproving}
            >
              {isBulkApproving ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <CheckCircle className="mr-2 h-4 w-4" />
              )}
              {t('institution.payouts.bulkApprove', { count: selectedIds.size })}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payouts List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : payouts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">{t('institution.payouts.noPayouts')}</h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.payouts.noPayoutsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Table Header */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4 md:items-center">
            <div className="col-span-1">
              {pendingPayouts.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedIds.size === pendingPayouts.length && pendingPayouts.length > 0}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                />
              )}
            </div>
            <div className="col-span-2">{t('institution.payouts.mentorName')}</div>
            <div className="col-span-2">{t('institution.payouts.amount')}</div>
            <div className="col-span-1">{t('institution.payouts.sessions')}</div>
            <div className="col-span-1">{t('institution.payouts.hours')}</div>
            <div className="col-span-1">{t('institution.payouts.statusLabel')}</div>
            <div className="col-span-2">{t('institution.payouts.approvedAt')}</div>
            <div className="col-span-2">{t('institution.payouts.actions')}</div>
          </div>

          {/* Payout Rows */}
          {payouts.map((payout) => (
            <Card key={payout.id}>
              <CardContent className="flex flex-col gap-3 px-4 py-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
                {/* Checkbox */}
                <div className="col-span-1">
                  {payout.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={selectedIds.has(payout.id)}
                      onChange={() => toggleSelect(payout.id)}
                      className="h-4 w-4 rounded border-gray-300 dark:border-gray-600"
                    />
                  )}
                </div>

                {/* Mentor Name */}
                <div className="col-span-2 min-w-0">
                  <p className="truncate text-sm font-medium">
                    {payout.mentor.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground md:hidden">
                    {payout.mentor.email}
                  </p>
                </div>

                {/* Amount */}
                <div className="col-span-2">
                  <span className="text-sm font-semibold">
                    {formatKRW(payout.amount)}
                  </span>
                </div>

                {/* Sessions */}
                <div className="col-span-1">
                  <span className="text-sm">{payout.total_sessions}</span>
                  <span className="text-xs text-muted-foreground md:hidden ml-1">
                    {t('institution.payouts.sessions')}
                  </span>
                </div>

                {/* Hours */}
                <div className="col-span-1">
                  <span className="text-sm">{payout.total_hours}</span>
                  <span className="text-xs text-muted-foreground md:hidden ml-1">
                    {t('institution.payouts.hours')}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-1">
                  <Badge className={STATUS_BADGE_CLASSES[payout.status]}>
                    {getStatusLabel(payout.status)}
                  </Badge>
                </div>

                {/* Approved At */}
                <div className="col-span-2">
                  <span className="text-sm text-muted-foreground">
                    {formatDate(payout.approved_at)}
                  </span>
                </div>

                {/* Actions */}
                <div className="col-span-2">
                  {payout.status === 'pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleApprove(payout.id)}
                      disabled={isApproving}
                    >
                      {isApproving ? (
                        <LoadingSpinner size="sm" className="mr-2" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      {t('institution.payouts.approve')}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* 멘토 증빙서류 섹션 */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setShowMentorDocs(!showMentorDocs)}
        >
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              {t('institution.payouts.mentorDocuments')}
            </CardTitle>
            {showMentorDocs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        {showMentorDocs && (
          <CardContent>
            {isLoadingDocs ? (
              <div className="flex justify-center py-4">
                <LoadingSpinner size="sm" />
              </div>
            ) : mentorDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {t('institution.payouts.noMentorDocs')}
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('institution.payouts.mentorDocsDesc')}
                </p>
                {/* Table header */}
                <div className="hidden rounded-lg bg-muted px-4 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-6 md:gap-4">
                  <div className="col-span-2">{t('institution.payouts.mentorName')}</div>
                  <div>{t('institution.payouts.docResume')}</div>
                  <div>{t('institution.payouts.docBankAccount')}</div>
                  <div>{t('institution.payouts.docPrivacyConsent')}</div>
                  <div>{t('institution.payouts.docStatus')}</div>
                </div>
                {mentorDocs.map((doc) => (
                  <div
                    key={doc.mentor_id}
                    className="flex flex-col gap-2 rounded-lg border p-3 md:grid md:grid-cols-6 md:items-center md:gap-4"
                  >
                    <div className="col-span-2 min-w-0">
                      <p className="truncate text-sm font-medium">
                        {doc.name || '-'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc.email}
                      </p>
                    </div>
                    <div>
                      {doc.resume_url ? (
                        <a href={doc.resume_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.bank_account_url ? (
                        <a href={doc.bank_account_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.privacy_consent_url ? (
                        <a href={doc.privacy_consent_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400">
                          <ExternalLink className="h-3 w-3" />
                          {t('institution.payouts.download')}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                    <div>
                      {doc.documents_complete ? (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <Check className="mr-1 h-3 w-3" />
                          {t('institution.payouts.docComplete')}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-300">
                          <AlertCircle className="mr-1 h-3 w-3" />
                          {t('institution.payouts.docIncomplete')}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
