import { Trophy, TrendingUp, Target, Zap, Settings } from 'lucide-react'
import Card from '../shared/Card'
import Badge from '../shared/Badge'
import { getAssistantColor, getAssistantConfigSummary, getAssistantConfigId } from '../../utils/assistantUtils'

export default function OverallSummary({ evaluations, assistants, metrics, dataset }) {

  console.log('=== DEBUG: Evaluation Data ===')
  console.log('Evaluations:', evaluations)
  console.log('Assistants map:', assistants)
  if (evaluations.length > 0) {
    console.log('First evaluation structure:', evaluations[0])
    console.log('First evaluation assistant_id:', evaluations[0].assistant_id)
    console.log('Assistant from map:', assistants[evaluations[0].assistant_id])
  }
  console.log('=========================')
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
    const scores = evaluations.map((evaluation, index) => {
      const avgScore = metrics.reduce((sum, m) => sum + (evaluation.metrics?.[m.key] || 0), 0) / metrics.length
      return {
        assistantId: evaluation.assistant_id,
        score: avgScore,
        evaluation,
        index
      }
    })
    scores.sort((a, b) => b.score - a.score)
    return scores[0]
  }

  // Get metric winners
  const getMetricWinner = (metricKey) => {
    let best = null
    let bestIndex = 0
    
    evaluations.forEach((evaluation, index) => {
      const score = evaluation.metrics?.[metricKey] || 0
      if (!best || score > (best.metrics?.[metricKey] || 0)) {
        best = evaluation
        bestIndex = index
      }
    })
    
    return {
      assistantId: best.assistant_id,
      score: best.metrics?.[metricKey] || 0,
      index: bestIndex
    }
  }

  const winner = getOverallWinner()
  const winnerColor = getAssistantColor(winner.assistantId, winner.index)

  return (
    <div className="space-y-6">
      {/* Assistant Configuration Legend */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-400" />
            Assistant Configurations Being Compared
          </h3>
          <div className="space-y-3">
            {evaluations.map((evaluation, index) => {
              const assistant = assistants[evaluation.assistant_id]
              const color = getAssistantColor(evaluation.assistant_id, index)
              const configSummary = getAssistantConfigSummary(assistant)
              const configId = getAssistantConfigId(assistant)
              
              return (
                <div
                  key={`${evaluation.assistant_id}-${index}`}
                  className={`p-5 rounded-xl border-2 ${color.border} bg-slate-900/50`}
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className={`w-10 h-10 rounded-lg ${color.badge} border-2 ${color.border} flex items-center justify-center flex-shrink-0`}>
                      <span className={`${color.text} font-bold text-lg`}>{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className={`text-lg font-semibold ${color.text}`}>
                          {assistant?.name || 'Unknown Assistant'}
                        </h4>
                      </div>
                      <div className={`text-sm ${color.text} opacity-80 font-mono mb-3`}>
                        {configId}
                      </div>
                      
                      {/* Configuration Details */}
                      {configSummary.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {configSummary.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm bg-slate-800/50 rounded-lg p-2.5">
                              <span className="text-lg flex-shrink-0">{item.icon}</span>
                              <div className="min-w-0 flex-1">
                                <div className="text-slate-400 text-xs">{item.label}</div>
                                <div className="text-white font-medium truncate" title={item.value}>
                                  {item.value}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-slate-500 text-sm">No configuration details available</div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Overall Winner */}
      <Card className="overflow-hidden">
        <div className={`border-b border-white/10 p-6 bg-gradient-to-r ${winnerColor.bg}`}>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl ${winnerColor.badge} border-2 ${winnerColor.border} flex items-center justify-center shadow-lg`}>
              <Trophy className={`w-8 h-8 ${winnerColor.text}`} />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-yellow-400 uppercase tracking-wide mb-1">
                Overall Best Performer
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {assistants[winner.assistantId]?.name || 'Unknown'}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="yellow">
                  Average Score: {(winner.score * 100).toFixed(1)}%
                </Badge>
                <div className={`px-3 py-1 rounded-lg ${winnerColor.badge} border ${winnerColor.border} text-sm font-medium`}>
                  {getAssistantConfigId(assistants[winner.assistantId])}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-950/30">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metrics.map(metric => {
              const score = winner.evaluation.metrics?.[metric.key] || 0
              return (
                <div key={metric.key} className="text-center p-4 rounded-lg bg-slate-900/50">
                  <div className="text-3xl font-bold mb-1" style={{ color: metric.color }}>
                    {(score * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400">{metric.label}</div>
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
              const color = getAssistantColor(metricWinner.assistantId, metricWinner.index)
              
              return (
                <div
                  key={metric.key}
                  className={`p-5 rounded-xl border-2 ${color.border} bg-slate-950/30 hover:bg-slate-900/50 transition-all`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-semibold text-slate-300">{metric.label}</div>
                    <div className="text-2xl font-bold" style={{ color: metric.color }}>
                      {(metricWinner.score * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-8 h-8 rounded-lg ${color.badge} border ${color.border} flex items-center justify-center`}>
                      <span className={`${color.text} font-bold text-sm`}>{metricWinner.index + 1}</span>
                    </div>
                    <span className={`text-lg font-semibold ${color.text}`}>
                      {assistant?.name || 'Unknown'}
                    </span>
                  </div>
                  <div className={`text-xs font-mono ${color.text} opacity-70`}>
                    {getAssistantConfigId(assistant)}
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
            All Assistants Ranked by Performance
          </h3>
          <div className="space-y-4">
            {evaluations
              .map((evaluation, index) => ({
                evaluation,
                index,
                avgScore: metrics.reduce((sum, m) => sum + (evaluation.metrics?.[m.key] || 0), 0) / metrics.length
              }))
              .sort((a, b) => b.avgScore - a.avgScore)
              .map((item, rankIndex) => {
                const { evaluation, index, avgScore } = item
                const assistant = assistants[evaluation.assistant_id]
                const color = getAssistantColor(evaluation.assistant_id, index)
                const configSummary = getAssistantConfigSummary(assistant)
                
                return (
                  <div
                    key={`${evaluation._id}-${index}`}
                    className={`p-6 rounded-xl border-2 ${color.border} bg-slate-950/30 hover:bg-slate-900/50 transition-all`}
                  >
                    <div className="flex items-start gap-4 mb-5">
                      <div className={`text-3xl font-bold ${
                        rankIndex === 0 ? 'text-yellow-500' :
                        rankIndex === 1 ? 'text-slate-400' :
                        rankIndex === 2 ? 'text-amber-700' :
                        'text-slate-600'
                      }`}>
                        #{rankIndex + 1}
                      </div>
                      <div className={`w-10 h-10 rounded-lg ${color.badge} border-2 ${color.border} flex items-center justify-center flex-shrink-0`}>
                        <span className={`${color.text} font-bold text-lg`}>{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className={`text-xl font-semibold ${color.text}`}>
                            {assistant?.name || 'Unknown'}
                          </h4>
                          <Badge variant="gray">
                            {(avgScore * 100).toFixed(1)}% avg
                          </Badge>
                        </div>
                        <div className={`text-sm font-mono ${color.text} opacity-80 mb-3`}>
                          {getAssistantConfigId(assistant)}
                        </div>
                        
                        {/* Key Config Params */}
                        <div className="flex gap-2 flex-wrap">
                          {configSummary.slice(0, 6).map((item, idx) => (
                            <div key={idx} className="text-xs bg-slate-800/50 rounded px-2 py-1 text-slate-300">
                              {item.icon} <span className="text-slate-500">{item.label}:</span> {item.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Metric Breakdown */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-white/5">
                      {metrics.map(metric => {
                        const score = evaluation.metrics?.[metric.key] || 0
                        const metricWinner = getMetricWinner(metric.key)
                        const isHighest = metricWinner.assistantId === evaluation.assistant_id && metricWinner.index === index
                        
                        return (
                          <div key={metric.key} className="text-center p-3 rounded-lg bg-slate-900/50">
                            <div className={`text-xl font-bold mb-1 ${isHighest ? 'flex items-center justify-center gap-1' : ''}`}>
                              {isHighest && <Zap className={`w-4 h-4 ${color.text}`} />}
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