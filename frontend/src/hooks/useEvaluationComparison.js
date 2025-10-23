import { useState, useEffect } from 'react'
import { evaluationAPI, assistantsAPI } from '../services/api'

export const useEvaluationComparison = (datasetName) => {
  const [evaluations, setEvaluations] = useState([])
  const [assistants, setAssistants] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEvaluations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await evaluationAPI.getEvaluationsByDataset(datasetName)
      
      if (data.evaluations) {
        setEvaluations(data.evaluations)
        
        // Fetch assistant details
        const assistantIds = [...new Set(data.evaluations.map(e => e.assistant_id))]
        const assistantPromises = assistantIds.map(id => 
          assistantsAPI.getById(id).catch(() => null)
        )
        const assistantData = await Promise.all(assistantPromises)
        
        const assistantMap = {}
        assistantData.forEach(a => {
          if (a) {
            assistantMap[a._id || a.id] = a.name
          }
        })
        setAssistants(assistantMap)
      }
    } catch (err) {
      console.error('Error fetching evaluations:', err)
      setError(err.message || 'Failed to load evaluations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (datasetName) {
      fetchEvaluations()
    }
  }, [datasetName])

  return {
    evaluations,
    assistants,
    loading,
    error,
    refetch: fetchEvaluations
  }
}