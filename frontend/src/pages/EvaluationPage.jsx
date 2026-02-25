import { useState } from 'react'
import {
  BarChart3, Plus, Play, Zap, Database, FileText,
  Trash2, Edit3, Calendar, Hash, AlertCircle, Loader2
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useListDatasets,
  useListEvaluations,
  useCreateDataset,
  useUpdateDataset,
  useDeleteDataset,
  useEvaluateAssistant,
  getListDatasetsQueryKey,
  getListEvaluationsQueryKey,
} from '../api/generated'
import { useAssistants } from '../hooks/useAssistants'
import { useMetrics } from '../hooks/useMetrics'
import Card from '../components/shared/Card'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import DatasetCreator from '../components/evaluation/DatasetCreator'
import MetricFormModal from '../components/evaluation/MetricFormModal'
import RunEvaluationPanel from '../components/evaluation/RunEvaluationPanel'
import EvaluationResultsView from '../components/evaluation/EvaluationResultsView'

// ── Tab config ────────────────────────────────────────────

const TABS = [
  { id: 'evaluations', label: 'Evaluations', icon: BarChart3 },
  { id: 'datasets', label: 'Datasets', icon: Database },
  { id: 'metrics', label: 'Metrics', icon: Zap },
]

const METRIC_TABS = [
  { id: 'builtin', label: 'Built-in' },
  { id: 'custom', label: 'Custom' },
]

// ── Helpers ───────────────────────────────────────────────

function TabBar({ tabs, active, onChange, counts }) {
  return (
    <div className="flex gap-1 p-1 bg-background-elevated border border-white/8 rounded-xl">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${active === id
            ? 'bg-background text-white shadow-sm border border-white/10'
            : 'text-text-tertiary hover:text-white hover:bg-white/4'
            }`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" />}
          {label}
          {counts?.[id] !== undefined && (
            <span
              className={`px-1.5 py-0.5 rounded-md text-xs ${active === id
                ? 'bg-brand-teal/20 text-brand-teal'
                : 'bg-white/8 text-text-quaternary'
                }`}
            >
              {counts[id]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Metrics tab ───────────────────────────────────────────

function MetricsTab({ metrics, isLoading, onCreate, onEdit, onDelete }) {
  const [deleteDialog, setDeleteDialog] = useState({ open: false, metric: null })
  const [deleting, setDeleting] = useState(false)
  const [activeMetricTab, setActiveMetricTab] = useState('builtin')

  const builtin = metrics.filter((m) => m.is_builtin)
  const custom = metrics.filter((m) => !m.is_builtin)

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(deleteDialog.metric.id)
    } finally {
      setDeleting(false)
      setDeleteDialog({ open: false, metric: null })
    }
  }

  if (isLoading) return <div className="py-16 flex justify-center"><LoadingSpinner /></div>

  const metricCounts = { builtin: builtin.length, custom: custom.length }

  return (
    <div className="space-y-6">
      {/* Sub-tab bar */}
      <TabBar
        tabs={METRIC_TABS}
        active={activeMetricTab}
        onChange={setActiveMetricTab}
        counts={metricCounts}
      />

      {/* Built-in tab */}
      {activeMetricTab === 'builtin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {builtin.map((m) => (
            <MetricCard
              key={m.id}
              metric={m}
              onEdit={() => onEdit(m)}
              onDelete={() => setDeleteDialog({ open: true, metric: m })}
              readOnly
            />
          ))}
          {builtin.length === 0 && (
            <p className="text-sm text-text-tertiary col-span-3 py-10 text-center">
              No built-in metrics found.
            </p>
          )}
        </div>
      )}

      {/* Custom tab */}
      {activeMetricTab === 'custom' && (
        <div>
          <p className="text-sm text-text-tertiary mb-5">
            LLM-as-judge metrics — define a scoring prompt and the evaluator model will return a numeric score for each answer.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {custom.map((m) => (
              <MetricCard
                key={m.id}
                metric={m}
                onEdit={() => onEdit(m)}
                onDelete={() => setDeleteDialog({ open: true, metric: m })}
              />
            ))}
            {/* Create card */}
            <button
              onClick={onCreate}
              className="group border-2 border-dashed border-white/8 hover:border-brand-teal/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-text-quaternary hover:text-brand-teal transition-all duration-200 min-h-[180px]"
            >
              <div className="p-3 rounded-xl border border-current/30 group-hover:bg-brand-teal/8 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="text-sm font-medium">Add Custom Metric</span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, metric: null })}
        onConfirm={confirmDelete}
        title="Delete Metric"
        message={`Delete "${deleteDialog.metric?.name}"? This cannot be undone and may affect existing evaluations.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

function MetricCard({ metric, onEdit, onDelete, readOnly }) {
  return (
    <Card className="p-5 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl border ${metric.is_builtin
          ? 'bg-brand-teal/8 border-brand-teal/20'
          : 'bg-violet-500/8 border-violet-500/20'
          }`}>
          <Zap className={`w-4 h-4 ${metric.is_builtin ? 'text-brand-teal' : 'text-violet-400'}`} />
        </div>
        {!readOnly && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg hover:bg-white/8 text-text-quaternary hover:text-white transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-quaternary hover:text-red-400 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <h3 className="font-semibold text-white mb-1">{metric.name}</h3>
      {metric.description && (
        <p className="text-xs text-text-tertiary mb-3 line-clamp-2">{metric.description}</p>
      )}
      {metric.prompt_template && (
        <p className="text-xs text-text-quaternary font-mono leading-relaxed line-clamp-3 mb-3">
          {metric.prompt_template}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <span className="px-2 py-0.5 rounded-md text-xs bg-background-elevated text-text-quaternary font-mono border border-white/8">
          {metric.scale_min}–{metric.scale_max}
        </span>
        {metric.requires_context && (
          <span className="px-2 py-0.5 rounded-md text-xs bg-amber-500/8 text-amber-400 border border-amber-500/15">
            needs context
          </span>
        )}
        {metric.requires_ground_truth && (
          <span className="px-2 py-0.5 rounded-md text-xs bg-sky-500/8 text-sky-400 border border-sky-500/15">
            needs GT
          </span>
        )}
        {metric.is_builtin && (
          <span className="px-2 py-0.5 rounded-md text-xs bg-brand-teal/8 text-brand-teal border border-brand-teal/15">
            built-in
          </span>
        )}
      </div>
    </Card>
  )
}

// ── Datasets tab ──────────────────────────────────────────

function DatasetsTab({ datasets, isLoading, onCreate, onEdit, onDelete }) {
  const [deleteDialog, setDeleteDialog] = useState({ open: false, dataset: null })
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(deleteDialog.dataset._id || deleteDialog.dataset.id)
    } finally {
      setDeleting(false)
      setDeleteDialog({ open: false, dataset: null })
    }
  }

  if (isLoading) return <div className="py-16 flex justify-center"><LoadingSpinner /></div>

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {datasets.map((d) => {
          const id = d._id || d.id
          return (
            <Card key={id} className="p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-brand-teal/8 border border-brand-teal/20">
                  <FileText className="w-4 h-4 text-brand-teal" />
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(d)}
                    className="p-1.5 rounded-lg hover:bg-white/8 text-text-quaternary hover:text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteDialog({ open: true, dataset: d })}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-quaternary hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-white mb-1 group-hover:text-brand-teal transition-colors">
                {d.name || d.dataset_name}
              </h3>
              <div className="flex items-center gap-3 text-xs text-text-quaternary mt-2">
                <span className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  {d.num_pairs || d.qa_pairs?.length || 0} pairs
                </span>
                {d.generated_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(d.generated_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Card>
          )
        })}

        {/* Create card */}
        <button
          onClick={onCreate}
          className="group border-2 border-dashed border-white/8 hover:border-brand-teal/30 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 text-text-quaternary hover:text-brand-teal transition-all duration-200 min-h-[160px]"
        >
          <div className="p-3 rounded-xl border border-current/30 group-hover:bg-brand-teal/8 transition-colors">
            <Plus className="w-6 h-6" />
          </div>
          <span className="text-sm font-medium">Create Dataset</span>
        </button>
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, dataset: null })}
        onConfirm={confirmDelete}
        title="Delete Dataset"
        message={`Delete "${deleteDialog.dataset?.name || deleteDialog.dataset?.dataset_name}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

// ── Evaluations tab ───────────────────────────────────────

function EvaluationsTab({ evaluations, metrics, onRunNew, onViewResult, isLoading }) {
  if (isLoading) return <div className="py-16 flex justify-center"><LoadingSpinner /></div>

  return (
    <div>
      {/* Count label only — no extra Run button */}
      <div className="mb-6">
        <p className="text-sm text-text-tertiary">
          {evaluations.length} evaluation run{evaluations.length !== 1 ? 's' : ''}
        </p>
      </div>

      {evaluations.length === 0 ? (
        <Card className="py-20">
          <div className="flex flex-col items-center justify-center gap-4 text-center">
            <div className="p-4 rounded-2xl bg-background-elevated border border-white/8">
              <BarChart3 className="w-8 h-8 text-text-quaternary" />
            </div>
            <div>
              <p className="text-white font-medium mb-1">No evaluations yet</p>
              <p className="text-sm text-text-tertiary">
                Run your first evaluation to see results here
              </p>
            </div>
            <Button variant="secondary" icon={Play} onClick={onRunNew}>
              Run Evaluation
            </Button>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="divide-y divide-white/5">
            {evaluations.map((ev) => {
              const summaryEntries = Object.entries(ev.summary || {})
              return (
                <button
                  key={ev.id}
                  onClick={() => onViewResult(ev)}
                  className="w-full flex items-center gap-6 px-6 py-4 hover:bg-white/[0.02] transition-colors text-left group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-medium text-white text-sm group-hover:text-brand-teal transition-colors">
                        {ev.assistant_name}
                      </span>
                      {ev.dataset_name && (
                        <>
                          <span className="text-text-quaternary">·</span>
                          <span className="text-sm text-text-tertiary">{ev.dataset_name}</span>
                        </>
                      )}
                    </div>
                    <p className="text-xs text-text-quaternary">
                      {new Date(ev.created_at).toLocaleString()} · {ev.eval_llm_model}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {summaryEntries.map(([name, value]) => {
                      const m = metrics.find((m) => m.name === name)
                      const min = m?.scale_min ?? 0
                      const max = m?.scale_max ?? 1
                      const pct = (value - min) / (max - min)
                      const color =
                        pct >= 0.8 ? '#34d399' : pct >= 0.6 ? '#fbbf24' : '#f87171'
                      return (
                        <span
                          key={name}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{ background: color + '1a', color }}
                        >
                          <span className="opacity-60 font-normal">{name}</span>
                          {max <= 1
                            ? `${Math.round(pct * 100)}%`
                            : value.toFixed(1)}
                        </span>
                      )
                    })}
                  </div>
                  <svg
                    className="w-4 h-4 text-text-quaternary group-hover:text-text-tertiary flex-shrink-0 transition-colors"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────

export default function EvaluationPage() {
  const queryClient = useQueryClient()
  const invalidateDatasets = () => queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() })
  const invalidateEvaluations = () => queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() })

  // Data
  const { data: datasetsData, isLoading: datasetsLoading } = useListDatasets()
  const { data: evaluationsData, isLoading: evalsLoading } = useListEvaluations()
  const { assistants } = useAssistants()
  const { metrics, isLoading: metricsLoading, createMetric, updateMetric, deleteMetric } = useMetrics()

  const { mutateAsync: createDatasetMutation } = useCreateDataset({ mutation: { onSuccess: invalidateDatasets } })
  const { mutateAsync: updateDatasetMutation } = useUpdateDataset({ mutation: { onSuccess: invalidateDatasets } })
  const { mutateAsync: deleteDatasetMutation } = useDeleteDataset({ mutation: { onSuccess: invalidateDatasets } })
  const { mutateAsync: evaluateAssistantMutation } = useEvaluateAssistant({
    mutation: { onSuccess: invalidateEvaluations },
  })

  const datasets = datasetsData?.datasets || []
  const evaluations = evaluationsData?.evaluations || []

  // UI state
  const [activeTab, setActiveTab] = useState('evaluations')
  const [viewState, setViewState] = useState('list')   // 'list' | 'create-dataset' | 'edit-dataset' | 'result'
  const [editingDataset, setEditingDataset] = useState(null)
  const [selectedResult, setSelectedResult] = useState(null)
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [metricSaving, setMetricSaving] = useState(false)
  const [showRunPanel, setShowRunPanel] = useState(false)
  const [running, setRunning] = useState(false)
  const [runProgress, setRunProgress] = useState(null)

  const counts = {
    evaluations: evaluations.length,
    datasets: datasets.length,
    metrics: metrics.length,
  }

  // ── Metric handlers ───────────────────────────────────

  const handleSaveMetric = async (data) => {
    setMetricSaving(true)
    try {
      if (editingMetric) {
        await updateMetric(editingMetric.id, data)
      } else {
        await createMetric(data)
      }
      setShowMetricModal(false)
      setEditingMetric(null)
    } catch (err) {
      alert('Error saving metric: ' + (err.response?.data?.detail || err.message))
    } finally {
      setMetricSaving(false)
    }
  }

  const handleDeleteMetric = async (id) => {
    await deleteMetric(id)
  }

  // ── Dataset handlers ──────────────────────────────────

  const handleDatasetSaved = () => {
    setViewState('list')
    setEditingDataset(null)
  }

  const handleDeleteDataset = async (id) => {
    await deleteDatasetMutation({ datasetId: id })
  }

  // ── Evaluation run handler ────────────────────────────

  const handleRun = async (config) => {
    setRunning(true)
    setRunProgress({ label: 'Running evaluation…', current: 0, total: 1 })
    try {
      await evaluateAssistantMutation({
        data: {
          assistant_id: config.assistantId,
          metric_ids: config.metricIds,
          dataset_id: config.useDataset ? undefined : (config.datasetId || undefined),
          inline_questions: config.useDataset
            ? config.inlineQuestions
              .filter((q) => q.question.trim())
              .map((q) => ({ question: q.question, ground_truth: q.ground_truth || undefined }))
            : undefined,
          eval_llm_model: config.evalModel,
          eval_llm_provider: config.evalProvider,
        },
      })
      setActiveTab('evaluations')
    } catch (err) {
      alert('Evaluation failed: ' + (err.response?.data?.detail || err.message))
    } finally {
      setRunning(false)
      setRunProgress(null)
      setShowRunPanel(false)
    }
  }

  // ── Sub-view routing ──────────────────────────────────

  if (viewState === 'create-dataset' || viewState === 'edit-dataset') {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Evaluation" subtitle="Manage and run assistant evaluations" />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <DatasetCreator
            dataset={editingDataset}
            onSuccess={handleDatasetSaved}
            onCancel={() => { setViewState('list'); setEditingDataset(null) }}
          />
        </div>
      </div>
    )
  }

  if (viewState === 'result' && selectedResult) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Evaluation" subtitle="Manage and run assistant evaluations" />
        <div className="max-w-7xl mx-auto px-6 py-8">
          <EvaluationResultsView
            evaluation={selectedResult}
            metrics={metrics}
            onBack={() => { setViewState('list'); setSelectedResult(null) }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Evaluation" subtitle="Manage datasets, metrics, and evaluation runs">
        <Button
          variant="primary"
          icon={Play}
          onClick={() => setShowRunPanel(true)}
        >
          Run Evaluation
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab bar */}
        <div className="mb-8">
          <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} counts={counts} />
        </div>

        {/* Tab content */}
        {activeTab === 'evaluations' && (
          <EvaluationsTab
            evaluations={evaluations}
            metrics={metrics}
            isLoading={evalsLoading}
            onRunNew={() => setShowRunPanel(true)}
            onViewResult={(ev) => { setSelectedResult(ev); setViewState('result') }}
          />
        )}

        {activeTab === 'datasets' && (
          <DatasetsTab
            datasets={datasets}
            isLoading={datasetsLoading}
            onCreate={() => { setEditingDataset(null); setViewState('create-dataset') }}
            onEdit={(d) => { setEditingDataset(d); setViewState('edit-dataset') }}
            onDelete={handleDeleteDataset}
          />
        )}

        {activeTab === 'metrics' && (
          <MetricsTab
            metrics={metrics}
            isLoading={metricsLoading}
            onCreate={() => { setEditingMetric(null); setShowMetricModal(true) }}
            onEdit={(m) => { setEditingMetric(m); setShowMetricModal(true) }}
            onDelete={handleDeleteMetric}
          />
        )}
      </div>

      {/* Metric modal */}
      {showMetricModal && (
        <MetricFormModal
          metric={editingMetric}
          onSave={handleSaveMetric}
          onClose={() => { setShowMetricModal(false); setEditingMetric(null) }}
          saving={metricSaving}
        />
      )}

      {/* Run panel */}
      {showRunPanel && (
        <RunEvaluationPanel
          assistants={assistants}
          datasets={datasets}
          metrics={metrics}
          running={running}
          progress={runProgress}
          onClose={() => setShowRunPanel(false)}
          onRun={handleRun}
        />
      )}
    </div>
  )
}

// ── Page header ───────────────────────────────────────────

function PageHeader({ title, subtitle, children }) {
  return (
    <div className="border-b border-white/5 bg-background-elevated/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-transparent border border-border-default">
              <BarChart3 className="w-5 h-5 text-brand-teal" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white">{title}</h1>
              <p className="text-xs text-text-tertiary mt-0.5">{subtitle}</p>
            </div>
          </div>
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      </div>
    </div>
  )
}