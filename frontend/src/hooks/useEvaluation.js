import { useState } from 'react'
import {
  useEvaluateAssistant,
  useListEvaluations,
  useListEvaluationsByDataset,
  getListEvaluationsQueryKey,
} from '../api/generated'
import { executeAssistant } from '../api/generated'
import { useQueryClient } from '@tanstack/react-query'

export const useEvaluation = () => {
  const queryClient = useQueryClient()
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)
  const [error, setError] = useState(null)

  const { mutateAsync: evaluateMutation } = useEvaluateAssistant()

  const evaluateAssistants = async (dataset, assistantIds, evalLLMModel = 'gpt-4o-mini', evalLLMProvider = 'openai') => {
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

        // Execute each question against the assistant
        for (let i = 0; i < qaPairs.length; i++) {
          const pair = qaPairs[i]
          const progress =
            ((assistantIdx / totalEvals) + (i / qaPairs.length / totalEvals)) * 100
          setEvalProgress(Math.round(progress * 0.8))

          try {
            // Use the Orval-generated function directly (not a hook — we're in a loop)
            const result = await executeAssistant(assistantId, {
              input_data: { question: pair.question },
            })

            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push(result.output?.answer || '')
            contexts.push(result.output?.contexts || [])
          } catch (err) {
            console.error(`Error processing question ${i + 1}:`, err)
            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push('')
            contexts.push([])
          }
        }

        setEvalProgress(Math.round(((assistantIdx + 0.9) / totalEvals) * 80))

        // Run RAGAS evaluation via Orval mutation
        await evaluateMutation({
          data: {
            dataset_name: dataset.name,
            assistant_id: assistantId,
            questions,
            ground_truths: groundTruths,
            answers,
            retrieved_contexts: contexts,
            eval_llm_model: evalLLMModel,
            eval_llm_provider: evalLLMProvider,
          },
        })
      }

      setEvalProgress(100)

      // Invalidate evaluations cache so results page shows new data
      queryClient.invalidateQueries({ queryKey: getListEvaluationsQueryKey() })

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
    reset,
  }
}
