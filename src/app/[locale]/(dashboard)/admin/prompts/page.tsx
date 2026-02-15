'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Search, RefreshCw, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { EmptyState } from '@/components/common/empty-state'
import { Pagination } from '@/components/common/pagination'
import { toast } from 'sonner'
import type { Prompt, PromptCategory } from '@/types/database'

const categoryColors: Record<PromptCategory, string> = {
  ideation: 'bg-blue-500',
  evaluation: 'bg-green-500',
  document: 'bg-purple-500',
  marketing: 'bg-orange-500',
}

export default function PromptsPage() {
  const t = useTranslations()

  const categoryLabels: Record<PromptCategory, string> = {
    ideation: t('admin.prompts.categoryIdeation'),
    evaluation: t('admin.prompts.categoryEvaluation'),
    document: t('admin.prompts.categoryDocument'),
    marketing: t('admin.prompts.categoryMarketing'),
  }
  const [prompts, setPrompts] = useState<Prompt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchPrompts = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })
      if (category !== 'all') {
        params.set('category', category)
      }
      if (search) {
        params.set('search', search)
      }

      const response = await fetch(`/api/admin/prompts?${params}`)
      const result = await response.json()

      if (result.success) {
        setPrompts(result.data.items)
        setTotalPages(result.data.totalPages)
      }
    } catch (error) {
      toast.error(t('admin.prompts.fetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPrompts()
  }, [page, category])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPrompts()
  }

  const handleSyncCache = async () => {
    try {
      const response = await fetch('/api/admin/prompts/sync-cache', {
        method: 'POST',
      })
      const result = await response.json()

      if (result.success) {
        toast.success(t('admin.prompts.syncCacheSuccess'))
      } else {
        toast.error(t('admin.prompts.syncCacheFailed'))
      }
    } catch (error) {
      toast.error(t('admin.prompts.syncCacheFailed'))
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('nav.prompts')}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSyncCache}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('admin.prompts.syncCache')}
          </Button>
          <Button asChild>
            <Link href="/admin/prompts/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('admin.prompts.newPrompt')}
            </Link>
          </Button>
        </div>
      </div>

      {/* 필터 및 검색 */}
      <div className="flex flex-col gap-4 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <Input
            placeholder={t('admin.prompts.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          <Button type="submit" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Select value={category} onValueChange={(value) => {
          setCategory(value)
          setPage(1)
        }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('admin.prompts.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('common.all')}</SelectItem>
            <SelectItem value="ideation">{t('admin.prompts.categoryIdeation')}</SelectItem>
            <SelectItem value="evaluation">{t('admin.prompts.categoryEvaluation')}</SelectItem>
            <SelectItem value="document">{t('admin.prompts.categoryDocument')}</SelectItem>
            <SelectItem value="marketing">{t('admin.prompts.categoryMarketing')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 프롬프트 목록 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : prompts.length === 0 ? (
        <EmptyState
          icon={Settings2}
          title={t('admin.prompts.noPrompts')}
          description={t('admin.prompts.noPromptsDesc')}
          action={{
            label: t('admin.prompts.newPrompt'),
            onClick: () => {},
          }}
        />
      ) : (
        <>
          <div className="grid gap-4">
            {prompts.map((prompt) => (
              <Link key={prompt.id} href={`/admin/prompts/${prompt.id}`}>
                <Card className="transition-colors hover:bg-accent">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{prompt.name}</CardTitle>
                        <Badge
                          variant="secondary"
                          className={`${categoryColors[prompt.category]} text-white`}
                        >
                          {categoryLabels[prompt.category]}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">v{prompt.version}</Badge>
                        {!prompt.is_active && (
                          <Badge variant="destructive">{t('admin.prompts.inactive')}</Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">{t('admin.prompts.keyLabel')}</span>{' '}
                        <code className="rounded bg-muted px-1">{prompt.key}</code>
                      </div>
                      {prompt.description && (
                        <p className="line-clamp-2">{prompt.description}</p>
                      )}
                      <div className="flex gap-4">
                        <span>{t('admin.prompts.modelLabel')} {prompt.model}</span>
                        <span>Temperature: {prompt.temperature}</span>
                        <span>Max Tokens: {prompt.max_tokens}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  )
}
