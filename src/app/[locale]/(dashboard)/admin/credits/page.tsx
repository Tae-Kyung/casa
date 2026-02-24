'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Search, Coins, Plus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface UserCredit {
  id: string
  name: string | null
  email: string
  role: string
  ai_credits: number
  created_at: string
}

export default function AdminCreditsPage() {
  const t = useTranslations()

  const [users, setUsers] = useState<UserCredit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [rechargeTarget, setRechargeTarget] = useState<UserCredit | null>(null)
  const [rechargeAmount, setRechargeAmount] = useState('30')
  const [isRecharging, setIsRecharging] = useState(false)

  const fetchUsers = useCallback(async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/credits?${params}`)
      const result = await response.json()

      if (result.success) {
        setUsers(result.data)
      }
    } catch {
      toast.error(t('admin.credits.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [search, t])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleRecharge = async () => {
    if (!rechargeTarget) return

    const amount = parseInt(rechargeAmount)
    if (isNaN(amount) || amount < 1) {
      toast.error(t('admin.credits.invalidAmount'))
      return
    }

    setIsRecharging(true)
    try {
      const response = await fetch('/api/admin/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: rechargeTarget.id,
          amount,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(
          t('admin.credits.rechargeSuccess', {
            name: rechargeTarget.name || rechargeTarget.email,
            amount,
          })
        )
        setRechargeTarget(null)
        fetchUsers()
      } else {
        toast.error(result.error || t('admin.credits.rechargeFailed'))
      }
    } catch {
      toast.error(t('admin.credits.rechargeFailed'))
    } finally {
      setIsRecharging(false)
    }
  }

  const getCreditBadge = (credits: number) => {
    if (credits <= 0) return 'destructive' as const
    if (credits <= 5) return 'secondary' as const
    return 'outline' as const
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('admin.credits.title')}</h1>
          <p className="text-muted-foreground">{t('admin.credits.description')}</p>
        </div>
        <Button variant="outline" onClick={fetchUsers}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      {/* 검색 */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('admin.credits.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {/* 사용자 크레딧 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <div className="space-y-2">
          {/* 헤더 */}
          <div className="hidden rounded-lg bg-muted px-4 py-3 text-sm font-medium text-muted-foreground md:grid md:grid-cols-12 md:gap-4">
            <div className="col-span-3">{t('admin.credits.nameLabel')}</div>
            <div className="col-span-3">{t('admin.credits.emailLabel')}</div>
            <div className="col-span-2">{t('admin.credits.roleLabel')}</div>
            <div className="col-span-2">{t('admin.credits.creditsLabel')}</div>
            <div className="col-span-2">{t('admin.credits.actionLabel')}</div>
          </div>

          {users.map((user) => (
            <Card key={user.id}>
              <CardContent className="flex items-center gap-4 px-4 py-3 md:grid md:grid-cols-12">
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
                  <Badge variant={user.role === 'admin' ? 'default' : user.role === 'mentor' ? 'secondary' : 'outline'}>
                    {user.role}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Badge variant={getCreditBadge(user.ai_credits)} className="text-base px-3 py-1">
                    <Coins className="mr-1.5 h-4 w-4" />
                    {user.ai_credits}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setRechargeTarget(user)
                      setRechargeAmount('30')
                    }}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t('admin.credits.recharge')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {users.length === 0 && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">{t('admin.credits.noUsers')}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* 충전 다이얼로그 */}
      <Dialog open={!!rechargeTarget} onOpenChange={(open) => !open && setRechargeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.credits.rechargeTitle')}</DialogTitle>
          </DialogHeader>
          {rechargeTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm font-medium">{rechargeTarget.name || rechargeTarget.email}</p>
                <p className="text-xs text-muted-foreground">{rechargeTarget.email}</p>
                <p className="mt-1 text-sm">
                  {t('admin.credits.currentCredits')}: <span className="font-bold">{rechargeTarget.ai_credits}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>{t('admin.credits.rechargeAmount')}</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="1000"
                    value={rechargeAmount}
                    onChange={(e) => setRechargeAmount(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {[10, 30, 50, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant="outline"
                      size="sm"
                      onClick={() => setRechargeAmount(String(amount))}
                    >
                      +{amount}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeTarget(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRecharge} disabled={isRecharging}>
              {isRecharging ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Coins className="mr-2 h-4 w-4" />
              )}
              {t('admin.credits.rechargeConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
