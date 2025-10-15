import { useState } from 'react'
import { evaluationAPI, chatAPI } from '../services/api'

export const useEvaluation = () => {
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)
  const [error, setError] = useState(null)

  const evaluateChatbots = async (dataset, chatbotIds) => {
    if (!dataset || chatbotIds.length === 0) {
      return { success: false, error: 'Missing dataset or chatbots' }
    }

    setEvaluating(true)
    setEvalProgress(0)
    setError(null)

    try {
      const qaPairs = dataset.qa_pairs
      const totalEvals = chatbotIds.length
      
      for (let chatbotIdx = 0; chatbotIdx < chatbotIds.length; chatbotIdx++) {
        const chatbotId = chatbotIds[chatbotIdx]
        const questions = []
        const groundTruths = []
        const answers = []
        const contexts = []

        for (let i = 0; i < qaPairs.length; i++) {
          const pair = qaPairs[i]
          const progress = ((chatbotIdx / totalEvals) + ((i / qaPairs.length) / totalEvals)) * 100
          setEvalProgress(Math.round(progress * 0.8))

          try {
            const response = await chatAPI.sendMessage(chatbotId, pair.question, [])
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

        setEvalProgress(Math.round(((chatbotIdx + 0.9) / totalEvals) * 80))

        await evaluationAPI.evaluateChatbot(
          dataset.name,
          chatbotId,
          questions,
          groundTruths,
          answers,
          contexts
        )
      }

      setEvalProgress(100)
      return { success: true, count: chatbotIds.length }
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
    evaluateChatbots,
    reset
  }
}