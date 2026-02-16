'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { toast } from 'sonner'

export default function NewProjectPage() {
  const t = useTranslations()
  const router = useRouter()
  const [name, setName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error(t('toast.projectNameRequired'))
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('toast.projectCreated'))
        router.push(`/projects/${result.data.id}`)
      } else {
        toast.error(result.error || t('toast.projectCreateFailed'))
      }
    } catch {
      toast.error(t('toast.projectCreateFailed'))
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-3xl font-bold">{t('nav.newProject')}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.newProject')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="projectName">{t('project.name')}</Label>
            <Input
              id="projectName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('toast.projectNameRequired')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate()
              }}
              autoFocus
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? (
              <>
                <LoadingSpinner size="sm" className="mr-2" />
                {t('common.loading')}
              </>
            ) : (
              t('common.create')
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
