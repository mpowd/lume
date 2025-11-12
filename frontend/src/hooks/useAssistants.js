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
      // Get all QA assistants (don't filter by is_active to get all)
      const data = await assistantsAPI.getAll('qa', null)
      
      console.log('Loaded assistants from API:', data) // Debug log
      
      // Map from assistant format to component format
      // IMPORTANT: Preserve original fields needed by EvaluationRunner
      const mappedAssistants = data.map(assistant => ({
        // Use BOTH id and _id for compatibility
        id: assistant.id,
        _id: assistant.id, // Add _id field for EvaluationRunner
        name: assistant.name,
        description: assistant.description || '',
        type: assistant.type || 'qa', // Preserve type field
        is_active: assistant.is_active !== false, // Default to true if not specified
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
        precise_citation: assistant.config?.precise_citation,
        precise_citation_prompt: assistant.config?.precise_citation_prompt, // ← ADDED
        tools: assistant.config?.tools || [],
        max_steps: assistant.config?.max_steps,
        created_at: assistant.created_at,
        created_by: assistant.created_by || 'user'
      }))
      
      console.log('Mapped assistants:', mappedAssistants) // Debug log
      console.log('Assistants for evaluation (type=qa, is_active=true):', 
        mappedAssistants.filter(a => a.type === 'qa' && a.is_active)
      ) // Debug log
      
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
        is_active: true, // Set active by default when creating
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
          precise_citation_prompt: formData.precise_citation_prompt, // ← ADDED
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
        type: 'qa',
        is_active: true, // Keep active when updating
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
          precise_citation_prompt: formData.precise_citation_prompt, // ← ADDED
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps
        }
      }
      
      console.log('Updating assistant with data:', updateData) // Debug log
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