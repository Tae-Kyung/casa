'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoadingSpinner } from '@/components/common/loading-spinner'
import { StageProgress } from '@/components/common/progress-bar'
import { ConfirmModal } from '@/components/common/confirm-modal'
import { IdeaStage } from '@/features/idea/components/IdeaStage'
import { EvaluationStage } from '@/features/evaluation'
import { DocumentStage } from '@/features/document'
import { DeployStage } from '@/features/deploy'
import { toast } from 'sonner'
import type { Project, IdeaCard, Evaluation, Document as DocType } from '@/types/database'

interface PageProps {
  params: Promise<{ id: string }>
}

interface ProjectWithRelations extends Project {
  ideaCard: IdeaCard | null
  evaluation: Evaluation | null
  documents: DocType[]
}

const stageToTab: Record<string, string> = {
  idea: 'idea',
  evaluation: 'evaluation',
  document: 'document',
  deploy: 'deploy',
  done: 'done',
}

export default function ProjectDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const t = useTranslations()
  const router = useRouter()

  const [project, setProject] = useState<ProjectWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('idea')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const stageLabels = [
    t('project.idea'),
    t('project.evaluation'),
    t('project.document'),
    t('project.deploy'),
    t('project.done'),
  ]

  const stageToIndex: Record<string, number> = {
    idea: 0,
    evaluation: 1,
    document: 2,
    deploy: 3,
    done: 4,
  }

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`)
      const result = await response.json()

      if (result.success) {
        setProject(result.data)
        setActiveTab(stageToTab[result.data.current_stage] || 'idea')
      } else {
        toast.error(t('toast.projectFetchFailed'))
        router.push('/projects')
      }
    } catch (error) {
      toast.error(t('toast.projectFetchFailed'))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProject()
  }, [id])

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        toast.success(t('toast.projectDeleted'))
        router.push('/projects')
      } else {
        toast.error(t('toast.projectDeleteFailed'))
      }
    } catch (error) {
      toast.error(t('toast.projectDeleteFailed'))
    }
  }

  const handleProjectUpdate = () => {
    fetchProject()
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!project) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/projects')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{project.name}</h1>
            <p className="text-muted-foreground">
              {t('project.createdAt')}: {new Date(project.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common.delete')}
        </Button>
      </div>

      {/* 진행 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('project.progress')}</CardTitle>
        </CardHeader>
        <CardContent>
          <StageProgress
            currentStage={stageToIndex[project.current_stage] || 0}
            totalStages={5}
            stages={stageLabels}
          />
          <div className="mt-4 flex items-center gap-4">
            <Badge variant="outline">
              {t('project.stage')}: {t(`project.${project.current_stage}`)}
            </Badge>
            {project.gate_1_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 1 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_2_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 2 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_3_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 3 {t('gate.passed')}
              </Badge>
            )}
            {project.gate_4_passed_at && (
              <Badge variant="secondary" className="bg-green-500 text-white">
                Gate 4 {t('gate.passed')}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 단계별 탭 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="idea">{t('project.idea')}</TabsTrigger>
          <TabsTrigger
            value="evaluation"
            disabled={stageToIndex[project.current_stage] < 1}
          >
            {t('project.evaluation')}
          </TabsTrigger>
          <TabsTrigger
            value="document"
            disabled={stageToIndex[project.current_stage] < 2}
          >
            {t('project.document')}
          </TabsTrigger>
          <TabsTrigger
            value="deploy"
            disabled={stageToIndex[project.current_stage] < 3}
          >
            {t('project.deploy')}
          </TabsTrigger>
          <TabsTrigger
            value="done"
            disabled={stageToIndex[project.current_stage] < 4}
          >
            {t('project.done')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="idea" className="mt-6">
          <IdeaStage
            projectId={id}
            ideaCard={project.ideaCard}
            isConfirmed={project.ideaCard?.is_confirmed || false}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>

        <TabsContent value="evaluation" className="mt-6">
          <EvaluationStage
            projectId={id}
            evaluation={project.evaluation}
            isConfirmed={project.evaluation?.is_confirmed || false}
            canEvaluate={!!project.gate_1_passed_at}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>

        <TabsContent value="document" className="mt-6">
          <DocumentStage
            projectId={id}
            documents={project.documents}
            isGate3Passed={!!project.gate_3_passed_at}
            canGenerate={!!project.gate_2_passed_at}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>

        <TabsContent value="deploy" className="mt-6">
          <DeployStage
            project={project}
            ideaCard={project.ideaCard}
            evaluation={project.evaluation}
            documents={project.documents}
            canDeploy={!!project.gate_3_passed_at}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>

        <TabsContent value="done" className="mt-6">
          <DeployStage
            project={project}
            ideaCard={project.ideaCard}
            evaluation={project.evaluation}
            documents={project.documents}
            canDeploy={!!project.gate_3_passed_at}
            onUpdate={handleProjectUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* 삭제 확인 모달 */}
      <ConfirmModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={t('confirm.delete')}
        description={t('confirm.deleteDescription')}
        confirmText={t('common.delete')}
        onConfirm={handleDelete}
        variant="destructive"
      />
    </div>
  )
}
