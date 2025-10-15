import { useState, useEffect } from 'react'
import { chatbotsAPI } from '../services/api'

export const useChatbots = () => {
  const [chatbots, setChatbots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadChatbots = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await chatbotsAPI.getAll()
      
      const mappedChatbots = data.map(bot => ({
        id: bot.id || bot._id,
        name: bot.chatbot_name || bot.name,
        workflow: bot.workflow,
        llm: bot.llm,
        llm_provider: bot.llm_provider || 'openai',
        collections: bot.collections || [],
        local_only: bot.local_only || false,
        hybrid_search: bot.hybrid_search,
        hyde: bot.hyde,
        hyde_prompt: bot.hyde_prompt,
        top_k: bot.top_k,
        reranking: bot.reranking,
        reranker_provider: bot.reranker_provider || 'cohere',
        reranker_model: bot.reranker_model || 'rerank-v3.5',
        top_n: bot.top_n,
        rag_prompt: bot.rag_prompt,
        tools: bot.tools,
        max_steps: bot.max_steps,
        precise_citation: bot.precise_citation || false,
        created_at: bot.created_at
      }))
      
      setChatbots(mappedChatbots)
    } catch (err) {
      console.error('Error loading chatbots:', err)
      setError(`Failed to load chatbots: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const createChatbot = async (formData) => {
    try {
      await chatbotsAPI.create(formData)
      await loadChatbots()
      return { success: true }
    } catch (err) {
      console.error('Error creating chatbot:', err)
      return { success: false, error: 'Failed to create chatbot' }
    }
  }

  const updateChatbot = async (id, formData) => {
    try {
      await chatbotsAPI.update(id, formData)
      await loadChatbots()
      return { success: true }
    } catch (err) {
      console.error('Error updating chatbot:', err)
      return { success: false, error: 'Failed to update chatbot' }
    }
  }

  const deleteChatbot = async (id) => {
    try {
      await chatbotsAPI.delete(id)
      await loadChatbots()
      return { success: true }
    } catch (err) {
      console.error('Error deleting chatbot:', err)
      return { success: false, error: 'Failed to delete chatbot' }
    }
  }

  useEffect(() => {
    loadChatbots()
  }, [])

  return {
    chatbots,
    loading,
    error,
    createChatbot,
    updateChatbot,
    deleteChatbot,
    reload: loadChatbots
  }
}