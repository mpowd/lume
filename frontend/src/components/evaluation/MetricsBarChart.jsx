import React from 'react'
import { Trophy, TrendingUp } from 'lucide-react'

const MetricsBarChart = ({ evaluations, assistants, metric }) => {
  if (!metric || evaluations.length === 0) return null

  // Sort evaluations by score for this metric (descending)
  const sortedEvaluations = [...evaluations].sort((a, b) => {
    const scoreA = a.metrics?.[metric.key] || 0
    const scoreB = b.metrics?.[metric.key] || 0
    return scoreB - scoreA
  })

  const maxScore = Math.max(...sortedEvaluations.map(e => e.metrics?.[metric.key] || 0))
  const minScore = Math.min(...sortedEvaluations.map(e => e.metrics?.[metric.key] || 0))
  const avgScore = sortedEvaluations.reduce((sum, e) => sum + (e.metrics?.[metric.key] || 0), 0) / sortedEvaluations.length

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-600">Best:</span>
          <span className="font-semibold" style={{ color: metric.color }}>
            {maxScore.toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-500" />
          <span className="text-gray-600">Average:</span>
          <span className="font-semibold text-gray-700">
            {avgScore.toFixed(3)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-600">Range:</span>
          <span className="font-semibold text-gray-700">
            {minScore.toFixed(3)} - {maxScore.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="space-y-3">
        {sortedEvaluations.map((evaluation, index) => {
          const score = evaluation.metrics?.[metric.key] || 0
          const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0
          const isTop = index === 0
          const assistantName = assistants[evaluation.assistant_id] || 'Unknown Assistant'

          return (
            <div
              key={evaluation._id || index}
              className={`group relative ${isTop ? 'bg-yellow-50 p-3 rounded-lg -mx-3' : ''}`}
            >
              {isTop && (
                <Trophy className="absolute -left-1 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
              )}
              
              <div className="flex items-center gap-4">
                {/* Rank */}
                <div className={`w-8 text-center font-bold ${
                  isTop ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  #{index + 1}
                </div>

                {/* Assistant name */}
                <div className="w-48 flex-shrink-0">
                  <div className="font-medium text-gray-900 truncate">
                    {assistantName}
                  </div>
                  <div className="text-xs text-gray-500">
                    {evaluation.eval_llm_provider} / {evaluation.eval_llm_model}
                  </div>
                </div>

                {/* Bar */}
                <div className="flex-1 relative h-10">
                  <div className="absolute inset-0 bg-gray-100 rounded-md overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 ease-out relative overflow-hidden"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: metric.color,
                        opacity: isTop ? 1 : 0.7
                      }}
                    >
                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-20 animate-shimmer" />
                    </div>
                  </div>
                  
                  {/* Score label */}
                  <div className="absolute inset-0 flex items-center justify-end px-3">
                    <span className={`font-bold text-sm ${
                      percentage > 50 ? 'text-white' : 'text-gray-700'
                    }`}>
                      {score.toFixed(3)}
                    </span>
                  </div>
                </div>

                {/* Percentage */}
                <div className="w-16 text-right text-sm font-medium text-gray-600">
                  {percentage.toFixed(1)}%
                </div>
              </div>

              {/* Hover effect */}
              <div className="absolute inset-0 bg-blue-50 opacity-0 group-hover:opacity-10 transition-opacity rounded-lg pointer-events-none" />
            </div>
          )
        })}
      </div>

      {/* Performance distribution visualization */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h5 className="text-sm font-semibold text-gray-700 mb-3">Score Distribution</h5>
        <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
          {sortedEvaluations.map((evaluation, index) => {
            const score = evaluation.metrics?.[metric.key] || 0
            const position = (score / 1.0) * 100 // Assuming max score is 1.0
            
            return (
              <div
                key={evaluation._id || index}
                className="absolute w-3 h-3 rounded-full -mt-0.5 transform -translate-x-1/2 border-2 border-white shadow-md"
                style={{
                  left: `${position}%`,
                  backgroundColor: metric.color,
                  opacity: index === 0 ? 1 : 0.6
                }}
                title={`${assistants[evaluation.assistant_id]}: ${score.toFixed(3)}`}
              />
            )
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0.0</span>
          <span>0.5</span>
          <span>1.0</span>
        </div>
      </div>
    </div>
  )
}

// Add shimmer animation to your CSS
const style = document.createElement('style')
style.textContent = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }
  .animate-shimmer {
    animation: shimmer 2s infinite;
  }
`
document.head.appendChild(style)

export default MetricsBarChart