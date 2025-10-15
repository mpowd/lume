import { useState, useEffect } from 'react'
import { knowledgeBaseAPI } from '../services/api'

export const useCollections = () => {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadCollections = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await knowledgeBaseAPI.getAll()
      setCollections(data.collection_names || [])
    } catch (err) {
      console.error('Error loading collections:', err)
      setError('Failed to load collections')
    } finally {
      setLoading(false)
    }
  }

  const createCollection = async (collectionData) => {
    try {
      await knowledgeBaseAPI.create(collectionData)
      await loadCollections()
      return { success: true }
    } catch (err) {
      console.error('Error creating collection:', err)
      return { success: false, error: 'Failed to create collection' }
    }
  }

  const deleteCollection = async (collectionName) => {
    try {
      await knowledgeBaseAPI.delete(collectionName)
      await loadCollections()
      return { success: true }
    } catch (err) {
      console.error('Error deleting collection:', err)
      return { success: false, error: 'Failed to delete collection' }
    }
  }

  useEffect(() => {
    loadCollections()
  }, [])

  return {
    collections,
    loading,
    error,
    createCollection,
    deleteCollection,
    reload: loadCollections
  }
}