import { useState, useEffect } from 'react'
import { evaluationAPI } from '../services/api'

export const useDatasets = () => {
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadDatasets = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await evaluationAPI.getDatasets()
      setDatasets(data.datasets || [])
    } catch (err) {
      console.error('Error loading datasets:', err)
      setError('Failed to load datasets')
    } finally {
      setLoading(false)
    }
  }

  const createDataset = async (datasetData) => {
    try {
      await evaluationAPI.createDataset(datasetData)
      await loadDatasets()
      return { success: true }
    } catch (err) {
      console.error('Error creating dataset:', err)
      return { success: false, error: 'Failed to create dataset' }
    }
  }

  const generateDataset = async (collection, name, size) => {
    try {
      await evaluationAPI.generateDataset(collection, name, size)
      await loadDatasets()
      return { success: true }
    } catch (err) {
      console.error('Error generating dataset:', err)
      return { success: false, error: 'Failed to generate dataset' }
    }
  }

  const updateDataset = async (id, data) => {
    try {
      await evaluationAPI.updateDataset(id, data)
      await loadDatasets()
      return { success: true }
    } catch (err) {
      console.error('Error updating dataset:', err)
      return { success: false, error: 'Failed to update dataset' }
    }
  }

  const deleteDataset = async (id) => {
    try {
      await evaluationAPI.deleteDataset(id)
      await loadDatasets()
      return { success: true }
    } catch (err) {
      console.error('Error deleting dataset:', err)
      return { success: false, error: 'Failed to delete dataset' }
    }
  }

  useEffect(() => {
    loadDatasets()
  }, [])

  return {
    datasets,
    loading,
    error,
    createDataset,
    generateDataset,
    updateDataset,
    deleteDataset,
    reload: loadDatasets
  }
}