import { useState, useMemo } from 'react'
import { ArrowLeft, Grid, BarChart3, Activity, MessageSquare, TrendingUp, Zap } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import PerformanceHeatmap from './PerformanceHeatmap'
import MetricScatterPlot from './MetricScatterPlot'
import WinLossMatrix from './WinLossMatrix'
import QuestionResponseComparison from './QuestionResponseComparison'
import OverallSummary from './OverallSummary'

const VISUALIZATIONS = [
  { id: 'summary', label: 'Overview', icon: Grid, description: 'Quick performance summary' },
  { id: 'heatmap', label: 'Heatmap', icon: Activity, description: 'All metrics at a glance' },
  { id: 'scatter', label: 'Scatter Plot', icon: TrendingUp, description: 'Metric correlations' },
  { id: 'winloss', label: 'Win/Loss', icon: Zap, description: 'Head-to-head comparison' },
  { id: 'questions', label: 'Q&A View', icon: MessageSquare, description: 'Response comparison' }
]

export default function EvaluationVisualizations({
  dataset,
  selectedAssistants,
  assistants,
  evaluations,
  allEvaluations,
  onBack,
  onChangeDataset,
  onChangeAssistants
}) {
  const [activeView, setActiveView] = useState('summary')

  // assistants is already a map/object passed from EvaluationWorkflow
  // No need to convert again - just use it directly
  const assistantMap = assistants

  // Get evaluation data for selected assistants
  const assistantEvaluations = evaluations.filter(e =>
    selectedAssistants.includes(e.assistant_id)
  )

  // Determine which metrics are available based on dataset structure
  // Check if dataset has ground truth contexts
  const hasGroundTruthContext = useMemo(() => {
    if (!dataset?.qa_pairs || dataset.qa_pairs.length === 0) return false
    // Check if any QA pair has ground_truth_context
    return dataset.qa_pairs.some(pair => 
      pair.ground_truth_context && 
      (Array.isArray(pair.ground_truth_context) ? pair.ground_truth_context.length > 0 : pair.ground_truth_context)
    )
  }, [dataset])

  // Filter metrics based on what's available
  const metrics = useMemo(() => {
    const allMetrics = [
      { key: 'answer_relevancy', label: 'Answer Relevancy', color: '#3b82f6' },
      { key: 'faithfulness', label: 'Faithfulness', color: '#10b981' },
      { key: 'context_recall', label: 'Context Recall', color: '#f59e0b' },
      { key: 'context_precision', label: 'Context Precision', color: '#8b5cf6' }
    ]

    // Filter out context_recall if there's no ground truth context
    if (!hasGroundTruthContext) {
      return allMetrics.filter(m => m.key !== 'context_recall')
    }

    return allMetrics
  }, [hasGroundTruthContext])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  icon={ArrowLeft}
                >
                  Back
                </Button>
                <div className="h-6 w-px bg-white/10" />
                <h2 className="text-2xl font-bold text-white">Evaluation Results</h2>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-400">
                <button
                  onClick={onChangeDataset}
                  className="hover:text-blue-400 transition-colors"
                >
                  📊 {dataset.name}
                </button>
                <span>•</span>
                <button
                  onClick={onChangeAssistants}
                  className="hover:text-blue-400 transition-colors"
                >
                  🤖 {selectedAssistants.length} assistant{selectedAssistants.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>

          {/* View Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {VISUALIZATIONS.map(viz => {
              const Icon = viz.icon
              const isActive = activeView === viz.id
              
              return (
                <button
                  key={viz.id}
                  onClick={() => setActiveView(viz.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{viz.label}</span>
                </button>
              )
            })}
          </div>

          {/* View Description */}
          <div className="mt-3 text-sm text-slate-400">
            {VISUALIZATIONS.find(v => v.id === activeView)?.description}
          </div>
        </div>
      </Card>

      {/* Visualization Content */}
      <div className="min-h-[600px]">
        {activeView === 'summary' && (
          <OverallSummary
            evaluations={assistantEvaluations}
            assistants={assistantMap}
            metrics={metrics}
            dataset={dataset}
          />
        )}

        {activeView === 'heatmap' && (
          <PerformanceHeatmap
            evaluations={assistantEvaluations}
            assistants={assistantMap}
            metrics={metrics}
          />
        )}

        {activeView === 'scatter' && (
          <MetricScatterPlot
            evaluations={assistantEvaluations}
            assistants={assistantMap}
            metrics={metrics}
          />
        )}

        {activeView === 'winloss' && (
          <WinLossMatrix
            evaluations={assistantEvaluations}
            assistants={assistantMap}
            metrics={metrics}
          />
        )}

        {activeView === 'questions' && (
          <QuestionResponseComparison
            dataset={dataset}
            evaluations={assistantEvaluations}
            assistants={assistantMap}
            metrics={metrics}
          />
        )}
      </div>
    </div>
  )
}