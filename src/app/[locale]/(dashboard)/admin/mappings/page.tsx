'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, Link2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface Mapping {
  id: string
  status: string
  created_at: string
  project: { id: string; name: string; current_stage: string } | null
  institution: { id: string; name: string; region: string } | null
  program: { id: string; name: string; year: number; round: number } | null
}

interface SelectOption {
  id: string
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500',
  approved: 'bg-green-500',
  completed: 'bg-blue-500',
  rejected: 'bg-red-500',
}

export default function MappingsPage() {
  const t = useTranslations()
  const [mappings, setMappings] = useState<Mapping[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [projects, setProjects] = useState<SelectOption[]>([])
  const [institutions, setInstitutions] = useState<SelectOption[]>([])
  const [programs, setPrograms] = useState<SelectOption[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchMappings = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)

      const response = await fetch(`/api/admin/mappings?${params}`)
      const result = await response.json()

      if (result.success) {
        setMappings(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch {
      toast.error(t('admin.mappings.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMappings()
  }, [currentPage, statusFilter])

  const fetchSelectOptions = async () => {
    try {
      const [instRes, progRes] = await Promise.all([
        fetch('/api/admin/institutions?limit=100'),
        fetch('/api/admin/programs?limit=100'),
      ])
      const [instData, progData] = await Promise.all([instRes.json(), progRes.json()])

      if (instData.success) setInstitutions(instData.data.items.map((i: { id: string; name: string }) => ({ id: i.id, name: i.name })))
      if (progData.success) setPrograms(progData.data.items.map((p: { id: string; name: string }) => ({ id: p.id, name: p.name })))
    } catch {
      // ignore
    }
  }

  const openCreateModal = async () => {
    await fetchSelectOptions()
    setSelectedProjectId('')
    setSelectedInstitutionId('')
    setSelectedProgramId('')
    setIsModalOpen(true)
  }

  const handleCreateMapping = async () => {
    if (!selectedProjectId || !selectedInstitutionId || !selectedProgramId) return

    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProjectId,
          institution_id: selectedInstitutionId,
          program_id: selectedProgramId,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.mappings.mapped'))
        setIsModalOpen(false)
        fetchMappings()
      } else {
        toast.error(result.error || t('admin.mappings.mappingFailed'))
      }
    } catch {
      toast.error(t('admin.mappings.mappingFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/mappings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })

      const result = await response.json()
      if (result.success) {
        fetchMappings()
      }
    } catch {
      toast.error(t('admin.mappings.mappingFailed'))
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: t('admin.mappings.statusPending'),
      approved: t('admin.mappings.statusApproved'),
      completed: t('admin.mappings.statusCompleted'),
      rejected: t('admin.mappings.statusRejected'),
    }
    return labels[status] || status
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.mappings.title')}</h1>
          <p className="text-muted-foreground">{t('admin.mappings.description')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchMappings}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh')}
          </Button>
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" />
            {t('admin.mappings.createMapping')}
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1) }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="pending">{t('admin.mappings.statusPending')}</SelectItem>
            <SelectItem value="approved">{t('admin.mappings.statusApproved')}</SelectItem>
            <SelectItem value="completed">{t('admin.mappings.statusCompleted')}</SelectItem>
            <SelectItem value="rejected">{t('admin.mappings.statusRejected')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : mappings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Link2 className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">{t('admin.mappings.noMappings')}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 테이블 헤더 */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-3">{t('admin.mappings.project')}</div>
            <div className="col-span-3">{t('admin.mappings.institution')}</div>
            <div className="col-span-3">{t('admin.mappings.program')}</div>
            <div className="col-span-2">{t('admin.mappings.status')}</div>
            <div className="col-span-1"></div>
          </div>

          <div className="space-y-2">
            {mappings.map((mapping) => (
              <Card key={mapping.id}>
                <CardContent className="px-4 py-3 md:grid md:grid-cols-12 md:items-center md:gap-4">
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm font-medium">{mapping.project?.name || '-'}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm">
                      {mapping.institution?.name || '-'}
                      {mapping.institution?.region && <span className="text-muted-foreground"> ({mapping.institution.region})</span>}
                    </p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="truncate text-sm">{mapping.program?.name || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <Badge className={`${STATUS_COLORS[mapping.status]} text-white`}>
                      {getStatusLabel(mapping.status)}
                    </Badge>
                  </div>
                  <div className="col-span-1">
                    <Select value={mapping.status} onValueChange={(v) => handleStatusChange(mapping.id, v)}>
                      <SelectTrigger className="h-8 w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">{t('admin.mappings.statusPending')}</SelectItem>
                        <SelectItem value="approved">{t('admin.mappings.statusApproved')}</SelectItem>
                        <SelectItem value="completed">{t('admin.mappings.statusCompleted')}</SelectItem>
                        <SelectItem value="rejected">{t('admin.mappings.statusRejected')}</SelectItem>
                      </SelectContent>
                    </Select>
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

      {/* 매핑 생성 모달 */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.mappings.createMapping')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.project')}</label>
              <input
                type="text"
                className="w-full rounded-md border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
                placeholder={t('admin.mappings.selectProject')}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              />
              <p className="mt-1 text-xs text-muted-foreground">Project UUID</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.institution')}</label>
              <Select value={selectedInstitutionId} onValueChange={setSelectedInstitutionId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.mappings.selectInstitution')} />
                </SelectTrigger>
                <SelectContent>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>{inst.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">{t('admin.mappings.program')}</label>
              <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('admin.mappings.selectProgram')} />
                </SelectTrigger>
                <SelectContent>
                  {programs.map((prog) => (
                    <SelectItem key={prog.id} value={prog.id}>{prog.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreateMapping}
              disabled={isSaving || !selectedProjectId || !selectedInstitutionId || !selectedProgramId}
            >
              {isSaving ? <LoadingSpinner size="sm" className="mr-2" /> : null}
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
