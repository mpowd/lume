import React, { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Calendar } from 'lucide-react'
import Badge from '../shared/Badge'

const EvaluationComparisonTable = ({ evaluations, assistants, metrics }) => {
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState('desc')
  const [expandedRow, setExpandedRow] = useState(null)

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(key)
      setSortOrder('desc')
    }
  }

  const sortedEvaluations = [...evaluations].sort((a, b) => {
    let aValue, bValue

    if (sortBy === 'assistant') {
      aValue = assistants[a.assistant_id] || ''
      bValue = assistants[b.assistant_id] || ''
    } else if (sortBy === 'created_at') {
      aValue = new Date(a.created_at).getTime()
      bValue = new Date(b.created_at).getTime()
    } else if (sortBy === 'average') {
      aValue = metrics.reduce((sum, m) => sum + (a.metrics?.[m.key] || 0), 0) / metrics.length
      bValue = metrics.reduce((sum, m) => sum + (b.metrics?.[m.key] || 0), 0) / metrics.length
    } else {
      aValue = a.metrics?.[sortBy] || 0
      bValue = b.metrics?.[sortBy] || 0
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  const getAverageScore = (evaluation) => {
    const scores = metrics.map(m => evaluation.metrics?.[m.key] || 0)
    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length
    return avg.toFixed(3)
  }

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-600 bg-green-50'
    if (score >= 0.6) return 'text-blue-600 bg-blue-50'
    if (score >= 0.4) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return <div className="w-4 h-4" />
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 border-b-2 border-gray-200">
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('assistant')}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
              >
                Assistant
                <SortIcon column="assistant" />
              </button>
            </th>
            
            {metrics.map(metric => (
              <th key={metric.key} className="px-4 py-3 text-center">
                <button
                  onClick={() => handleSort(metric.key)}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900 mx-auto"
                >
                  <span>{metric.label}</span>
                  <SortIcon column={metric.key} />
                </button>
              </th>
            ))}
            
            <th className="px-4 py-3 text-center">
              <button
                onClick={() => handleSort('average')}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900 mx-auto"
              >
                Average
                <SortIcon column="average" />
              </button>
            </th>
            
            <th className="px-4 py-3 text-left">
              <button
                onClick={() => handleSort('created_at')}
                className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
              >
                Date
                <SortIcon column="created_at" />
              </button>
            </th>
            
            <th className="px-4 py-3"></th>
          </tr>
        </thead>
        
        <tbody>
          {sortedEvaluations.map((evaluation, index) => {
            const isExpanded = expandedRow === evaluation._id
            const avgScore = parseFloat(getAverageScore(evaluation))
            
            return (
              <React.Fragment key={evaluation._id || index}>
                <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      <div className="font-medium text-gray-900">
                        {assistants[evaluation.assistant_id] || 'Unknown'}
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="gray" size="sm">
                          {evaluation.eval_llm_provider}
                        </Badge>
                        <Badge variant="blue" size="sm">
                          {evaluation.eval_llm_model}
                        </Badge>
                      </div>
                    </div>
                  </td>
                  
                  {metrics.map(metric => {
                    const score = evaluation.metrics?.[metric.key]
                    return (
                      <td key={metric.key} className="px-4 py-3 text-center">
                        {score !== undefined && score !== null ? (
                          <span className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${getScoreColor(score)}`}>
                            {score.toFixed(3)}
                          </span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                    )
                  })}
                  
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full font-bold text-sm ${getScoreColor(avgScore)}`}>
                      {avgScore}
                    </span>
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      {new Date(evaluation.created_at).toLocaleDateString()}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : evaluation._id)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                  </td>
                </tr>
                
                {isExpanded && (
                  <tr className="bg-blue-50">
                    <td colSpan={metrics.length + 4} className="px-4 py-4">
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-900 text-sm">Detailed Results</h4>
                        
                        {evaluation.detailed_results && evaluation.detailed_results.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-white">
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
                                  <th className="px-3 py-2 text-left font-medium text-gray-700">Question</th>
                                  {metrics.map(m => (
                                    <th key={m.key} className="px-3 py-2 text-center font-medium text-gray-700">
                                      {m.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {evaluation.detailed_results.map((result, idx) => (
                                  <tr key={idx} className="border-t border-blue-100 bg-white">
                                    <td className="px-3 py-2 text-gray-600">{idx + 1}</td>
                                    <td className="px-3 py-2 max-w-md truncate text-gray-700">
                                      {result.question || 'N/A'}
                                    </td>
                                    {metrics.map(m => (
                                      <td key={m.key} className="px-3 py-2 text-center">
                                        <span className={`inline-block px-2 py-1 rounded ${getScoreColor(result[m.key] || 0)}`}>
                                          {result[m.key]?.toFixed(3) || 'N/A'}
                                        </span>
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">No detailed results available</p>
                        )}
                        
                        <div className="flex gap-4 pt-2">
                          <button className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                            <ExternalLink className="w-4 h-4" />
                            View Full Report
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default EvaluationComparisonTable