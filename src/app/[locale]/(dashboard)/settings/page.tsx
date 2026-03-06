'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Upload, FileText, Trash2, Check, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { locales } from '@/i18n/routing'
import { toast } from 'sonner'

const localeLabels: Record<string, string> = {
  ko: '한국어',
  en: 'English',
}

interface MentorDocuments {
  resume: string | null
  bank_account: string | null
  privacy_consent: string | null
}

export default function SettingsPage() {
  const t = useTranslations('settings')
  const { theme, setTheme } = useTheme()
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const [isMentor, setIsMentor] = useState(false)
  const [documents, setDocuments] = useState<MentorDocuments | null>(null)
  const [isLoadingDocs, setIsLoadingDocs] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [deletingType, setDeletingType] = useState<string | null>(null)

  const switchLocale = (newLocale: string) => {
    const segments = pathname.split('/')
    segments[1] = newLocale
    const newPath = segments.join('/')
    router.push(newPath)
  }

  const fetchMentorDocuments = useCallback(async () => {
    setIsLoadingDocs(true)
    try {
      const response = await fetch('/api/mentor/documents')
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setIsMentor(true)
          setDocuments(result.data)
        }
      }
    } catch {
      // Not a mentor or fetch failed - silent
    } finally {
      setIsLoadingDocs(false)
    }
  }, [])

  useEffect(() => {
    fetchMentorDocuments()
  }, [fetchMentorDocuments])

  const handleUpload = async (docType: string) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.jpg,.jpeg,.png,.webp'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('mentorDocs.fileTooLarge'))
        return
      }

      setUploadingType(docType)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', docType)

        const response = await fetch('/api/mentor/documents', {
          method: 'POST',
          body: formData,
        })
        const result = await response.json()
        if (result.success) {
          toast.success(t('mentorDocs.uploadSuccess'))
          await fetchMentorDocuments()
        } else {
          toast.error(result.error || t('mentorDocs.uploadFailed'))
        }
      } catch {
        toast.error(t('mentorDocs.uploadFailed'))
      } finally {
        setUploadingType(null)
      }
    }
    input.click()
  }

  const handleDelete = async (docType: string) => {
    setDeletingType(docType)
    try {
      const response = await fetch(`/api/mentor/documents?type=${docType}`, {
        method: 'DELETE',
      })
      const result = await response.json()
      if (result.success) {
        toast.success(t('mentorDocs.deleteSuccess'))
        await fetchMentorDocuments()
      } else {
        toast.error(result.error || t('mentorDocs.deleteFailed'))
      }
    } catch {
      toast.error(t('mentorDocs.deleteFailed'))
    } finally {
      setDeletingType(null)
    }
  }

  const docTypes = [
    { key: 'resume', label: t('mentorDocs.resume'), description: t('mentorDocs.resumeDesc') },
    { key: 'bank_account', label: t('mentorDocs.bankAccount'), description: t('mentorDocs.bankAccountDesc') },
    { key: 'privacy_consent', label: t('mentorDocs.privacyConsent'), description: t('mentorDocs.privacyConsentDesc') },
  ]

  const allDocsUploaded = documents?.resume && documents?.bank_account && documents?.privacy_consent

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('theme')}</CardTitle>
            <CardDescription>
              {t('themeDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={theme}
              onValueChange={setTheme}
              className="grid grid-cols-3 gap-4"
            >
              <div>
                <RadioGroupItem
                  value="light"
                  id="light"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="light"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">☀️</span>
                  {t('light')}
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="dark"
                  id="dark"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="dark"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">🌙</span>
                  {t('dark')}
                </Label>
              </div>
              <div>
                <RadioGroupItem
                  value="system"
                  id="system"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="system"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                >
                  <span className="mb-2 text-2xl">💻</span>
                  {t('system')}
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('language')}</CardTitle>
            <CardDescription>
              {t('languageDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={locale}
              onValueChange={switchLocale}
              className="grid grid-cols-2 gap-4"
            >
              {locales.map((loc) => (
                <div key={loc}>
                  <RadioGroupItem
                    value={loc}
                    id={loc}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={loc}
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                  >
                    <span className="mb-2 text-2xl">
                      {loc === 'ko' ? '🇰🇷' : '🇺🇸'}
                    </span>
                    {localeLabels[loc]}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 멘토 증빙 서류 섹션 */}
        {isMentor && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {t('mentorDocs.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('mentorDocs.description')}
                  </CardDescription>
                </div>
                {allDocsUploaded ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <Check className="mr-1 h-3 w-3" />
                    {t('mentorDocs.allComplete')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-300">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    {t('mentorDocs.incomplete')}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingDocs ? (
                <div className="flex justify-center py-4">
                  <LoadingSpinner size="sm" />
                </div>
              ) : (
                <div className="space-y-4">
                  {docTypes.map((doc) => {
                    const url = documents?.[doc.key as keyof MentorDocuments]
                    const isUploading = uploadingType === doc.key
                    const isDeleting = deletingType === doc.key

                    return (
                      <div
                        key={doc.key}
                        className="flex items-center justify-between rounded-lg border p-4"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{doc.label}</p>
                            {url ? (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                {t('mentorDocs.uploaded')}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">
                                {t('mentorDocs.notUploaded')}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {doc.description}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {url && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => window.open(url, '_blank')}
                              >
                                <FileText className="mr-1 h-3 w-3" />
                                {t('mentorDocs.view')}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDelete(doc.key)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <LoadingSpinner size="sm" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </Button>
                            </>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpload(doc.key)}
                            disabled={isUploading}
                          >
                            {isUploading ? (
                              <LoadingSpinner size="sm" className="mr-1" />
                            ) : (
                              <Upload className="mr-1 h-3 w-3" />
                            )}
                            {url ? t('mentorDocs.reupload') : t('mentorDocs.upload')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  <p className="text-xs text-muted-foreground">
                    {t('mentorDocs.fileHint')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
