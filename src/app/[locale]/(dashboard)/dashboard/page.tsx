import { getTranslations, setRequestLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, FolderKanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/common/empty-state'
import { StageProgress } from '@/components/common/progress-bar'

interface DashboardPageProps {
  params: Promise<{ locale: string }>
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params
  setRequestLocale(locale)

  const t = await getTranslations('dashboard')
  const tProject = await getTranslations('project')

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 사용자 프로젝트 목록 조회
  const { data: projects } = await supabase
    .from('bi_projects')
    .select('*')
    .eq('user_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(5)

  const stageLabels = [
    tProject('idea'),
    tProject('evaluation'),
    tProject('document'),
    tProject('deploy'),
    tProject('done'),
  ]

  const stageToIndex: Record<string, number> = {
    idea: 0,
    evaluation: 1,
    document: 2,
    deploy: 3,
    done: 4,
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('title')}</h1>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            {tProject('title')}
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('myProjects')}</CardTitle>
            <CardDescription>
              {projects?.length || 0} {tProject('title').toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/projects">
                <FolderKanban className="mr-2 h-4 w-4" />
                {t('myProjects')}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('myProjects')}</CardTitle>
        </CardHeader>
        <CardContent>
          {!projects || projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban className="h-8 w-8 text-muted-foreground" />}
              title={t('noProjects')}
              description={t('createFirst')}
              actionLabel={tProject('title')}
              actionHref="/projects/new"
            />
          ) : (
            <div className="space-y-6">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border p-4 transition-colors hover:bg-accent"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold">{project.name}</h3>
                    <span className="text-sm text-muted-foreground">
                      {tProject(project.status as 'draft' | 'inProgress' | 'completed' | 'archived')}
                    </span>
                  </div>
                  <StageProgress
                    currentStage={stageToIndex[project.current_stage] || 0}
                    totalStages={5}
                    stages={stageLabels}
                  />
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
