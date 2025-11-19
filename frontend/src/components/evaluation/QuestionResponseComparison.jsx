import { useState } from 'react'
import { MessageSquare, ChevronLeft, ChevronRight, Trophy } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import { getAssistantColor, getAssistantConfigId, getAssistantConfigSummary } from '../../utils/assistantUtils'

export default function QuestionResponseComparison({ dataset, evaluations, assistants, metrics }) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const questions = dataset.qa_pairs || []
  
  if (questions.length === 0) {
    return (
      <Card>
        <div className="p-16 text-center text-slate-400">
          No questions available in this dataset
        </div>
      </Card>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  // Get responses for current question from all evaluated assistants
  const getResponsesForQuestion = () => {
    return evaluations.map((evaluation, index) => {
      const detailedResult = evaluation.detailed_results?.[currentQuestionIndex]
      
      // Try multiple possible field names for the response
      let response = 'Response not available'
      if (detailedResult) {
        response = detailedResult.answer || 
                   detailedResult.response || 
                   detailedResult.generated_response ||
                   'Response not available'
      }
      
      return {
        assistantId: evaluation.assistant_id,
        assistant: assistants[evaluation.assistant_id],
        response: response,
        contexts: detailedResult?.contexts || detailedResult?.retrieved_contexts || [],
        metrics: detailedResult ? {
          answer_relevancy: detailedResult.answer_relevancy,
          faithfulness: detailedResult.faithfulness,
          context_recall: detailedResult.context_recall,
          context_precision: detailedResult.context_precision
        } : null,
        evaluation: evaluation,
        index: index  // Keep track of the index for consistent coloring
      }
    })
  }

  const responses = getResponsesForQuestion()

  // Find best response for this question
  const getBestResponse = () => {
    if (responses.length === 0) return null
    return responses.reduce((best, current) => {
      if (!current.metrics || !best.metrics) return best
      
      // Only include metrics that are available in the metrics prop
      const availableMetricKeys = metrics.map(m => m.key)
      const currentValues = availableMetricKeys
        .map(key => current.metrics[key])
        .filter(v => v !== undefined && v !== null)
      const bestValues = availableMetricKeys
        .map(key => best.metrics[key])
        .filter(v => v !== undefined && v !== null)
      
      if (currentValues.length === 0) return best
      if (bestValues.length === 0) return current
      
      const currentAvg = currentValues.reduce((sum, v) => sum + v, 0) / currentValues.length
      const bestAvg = bestValues.reduce((sum, v) => sum + v, 0) / bestValues.length
      
      return currentAvg > bestAvg ? current : best
    })
  }

  const bestResponse = getBestResponse()

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-400 bg-green-500/10'
    if (score >= 0.6) return 'text-blue-400 bg-blue-500/10'
    if (score >= 0.4) return 'text-yellow-400 bg-yellow-500/10'
    return 'text-red-400 bg-red-500/10'
  }

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Assistant Legend */}
      <Card>
        <div className="p-5">
          <div className="text-sm font-semibold text-slate-300 mb-4">Assistants Being Compared</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {responses.map((response) => {
              const color = getAssistantColor(response.assistantId, response.index)
              const configId = getAssistantConfigId(response.assistant)
              const configSummary = getAssistantConfigSummary(response.assistant)
              
              return (
                <div
                  key={`${response.assistantId}-${response.index}`}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 ${color.border} bg-slate-900/50`}
                >
                  <div className={`w-9 h-9 rounded-lg ${color.badge} border ${color.border} flex items-center justify-center flex-shrink-0`}>
                    <span className={`${color.text} font-bold`}>{response.index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`font-semibold ${color.text} truncate`}>
                      {response.assistant?.name || 'Unknown'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate" title={configId}>
                      {configId}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Navigation Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-brand-teal" />
              <div>
                <h3 className="text-xl font-bold text-white">Question {currentQuestionIndex + 1} of {questions.length}</h3>
                <p className="text-sm text-slate-400 mt-0.5">Compare responses from each assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                icon={ChevronLeft}
              >
                Previous
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNext}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Question Progress */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-brand-teal transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>
      </Card>

      {/* Question Card */}
      <Card>
        <div className="p-6 space-y-4">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Question
            </div>
            <p className="text-lg text-white font-medium leading-relaxed">
              {currentQuestion.question}
            </p>
          </div>

          <div className="pt-4 border-t border-white/10">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Ground Truth Answer
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {currentQuestion.ground_truth || currentQuestion.answer}
            </p>
          </div>
        </div>
      </Card>

      {/* Responses Comparison */}
      <div className="space-y-4">
        {responses.map((response) => {
          const isBest = bestResponse && response.assistantId === bestResponse.assistantId && response.index === bestResponse.index
          const color = getAssistantColor(response.assistantId, response.index)
          const configSummary = getAssistantConfigSummary(response.assistant)
          
          // Calculate average score only from available metrics
          const availableMetricKeys = metrics.map(m => m.key)
          const metricValues = response.metrics 
            ? availableMetricKeys
                .map(key => response.metrics[key])
                .filter(v => v !== undefined && v !== null)
            : []
          
          const avgScore = metricValues.length > 0
            ? metricValues.reduce((sum, v) => sum + v, 0) / metricValues.length
            : 0

          return (
            <Card
              key={`${response.assistantId}-${response.index}`}
              className={`relative overflow-hidden border-2 ${color.border} ${isBest ? 'ring-2 ring-yellow-500/50' : ''} bg-slate-950/50`}
            >
              {isBest && (
                <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-500 to-amber-600 text-white px-4 py-1.5 rounded-bl-xl text-xs font-bold flex items-center gap-1 z-10">
                  <Trophy className="w-3.5 h-3.5" />
                  BEST FOR THIS QUESTION
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Assistant Header */}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-lg ${color.badge} border-2 ${color.border} flex items-center justify-center flex-shrink-0`}>
                    <span className={`${color.text} font-bold text-xl`}>{response.index + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h4 className={`text-xl font-semibold ${color.text}`}>
                        {response.assistant?.name || 'Unknown Assistant'}
                      </h4>
                      {response.metrics && metricValues.length > 0 && (
                        <Badge variant={avgScore >= 0.8 ? 'green' : avgScore >= 0.6 ? 'blue' : 'gray'}>
                          {(avgScore * 100).toFixed(0)}% avg
                        </Badge>
                      )}
                    </div>
                    
                    {/* Config ID */}
                    <div className={`text-sm font-mono ${color.text} opacity-80 mb-3`}>
                      {getAssistantConfigId(response.assistant)}
                    </div>
                    
                    {/* Key Config Params */}
                    <div className="flex gap-2 flex-wrap">
                      {configSummary.slice(0, 4).map((item, idx) => (
                        <div key={idx} className="text-xs bg-slate-800/50 rounded px-2 py-1 text-slate-300">
                          {item.icon} <span className="text-slate-500">{item.label}:</span> <span className="text-white">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Response Text */}
                <div className="pt-4 border-t border-white/10">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Generated Response
                  </div>
                  <div className="prose prose-invert prose-sm max-w-none">
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {response.response}
                    </p>
                  </div>
                </div>

                {/* Metrics for this question - only show metrics that are in the metrics prop */}
                {response.metrics && metricValues.length > 0 && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                      Performance Metrics
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {metrics.map(metric => {
                        const score = response.metrics[metric.key]
                        if (score === undefined || score === null) return null
                        
                        return (
                          <div key={metric.key} className="text-center p-3 rounded-lg bg-slate-900/50 border border-white/5">
                            <div className={`text-2xl font-bold mb-1 px-2 py-1 rounded ${getScoreColor(score)}`}>
                              {(score * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-400 mt-1">{metric.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Retrieved Contexts (if available) */}
                {response.contexts && response.contexts.length > 0 && (
                  <details className="pt-4 border-t border-white/10 group">
                    <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-300 transition-colors flex items-center gap-2">
                      <span>📚 Retrieved Contexts ({response.contexts.length})</span>
                      <span className="text-slate-600 group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                      {response.contexts.map((context, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                          <div className="text-xs text-slate-500 mb-1 font-medium">Context {idx + 1}</div>
                          <p className="text-sm text-slate-300 leading-relaxed">
                            {context}
                          </p>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </Card>
          )
        })}
      </div>

      {/* Quick Jump */}
      <Card>
        <div className="p-4">
          <div className="text-sm font-semibold text-slate-400 mb-3">Quick Jump to Question</div>
          <div className="flex flex-wrap gap-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                  idx === currentQuestionIndex
                    ? 'bg-brand-teal text-white shadow-lg scale-110'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}