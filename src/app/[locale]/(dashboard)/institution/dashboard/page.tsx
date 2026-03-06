'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import {
  FolderKanban,
  Users,
  CalendarCheck,
  DollarSign,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

interface InstitutionStats {
  projectCount: number
  mentorCount: number
  sessionCount: number
  completedSessions: number
  pendingPayouts: {
    count: number
    totalAmount: number
  }
}

export default function InstitutionDashboardPage() {
  const t = useTranslations()
  const [stats, setStats] = useState<InstitutionStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchStats = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/institution/stats')
      const result = await response.json()
      if (result.success) {
        setStats(result.data)
      }
    } catch {
      toast.error(t('institution.dashboard.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!stats) return null

  const sessionProgress =
    stats.sessionCount > 0
      ? Math.round((stats.completedSessions / stats.sessionCount) * 100)
      : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {t('institution.dashboard.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('institution.dashboard.description')}
          </p>
        </div>
        <Button variant="outline" onClick={fetchStats}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.projects')}
            </CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projectCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.totalProjects')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.mentors')}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.mentorCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.registeredMentors')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.sessions')}
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sessionCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.sessionProgress', {
                completed: stats.completedSessions,
                rate: sessionProgress,
              })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('institution.dashboard.pendingPayouts')}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.pendingPayouts.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('institution.dashboard.pendingAmount', {
                amount: stats.pendingPayouts.totalAmount.toLocaleString(),
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('institution.dashboard.quickActions')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/mentors">
                <span className="flex items-center">
                  <Users className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToMentors')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/reports">
                <span className="flex items-center">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToReports')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/payouts">
                <span className="flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToPayouts')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>

            <Button variant="outline" className="justify-between" asChild>
              <Link href="/institution/matches">
                <span className="flex items-center">
                  <CalendarCheck className="mr-2 h-4 w-4" />
                  {t('institution.dashboard.goToMatches')}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
