import { Trophy, TrendingUp, Target, Zap } from 'lucide-react'
import Card from '../shared/Card'
import Badge from '../shared/Badge'

export default function OverallSummary({ evaluations, assistants, metrics, dataset }) {
  // Safety check for empty evaluations
  if (!evaluations || evaluations.length === 0) {
    return (
      <Card>
        <div className="p-16 text-center">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Evaluation Data</h3>
          <p className="text-slate-400">
            Run evaluations on this dataset first to see performance summaries.
          </p>
        </div>
      </Card>
    )
  }

  // Calculate overall winner
  const getOverallWinner = () => {
    const scores = evaluations.map(evaluation => {
      const avgScore = metrics.reduce((sum, m) => sum + (evaluation.metrics?.[m.key] || 0), 0) / metrics.length
      return {
        assistantId: evaluation.assistant_id,
        score: avgScore,
        evaluation
      }
    })
    scores.sort((a, b) => b.score - a.score)
    return scores[0]
  }

  // Get metric winners
  const getMetricWinner = (metricKey) => {
    const best = evaluations.reduce((prev, current) => {
      const prevScore = prev.metrics?.[metricKey] || 0
      const currentScore = current.metrics?.[metricKey] || 0
      return currentScore > prevScore ? current : prev
    })
    return {
      assistantId: best.assistant_id,
      score: best.metrics?.[metricKey] || 0
    }
  }

  const winner = getOverallWinner()

  return (
    <div className="space-y-6">
      {/* Overall Winner */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border-b border-yellow-500/20 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-1">
                Overall Best Performer
              </div>
              <h3 className="text-2xl font-bold text-white">
                {assistants[winner.assistantId]?.name || 'Unknown'}
              </h3>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="yellow">
                  Average Score: {(winner.score * 100).toFixed(1)}%
                </Badge>
                {assistants[winner.assistantId]?.config?.llm_model && (
                  <Badge variant="gray">
                    {assistants[winner.assistantId].config.llm_model}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-950/30">
          <div className="grid grid-cols-4 gap-4">
            {metrics.map(metric => {
              const score = winner.evaluation.metrics?.[metric.key] || 0
              return (
                <div key={metric.key} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: metric.color }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{metric.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Metric-by-Metric Winners */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Best Performance by Metric
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {metrics.map(metric => {
              const metricWinner = getMetricWinner(metric.key)
              const assistant = assistants[metricWinner.assistantId]
              
              return (
                <div
                  key={metric.key}
                  className="p-4 rounded-xl border border-white/10 bg-slate-950/30 hover:bg-slate-900/50 transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-slate-400">{metric.label}</div>
                    <div className="text-xl font-bold" style={{ color: metric.color }}>
                      {(metricWinner.score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-white font-medium">{assistant?.name || 'Unknown'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* All Assistants Performance */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            All Assistants Overview
          </h3>
          <div className="space-y-4">
            {evaluations
              .sort((a, b) => {
                const avgA = metrics.reduce((sum, m) => sum + (a.metrics?.[m.key] || 0), 0) / metrics.length
                const avgB = metrics.reduce((sum, m) => sum + (b.metrics?.[m.key] || 0), 0) / metrics.length
                return avgB - avgA
              })
              .map((evaluation, index) => {
                const assistant = assistants[evaluation.assistant_id]
                const avgScore = metrics.reduce((sum, m) => sum + (evaluation.metrics?.[m.key] || 0), 0) / metrics.length
                
                return (
                  <div
                    key={evaluation._id}
                    className="p-5 rounded-xl border border-white/10 bg-slate-950/30 hover:bg-slate-900/50 transition-all"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`text-2xl font-bold ${
                        index === 0 ? 'text-yellow-500' :
                        index === 1 ? 'text-slate-400' :
                        index === 2 ? 'text-amber-700' :
                        'text-slate-600'
                      }`}>
                        #{index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="text-lg font-semibold text-white">
                            {assistant?.name || 'Unknown'}
                          </h4>
                          <Badge variant="gray">
                            {(avgScore * 100).toFixed(1)}% avg
                          </Badge>
                        </div>
                        {assistant?.description && (
                          <p className="text-sm text-slate-400 line-clamp-1">
                            {assistant.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Metric Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {metrics.map(metric => {
                        const score = evaluation.metrics?.[metric.key] || 0
                        const isHighest = getMetricWinner(metric.key).assistantId === evaluation.assistant_id
                        
                        return (
                          <div key={metric.key} className="text-center">
                            <div className={`text-lg font-bold ${isHighest ? 'flex items-center justify-center gap-1' : ''}`}>
                              {isHighest && <Zap className="w-4 h-4 text-yellow-500" />}
                              <span style={{ color: metric.color }}>
                                {(score * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="text-xs text-slate-500">{metric.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      </Card>

      {/* Dataset Info */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Dataset Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-slate-500 mb-1">Questions</div>
              <div className="text-white font-semibold">{dataset.qa_pairs?.length || 0}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Assistants Compared</div>
              <div className="text-white font-semibold">{evaluations.length}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Dataset Name</div>
              <div className="text-white font-semibold truncate">{dataset.name}</div>
            </div>
            {dataset.source_collection && (
              <div>
                <div className="text-slate-500 mb-1">Source</div>
                <div className="text-white font-semibold truncate">{dataset.source_collection}</div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}