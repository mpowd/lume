import { useState } from 'react'
import { TrendingUp, Calendar, User, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'

const METRIC_INFO = {
  faithfulness: {
    name: 'Faithfulness',
    description: 'How factually accurate the answer is based on the context',
    color: 'from-blue-500 to-cyan-600'
  },
  answer_relevancy: {
    name: 'Answer Relevancy',
    description: 'How relevant the answer is to the question',
    color: 'from-purple-500 to-pink-600'
  },
  context_recall: {
    name: 'Context Recall',
    description: 'How well the retrieved context covers the ground truth',
    color: 'from-emerald-500 to-teal-600'
  },
  context_precision: {
    name: 'Context Precision',
    description: 'How precise and relevant the retrieved context is',
    color: 'from-orange-500 to-red-600'
  }
}

export default function EvaluationResults({ evaluations, compact = false, onBack }) {
  const [expandedEval, setExpandedEval] = useState(null)

  if (evaluations.length === 0) {
    return (
      <Card className="p-16">
        <EmptyState
          icon={TrendingUp}
          title="No Evaluations Yet"
          description="Run your first evaluation to see results here"
        />
      </Card>
    )
  }

  const sortedEvaluations = [...evaluations].sort((a, b) => 
    new Date(b.created_at) - new Date(a.created_at)
  )

  return (
    <div className="space-y-6">
      {!compact && onBack && (
        <Button variant="ghost" onClick={onBack} icon={ArrowLeft}>
          Back to Overview
        </Button>
      )}

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {compact ? 'Recent Evaluations' : 'Evaluation Results'}
        </h2>
        <p className="text-slate-400">
          {compact ? 'Latest 5 evaluations' : `${evaluations.length} total evaluations`}
        </p>
      </div>

      <div className="space-y-4">
        {sortedEvaluations.map((evaluation) => (
          <EvaluationCard
            key={evaluation._id}
            evaluation={evaluation}
            expanded={expandedEval === evaluation._id}
            onToggle={() => setExpandedEval(
              expandedEval === evaluation._id ? null : evaluation._id
            )}
          />
        ))}
      </div>
    </div>
  )
}

function EvaluationCard({ evaluation, expanded, onToggle }) {
  const metrics = evaluation.metrics || {}
  const avgScore = calculateAverageScore(metrics)

  return (
    <Card className="overflow-hidden">
      <div
        className="p-6 cursor-pointer hover:bg-slate-950/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-lg font-semibold text-white">
                {evaluation.dataset_name}
              </h3>
              <ScoreBadge score={avgScore} />
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{evaluation.assistant_name}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(evaluation.created_at).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>

        {/* Metrics Preview */}
        <div className="grid grid-cols-4 gap-3">
          {Object.entries(METRIC_INFO).map(([key, info]) => (
            <div key={key} className="text-center">
              <div className={`text-2xl font-bold bg-gradient-to-r ${info.color} bg-clip-text text-transparent mb-1`}>
                {((metrics[key] || 0) * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-slate-500">{info.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-white/5 p-6 bg-slate-950/30 space-y-6">
          {/* Detailed Metrics */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white mb-3">Detailed Metrics</h4>
            {Object.entries(METRIC_INFO).map(([key, info]) => (
              <MetricBar
                key={key}
                name={info.name}
                description={info.description}
                value={metrics[key] || 0}
                color={info.color}
              />
            ))}
          </div>

          {/* Configuration Info */}
          {evaluation.config && (
            <div className="pt-4 border-t border-white/5">
              <h4 className="text-sm font-semibold text-white mb-3">Configuration</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {evaluation.config.llm_provider && (
                  <div>
                    <span className="text-slate-500">LLM Provider:</span>
                    <span className="text-white ml-2">{evaluation.config.llm_provider}</span>
                  </div>
                )}
                {evaluation.config.llm_model && (
                  <div>
                    <span className="text-slate-500">LLM Model:</span>
                    <span className="text-white ml-2">{evaluation.config.llm_model}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

function MetricBar({ name, description, value, color }) {
  const percentage = value * 100

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-white">{name}</p>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
        <span className={`text-lg font-bold bg-gradient-to-r ${color} bg-clip-text text-transparent`}>
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ScoreBadge({ score }) {
  const getColor = (score) => {
    if (score >= 80) return 'from-emerald-500 to-teal-600'
    if (score >= 60) return 'from-blue-500 to-cyan-600'
    if (score >= 40) return 'from-orange-500 to-red-600'
    return 'from-red-500 to-pink-600'
  }

  return (
    <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${getColor(score)} text-white text-sm font-semibold`}>
      {score}%
    </div>
  )
}

function calculateAverageScore(metrics) {
  const values = [
    metrics.faithfulness || 0,
    metrics.answer_relevancy || 0,
    metrics.context_recall || 0,
    metrics.context_precision || 0
  ]
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length
  return Math.round(avg * 100)
}