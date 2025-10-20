import { useState, useEffect } from 'react'
import { assistantsAPI } from '../services/api'

export const useAssistants = () => {
  const [assistants, setAssistants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAssistants = async () => {
    setLoading(true)
    setError(null)
    try {
      // Changed: Remove the is_active filter or set to null to get all assistants
      const data = await assistantsAPI.getAll('qa', null)
      
      console.log('Loaded assistants:', data) // Debug log
      
      // Map from assistant format to component format
      // Use values as-is from backend, which should provide all defaults
      const mappedAssistants = data.map(assistant => ({
        id: assistant.id,
        name: assistant.name,
        workflow: 'linear',
        llm: assistant.config?.llm_model || null,
        llm_provider: assistant.config?.llm_provider || null,
        collections: assistant.config?.knowledge_base_ids || [],
        local_only: assistant.config?.local_only,
        hybrid_search: assistant.config?.hybrid_search,
        hyde: assistant.config?.use_hyde,
        hyde_prompt: assistant.config?.hyde_prompt,
        top_k: assistant.config?.top_k,
        reranking: assistant.config?.reranking,
        reranker_provider: assistant.config?.reranker_provider,
        reranker_model: assistant.config?.reranker_model,
        top_n: assistant.config?.top_n,
        rag_prompt: assistant.config?.rag_prompt,
        tools: assistant.config?.tools || [],
        max_steps: assistant.config?.max_steps,
        precise_citation: assistant.config?.precise_citation,
        created_at: assistant.created_at
      }))
      
      console.log('Mapped assistants:', mappedAssistants) // Debug log
      setAssistants(mappedAssistants)
    } catch (err) {
      console.error('Error loading assistants:', err)
      setError(`Failed to load assistants: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createAssistant = async (formData) => {
    try {
      // Transform to assistant format
      // Only send fields that are provided, let backend handle defaults
      const assistantData = {
        name: formData.assistant_name,
        description: formData.description || '',
        type: 'qa',
        config: {
          type: 'qa',
          name: formData.assistant_name,
          description: '',
          created_by: 'user',
          knowledge_base_ids: formData.collections || [],
          llm_model: formData.llm,
          llm_provider: formData.llm_provider,
          hybrid_search: formData.hybrid_search,
          top_k: formData.top_k,
          use_hyde: formData.hyde,
          hyde_prompt: formData.hyde_prompt,
          reranking: formData.reranking,
          reranker_provider: formData.reranker_provider,
          reranker_model: formData.reranker_model,
          top_n: formData.top_n,
          rag_prompt: formData.rag_prompt,
          precise_citation: formData.precise_citation,
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps
        },
        created_by: 'user'
      }
      
      console.log('Creating assistant with data:', assistantData) // Debug log
      await assistantsAPI.create(assistantData)
      await loadAssistants()
      return { success: true }
    } catch (err) {
      console.error('Error creating assistant:', err)
      
      // Handle Pydantic validation errors properly
      let errorMessage = 'Failed to create assistant'
      
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors - format them nicely
          errorMessage = err.response.data.detail
            .map(e => `${e.loc.join('.')}: ${e.msg}`)
            .join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      }
    }
  }

  const updateAssistant = async (id, formData) => {
    try {
      const updateData = {
        name: formData.assistant_name,
        description: '',
        config: {
          type: 'qa',
          name: formData.assistant_name,
          description: '',
          created_by: 'user',
          knowledge_base_ids: formData.collections || [],
          llm_model: formData.llm,
          llm_provider: formData.llm_provider,
          hybrid_search: formData.hybrid_search,
          top_k: formData.top_k,
          use_hyde: formData.hyde,
          hyde_prompt: formData.hyde_prompt,
          reranking: formData.reranking,
          reranker_provider: formData.reranker_provider,
          reranker_model: formData.reranker_model,
          top_n: formData.top_n,
          rag_prompt: formData.rag_prompt,
          precise_citation: formData.precise_citation,
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps
        }
      }
      
      await assistantsAPI.update(id, updateData)
      await loadAssistants()
      return { success: true }
    } catch (err) {
      console.error('Error updating assistant:', err)
      
      let errorMessage = 'Failed to update assistant'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail
            .map(e => `${e.loc.join('.')}: ${e.msg}`)
            .join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        }
      }
      
      return { 
        success: false, 
        error: errorMessage
      }
    }
  }

  const deleteAssistant = async (id) => {
    try {
      await assistantsAPI.delete(id)
      await loadAssistants()
      return { success: true }
    } catch (err) {
      console.error('Error deleting assistant:', err)
      return { 
        success: false, 
        error: err.response?.data?.detail || 'Failed to delete assistant' 
      }
    }
  }

  useEffect(() => {
    loadAssistants()
  }, [])

  return {
    assistants,
    loading,
    error,
    createAssistant,
    updateAssistant,
    deleteAssistant,
    reload: loadAssistants
  }
}