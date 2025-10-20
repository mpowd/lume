import { useState } from 'react'
import { evaluationAPI, chatAPI } from '../services/api'

export const useEvaluation = () => {
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)
  const [error, setError] = useState(null)

  const evaluateAssistants = async (dataset, assistantIds) => {
    if (!dataset || assistantIds.length === 0) {
      return { success: false, error: 'Missing dataset or assistants' }
    }

    setEvaluating(true)
    setEvalProgress(0)
    setError(null)

    try {
      const qaPairs = dataset.qa_pairs
      const totalEvals = assistantIds.length
      
      for (let assistantIdx = 0; assistantIdx < assistantIds.length; assistantIdx++) {
        const assistantId = assistantIds[assistantIdx]
        const questions = []
        const groundTruths = []
        const answers = []
        const contexts = []

        for (let i = 0; i < qaPairs.length; i++) {
          const pair = qaPairs[i]
          const progress = ((assistantIdx / totalEvals) + ((i / qaPairs.length) / totalEvals)) * 100
          setEvalProgress(Math.round(progress * 0.8))

          try {
            const response = await chatAPI.sendMessage(assistantId, pair.question, [])
            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push(response.response || '')
            contexts.push(response.contexts || [])
          } catch (error) {
            console.error(`Error processing question ${i + 1}:`, error)
            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push('')
            contexts.push([])
          }
        }

        setEvalProgress(Math.round(((assistantIdx + 0.9) / totalEvals) * 80))

        await evaluationAPI.evaluateAssistant(
          dataset.name,
          assistantId,
          questions,
          groundTruths,
          answers,
          contexts
        )
      }

      setEvalProgress(100)
      return { success: true, count: assistantIds.length }
    } catch (err) {
      console.error('Error during evaluation:', err)
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setTimeout(() => {
        setEvaluating(false)
        setEvalProgress(0)
      }, 2000)
    }
  }

  const reset = () => {
    setEvaluating(false)
    setEvalProgress(0)
    setError(null)
  }

  return {
    evaluating,
    evalProgress,
    error,
    evaluateAssistants,
    reset
  }
}