import { useState } from 'react'
import { MessageSquare, ChevronLeft, ChevronRight, ThumbsUp, ThumbsDown, Trophy } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import Badge from '../shared/Badge'

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
    return evaluations.map(evaluation => {
      const detailedResult = evaluation.detailed_results?.[currentQuestionIndex]
      return {
        assistantId: evaluation.assistant_id,
        assistant: assistants[evaluation.assistant_id],
        response: detailedResult?.answer || 'Response not available',
        contexts: detailedResult?.contexts || [],
        metrics: detailedResult ? {
          answer_relevancy: detailedResult.answer_relevancy,
          faithfulness: detailedResult.faithfulness,
          context_recall: detailedResult.context_recall,
          context_precision: detailedResult.context_precision
        } : null,
        evaluation: evaluation
      }
    })
  }

  const responses = getResponsesForQuestion()

  // Find best response for this question
  const getBestResponse = () => {
    if (responses.length === 0) return null
    return responses.reduce((best, current) => {
      if (!current.metrics || !best.metrics) return best
      const currentAvg = Object.values(current.metrics).reduce((sum, v) => sum + (v || 0), 0) / Object.keys(current.metrics).length
      const bestAvg = Object.values(best.metrics).reduce((sum, v) => sum + (v || 0), 0) / Object.keys(best.metrics).length
      return currentAvg > bestAvg ? current : best
    })
  }

  const bestResponse = getBestResponse()

  const getScoreColor = (score) => {
    if (score >= 0.8) return 'text-green-500 bg-green-500/10'
    if (score >= 0.6) return 'text-blue-500 bg-blue-500/10'
    if (score >= 0.4) return 'text-yellow-500 bg-yellow-500/10'
    return 'text-red-500 bg-red-500/10'
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
      {/* Navigation Header */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-6 h-6 text-blue-400" />
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
              className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
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
        {responses.map((response, index) => {
          const isBest = bestResponse && response.assistantId === bestResponse.assistantId
          const avgScore = response.metrics 
            ? Object.values(response.metrics).reduce((sum, v) => sum + (v || 0), 0) / Object.keys(response.metrics).length
            : 0

          return (
            <Card
              key={response.assistantId}
              className={`relative overflow-hidden ${isBest ? 'ring-2 ring-yellow-500' : ''}`}
            >
              {isBest && (
                <div className="absolute top-0 right-0 bg-gradient-to-br from-yellow-500 to-amber-600 text-white px-4 py-1 rounded-bl-xl text-xs font-bold flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  BEST RESPONSE
                </div>
              )}

              <div className="p-6 space-y-4">
                {/* Assistant Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="text-lg font-semibold text-white">
                        {response.assistant?.name || 'Unknown Assistant'}
                      </h4>
                      {response.metrics && (
                        <Badge variant={avgScore >= 0.8 ? 'green' : avgScore >= 0.6 ? 'blue' : 'gray'}>
                          {(avgScore * 100).toFixed(0)}% avg
                        </Badge>
                      )}
                    </div>
                    {response.assistant?.config?.llm_model && (
                      <div className="flex gap-2">
                        <Badge variant="gray" size="sm">
                          {response.assistant.config.llm_model}
                        </Badge>
                        {response.assistant.config.llm_provider && (
                          <Badge variant="gray" size="sm">
                            {response.assistant.config.llm_provider}
                          </Badge>
                        )}
                      </div>
                    )}
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

                {/* Metrics for this question */}
                {response.metrics && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {metrics.map(metric => {
                        const score = response.metrics[metric.key]
                        if (score === undefined || score === null) return null
                        
                        return (
                          <div key={metric.key} className="text-center p-3 rounded-lg bg-slate-900/50">
                            <div className={`text-xl font-bold mb-1 px-2 py-1 rounded ${getScoreColor(score)}`}>
                              {(score * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-slate-500">{metric.label}</div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Retrieved Contexts (if available) */}
                {response.contexts && response.contexts.length > 0 && (
                  <details className="pt-4 border-t border-white/10 group">
                    <summary className="text-xs font-semibold text-slate-400 uppercase tracking-wide cursor-pointer hover:text-slate-300 transition-colors">
                      Retrieved Contexts ({response.contexts.length})
                    </summary>
                    <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
                      {response.contexts.map((context, idx) => (
                        <div key={idx} className="p-3 rounded-lg bg-slate-900/50 border border-white/5">
                          <div className="text-xs text-slate-500 mb-1">Context {idx + 1}</div>
                          <p className="text-sm text-slate-400 line-clamp-3">
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
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-110'
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