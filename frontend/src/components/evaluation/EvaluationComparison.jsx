import React, { useState } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import LoadingSpinner from '../shared/LoadingSpinner'
import EmptyState from '../shared/EmptyState'
import Badge from '../shared/Badge'
import MetricsRadarChart from './MetricsRadarChart'
import MetricsBarChart from './MetricsBarChart'
import EvaluationComparisonTable from './EvaluationComparisonTable'
import { useEvaluationComparison } from '../../hooks/useEvaluationComparison'
import { BarChart3, Activity, Table, TrendingUp } from 'lucide-react'

const EvaluationComparison = ({ datasetId, datasetName }) => {
  const { evaluations, assistants, loading, error } = useEvaluationComparison(datasetName)
  const [viewMode, setViewMode] = useState('radar') // 'radar', 'bars', 'table'
  const [selectedMetric, setSelectedMetric] = useState('answer_relevancy')

  const metrics = [
    { key: 'answer_relevancy', label: 'Answer Relevancy', color: '#3b82f6' },
    { key: 'faithfulness', label: 'Faithfulness', color: '#10b981' },
    { key: 'context_recall', label: 'Context Recall', color: '#f59e0b' },
    { key: 'context_precision', label: 'Context Precision', color: '#8b5cf6' }
  ]

  const getBestPerformer = (metricKey) => {
    if (evaluations.length === 0) return null
    
    const best = evaluations.reduce((prev, current) => {
      const prevScore = prev.metrics?.[metricKey] || 0
      const currentScore = current.metrics?.[metricKey] || 0
      return currentScore > prevScore ? current : prev
    })
    
    return {
      assistant: assistants[best.assistant_id] || best.assistant_id,
      score: best.metrics?.[metricKey] || 0
    }
  }

  const getAverageScore = (metricKey) => {
    if (evaluations.length === 0) return 0
    const sum = evaluations.reduce((acc, e) => acc + (e.metrics?.[metricKey] || 0), 0)
    return (sum / evaluations.length).toFixed(3)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (evaluations.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No Evaluations Yet"
        description="Run evaluations on this dataset to see performance comparisons"
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map(metric => {
          const best = getBestPerformer(metric.key)
          return (
            <Card key={metric.key}>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">{metric.label}</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <div className="text-2xl font-bold" style={{ color: metric.color }}>
                  {getAverageScore(metric.key)}
                </div>
                <div className="text-xs text-gray-500">
                  Best: <span className="font-medium text-gray-700">{best?.assistant}</span>
                  <span className="ml-1">({best?.score?.toFixed(3)})</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* View mode selector */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Performance Comparison
        </h3>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'radar' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('radar')}
            className="flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Radar
          </Button>
          <Button
            variant={viewMode === 'bars' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('bars')}
            className="flex items-center gap-2"
          >
            <BarChart3 className="w-4 h-4" />
            Bars
          </Button>
          <Button
            variant={viewMode === 'table' ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="flex items-center gap-2"
          >
            <Table className="w-4 h-4" />
            Table
          </Button>
        </div>
      </div>

      {/* Visualization area */}
      <Card>
        <div className="p-6">
          {viewMode === 'radar' && (
            <MetricsRadarChart
              evaluations={evaluations}
              assistants={assistants}
              metrics={metrics}
            />
          )}
          
          {viewMode === 'bars' && (
            <div className="space-y-4">
              <div className="flex gap-2 flex-wrap">
                {metrics.map(metric => (
                  <button
                    key={metric.key}
                    onClick={() => setSelectedMetric(metric.key)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      selectedMetric === metric.key
                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-500'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {metric.label}
                  </button>
                ))}
              </div>
              <MetricsBarChart
                evaluations={evaluations}
                assistants={assistants}
                metric={metrics.find(m => m.key === selectedMetric)}
              />
            </div>
          )}
          
          {viewMode === 'table' && (
            <EvaluationComparisonTable
              evaluations={evaluations}
              assistants={assistants}
              metrics={metrics}
            />
          )}
        </div>
      </Card>

      {/* Evaluation history */}
      <Card>
        <div className="p-6">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Evaluation History</h4>
          <div className="space-y-3">
            {evaluations.map((evaluation, index) => (
              <div
                key={evaluation._id || index}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">
                      {assistants[evaluation.assistant_id] || 'Unknown Assistant'}
                    </span>
                    <Badge variant="blue">
                      {evaluation.eval_llm_provider} / {evaluation.eval_llm_model}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {new Date(evaluation.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-4">
                  {metrics.map(metric => {
                    const score = evaluation.metrics?.[metric.key]
                    const isHighest = getBestPerformer(metric.key)?.score === score
                    return (
                      <div key={metric.key} className="text-center">
                        <div className={`text-sm font-semibold ${isHighest ? 'text-green-600' : 'text-gray-700'}`}>
                          {score?.toFixed(3) || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">{metric.label}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

export default EvaluationComparison