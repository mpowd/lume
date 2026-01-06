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
      const data = await assistantsAPI.getAll('qa', null)
      
      console.log('Loaded assistants from API:', data)
      
      const mappedAssistants = data.map(assistant => ({
        id: assistant.id,
        _id: assistant.id,
        name: assistant.name,
        description: assistant.description || '',
        type: assistant.type || 'qa',
        is_active: assistant.is_active !== false,
        workflow: 'linear',
        llm: assistant.config?.llm_model || null,
        llm_provider: assistant.config?.llm_provider || null,
        collections: assistant.config?.knowledge_base_ids || [],
        opening_message: assistant.config?.opening_message || [],
        references: assistant.config?.references || [],
        local_only: assistant.config?.local_only,
        hybrid_search: assistant.config?.hybrid_search,
        hyde: assistant.config?.use_hyde,
        hyde_prompt: assistant.config?.hyde_prompt,
        top_k: assistant.config?.top_k,
        reranking: assistant.config?.reranking,
        reranker_provider: assistant.config?.reranker_provider,
        reranker_model: assistant.config?.reranker_model,
        top_n: assistant.config?.top_n,
        system_prompt: assistant.config?.system_prompt,
        user_prompt: assistant.config?.user_prompt,
        precise_citation: assistant.config?.precise_citation,
        precise_citation_system_prompt: assistant.config?.precise_citation_system_prompt,
        precise_citation_user_prompt: assistant.config?.precise_citation_user_prompt,
        tools: assistant.config?.tools || [],
        max_steps: assistant.config?.max_steps,
        agentic_system_prompt: assistant.config?.agentic_system_prompt,
        created_at: assistant.created_at,
        created_by: assistant.created_by || 'user'
      }))
      
      console.log('Mapped assistants:', mappedAssistants)
      
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
      const assistantData = {
        name: formData.assistant_name,
        description: formData.description || '',
        type: 'qa',
        is_active: true,
        config: {
          type: 'qa',
          name: formData.assistant_name,
          description: '',
          created_by: 'user',
          knowledge_base_ids: formData.collections || [],
          opening_message: formData.opening_message || [],
          references: formData.references || [],
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
          system_prompt: formData.system_prompt,
          user_prompt: formData.user_prompt,
          precise_citation: formData.precise_citation,
          precise_citation_system_prompt: formData.precise_citation_system_prompt,
          precise_citation_user_prompt: formData.precise_citation_user_prompt,
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps,
          workflow: formData.workflow,
          agentic_system_prompt: formData.agentic_system_prompt
        },
        created_by: 'user'
      }
      
      console.log('Creating assistant with data:', assistantData)
      await assistantsAPI.create(assistantData)
      await loadAssistants()
      return { success: true }
    } catch (err) {
      console.error('Error creating assistant:', err)
      
      let errorMessage = 'Failed to create assistant'
      
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

  const updateAssistant = async (id, formData) => {
    try {
      const updateData = {
        name: formData.assistant_name,
        description: '',
        type: 'qa',
        is_active: true,
        config: {
          type: 'qa',
          name: formData.assistant_name,
          description: '',
          created_by: 'user',
          knowledge_base_ids: formData.collections || [],
          
          references: formData.references || [],
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
          system_prompt: formData.system_prompt,
          user_prompt: formData.user_prompt,
          precise_citation: formData.precise_citation,
          precise_citation_system_prompt: formData.precise_citation_system_prompt,
          precise_citation_user_prompt: formData.precise_citation_user_prompt,
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps,
          agentic_system_prompt: formData.agentic_system_prompt
        }
      }
      
      console.log('Updating assistant with data:', updateData)
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