'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import {
  FileText,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'

interface MentoringReport {
  id: string
  match_id: string
  session_date: string
  duration_hours: number
  content_summary: string
  status: 'draft' | 'submitted' | 'confirmed' | 'rejected'
  match: {
    id: string
    mentor_id: string
    project_id: string
    mentor: {
      id: string
      name: string
    }
    project: {
      id: string
      name: string
    }
  }
}

interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function InstitutionReportsPage() {
  const t = useTranslations()

  const [reports, setReports] = useState<MentoringReport[]>([])
  const [pagination, setPagination] = useState<PaginationInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Reject modal state
  const [rejectTarget, setRejectTarget] = useState<MentoringReport | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const fetchReports = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })

      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }

      const response = await fetch(`/api/institution/reports?${params}`)
      const result = await response.json()

      if (result.success) {
        setReports(result.data.items)
        setPagination(result.data.pagination)
      }
    } catch {
      toast.error(t('institution.reports.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [statusFilter, currentPage])

  const handleConfirm = async (report: MentoringReport) => {
    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${report.id}/confirm`, {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.reports.confirmSuccess'))
        fetchReports()
      } else {
        toast.error(result.error || t('institution.reports.confirmFailed'))
      }
    } catch {
      toast.error(t('institution.reports.confirmFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) return

    setIsProcessing(true)
    try {
      const response = await fetch(`/api/institution/reports/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('institution.reports.rejectSuccess'))
        setRejectTarget(null)
        setRejectReason('')
        fetchReports()
      } else {
        toast.error(result.error || t('institution.reports.rejectFailed'))
      }
    } catch {
      toast.error(t('institution.reports.rejectFailed'))
    } finally {
      setIsProcessing(false)
    }
  }

  const getStatusBadge = (status: MentoringReport['status']) => {
    const statusConfig = {
      draft: {
        className: 'bg-gray-500 text-white',
        label: t('institution.reports.statusDraft'),
      },
      submitted: {
        className: 'bg-blue-500 text-white',
        label: t('institution.reports.statusSubmitted'),
      },
      confirmed: {
        className: 'bg-green-500 text-white',
        label: t('institution.reports.statusConfirmed'),
      },
      rejected: {
        className: 'bg-red-500 text-white',
        label: t('institution.reports.statusRejected'),
      },
    }

    const config = statusConfig[status]

    return <Badge className={config.className}>{config.label}</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('institution.reports.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('institution.reports.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchReports}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="flex items-center gap-4 py-4">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t('institution.reports.statusLabel')}
            </span>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="submitted">
                  {t('institution.reports.statusSubmitted')}
                </SelectItem>
                <SelectItem value="confirmed">
                  {t('institution.reports.statusConfirmed')}
                </SelectItem>
                <SelectItem value="rejected">
                  {t('institution.reports.statusRejected')}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">
              {t('institution.reports.noReports')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('institution.reports.noReportsDesc')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {report.match.mentor.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {t('institution.reports.project')}: {report.match.project.name}
                    </p>
                  </div>
                  {getStatusBadge(report.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        {t('institution.reports.sessionDate')}
                      </span>
                      <p className="font-medium">
                        {new Date(report.session_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('institution.reports.duration')}
                      </span>
                      <p className="font-medium">
                        {t('institution.reports.durationHours', {
                          hours: report.duration_hours,
                        })}
                      </p>
                    </div>
                  </div>

                  {report.content_summary && (
                    <div className="rounded-lg bg-muted p-3">
                      <p className="text-sm">{report.content_summary}</p>
                    </div>
                  )}

                  {report.status === 'submitted' && (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleConfirm(report)}
                        disabled={isProcessing}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        {t('institution.reports.confirm')}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setRejectTarget(report)
                          setRejectReason('')
                        }}
                        disabled={isProcessing}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        {t('institution.reports.reject')}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={() => {
          setRejectTarget(null)
          setRejectReason('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('institution.reports.rejectTitle')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">
                {t('institution.reports.rejectReasonLabel')}
              </Label>
              <Textarea
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder={t('institution.reports.rejectReasonPlaceholder')}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null)
                setRejectReason('')
              }}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isProcessing || !rejectReason.trim()}
            >
              {isProcessing ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  {t('institution.reports.reject')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
