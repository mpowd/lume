// src/services/api.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ASSISTANT API 

export const assistantsAPI = {
  /**
   * Get all assistants
   * @param {string} type - Optional filter by type (e.g., 'qa')
   * @param {boolean} is_active - Optional filter by active status
   */
  getAll: async (type = null, is_active = null) => {
    try {
      const params = {}
      if (type) params.type = type
      if (is_active !== null) params.is_active = is_active
      
      const response = await api.get('/assistants/', { params })
      return response.data.assistants || []
    } catch (error) {
      console.error('Assistants API Error:', error)
      throw error
    }
  },
  
  /**
   * Get assistant by ID
   */
  getById: async (id) => {
    try {
      const response = await api.get(`/assistants/${id}`)
      return response.data
    } catch (error) {
      console.error('Get Assistant Error:', error)
      throw error
    }
  },
  
  /**
   * Create a new assistant
   * @param {Object} data - Assistant configuration
   * @param {string} data.name - Assistant name
   * @param {string} data.description - Assistant description
   * @param {string} data.type - Assistant type (e.g., 'qa')
   * @param {Object} data.config - Type-specific configuration
   */
  create: async (data) => {
    try {
      const response = await api.post('/assistants/', data)
      return response.data
    } catch (error) {
      console.error('Create Assistant Error:', error)
      throw error
    }
  },
  
  /**
   * Update an assistant
   */
  update: async (id, data) => {
    try {
      const response = await api.put(`/assistants/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Update Assistant Error:', error)
      throw error
    }
  },
  
  /**
   * Delete an assistant
   */
  delete: async (id) => {
    try {
      const response = await api.delete(`/assistants/${id}`)
      return response.data
    } catch (error) {
      console.error('Delete Assistant Error:', error)
      throw error
    }
  },
  
  /**
   * Get list of available assistant types
   */
  getTypes: async () => {
    try {
      const response = await api.get('/assistants/types/list')
      return response.data.types || []
    } catch (error) {
      console.error('Get Assistant Types Error:', error)
      throw error
    }
  },
  
  /**
   * Get schema for a specific assistant type
   * @param {string} type - Assistant type (e.g., 'qa')
   */
  getTypeSchema: async (type) => {
    try {
      const response = await api.get(`/assistants/types/${type}/schema`)
      return response.data
    } catch (error) {
      console.error('Get Type Schema Error:', error)
      throw error
    }
  }
}

// Execution API (NEW)
export const executionAPI = {
  /**
   * Execute any assistant
   * @param {string} assistantId - Assistant ID
   * @param {Object} inputData - Input data for the assistant
   */
  execute: async (assistantId, inputData) => {
    try {
      const response = await api.post('/execute/', {
        assistant_id: assistantId,
        input_data: inputData
      })
      return response.data
    } catch (error) {
      console.error('Execute Assistant Error:', error)
      throw error
    }
  },
  
  /**
   * Execute QA assistant (convenience method)
   * @param {string} assistantId - QA Assistant ID
   * @param {string} question - Question to ask
   */
  executeQA: async (assistantId, question) => {
    try {
      const response = await api.post('/execute/qa', null, {
        params: {
          assistant_id: assistantId,
          question: question
        }
      })
      return response.data
    } catch (error) {
      console.error('Execute QA Error:', error)
      throw error
    }
  }
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Helper to create a QA assistant with common defaults
 */
export const createQAAssistant = async ({
  name,
  description = '',
  knowledgeBaseIds,
  llmModel = 'gpt-4o-mini',
  llmProvider = 'openai',
  hybridSearch = true,
  topK = 10,
  useHyde = false,
  hydePrompt = null,
  reranking = false,
  rerankerProvider = 'cohere',
  rerankerModel = 'rerank-v3.5',
  topN = null,
  ragPrompt = null,
  preciseCitation = false
}) => {
  return assistantsAPI.create({
    name,
    description,
    type: 'qa',
    config: {
      type: 'qa',
      name,
      description,
      created_by: 'user',
      knowledge_base_ids: knowledgeBaseIds,
      llm_model: llmModel,
      llm_provider: llmProvider,
      hybrid_search: hybridSearch,
      top_k: topK,
      use_hyde: useHyde,
      hyde_prompt: hydePrompt,
      reranking: reranking,
      reranker_provider: rerankerProvider,
      reranker_model: rerankerModel,
      top_n: topN,
      rag_prompt: ragPrompt,
      precise_citation: preciseCitation
    },
    created_by: 'user'
  })
}

/**
 * Helper to update a QA assistant
 */
export const updateQAAssistant = async (assistantId, updates) => {
  // Get current assistant
  const current = await assistantsAPI.getById(assistantId)
  
  // Merge updates with current config
  const updatedConfig = {
    ...current.config,
    ...updates
  }
  
  return assistantsAPI.update(assistantId, {
    name: updates.name || current.name,
    description: updates.description || current.description,
    config: updatedConfig
  })
}

// ==================== CHAT API (Using new execution API) ====================

export const chatAPI = {
  /**
   * Send a message to an assistant (QA assistant)
   * @param {string} assistantId - Assistant ID
   * @param {string} message - User message
   */
  sendMessage: async (assistantId, message) => {
    try {
      const response = await executionAPI.executeQA(assistantId, message)
      
      // Transform to match old response format for backwards compatibility
      return {
        response: response.response,
        contexts: response.contexts || [],
        source_urls: response.source_urls || []
      }
    } catch (error) {
      console.error('Chat API Error:', error)
      throw error
    }
  }
}


// ==================== KEEP EXISTING APIs UNCHANGED ====================

// Knowledge Base API
export const knowledgeBaseAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/knowledge_base/collections')
      return response.data
    } catch (error) {
      console.error('Knowledge Bases API Error:', error)
      throw error
    }
  },

  getInfo: async (collectionName) => {
    try {
      const response = await api.get('/knowledge_base/collection_info', {
        params: { collection_name: collectionName }
      })
      return response.data
    } catch (error) {
      console.error('Get Collection Info Error:', error)
      throw error
    }
  },
  
  create: async (config) => {
    try {
      const response = await api.post('/knowledge_base/collections', {
        collection_name: config.collection_name,
        description: config.description || '',
        embedding_model: config.embedding_model,
        chunk_size: config.chunk_size,
        chunk_overlap: config.chunk_overlap,
        distance_metric: config.distance_metric,
      })
      return response.data
    } catch (error) {
      console.error('Create Knowledge Base Error:', error)
      throw error
    }
  },

  update: async (collectionName, updates) => {
    try {
      const response = await api.patch(`/knowledge_base/collections/${collectionName}`, null, {
        params: updates
      })
      return response.data
    } catch (error) {
      console.error('Update Knowledge Base Error:', error)
      throw error
    }
  },
  
  delete: async (collectionName) => {
    try {
      const response = await api.delete(`/knowledge_base/collections/${collectionName}`)
      return response.data
    } catch (error) {
      console.error('Delete Knowledge Base Error:', error)
      throw error
    }
  },

  checkUrlExists: async (collectionName, url) => {
    try {
      const response = await api.get('/knowledge_base/check_url_exists', {
        params: {
          collection_name: collectionName,
          url: url
        }
      })
      return response.data
    } catch (error) {
      console.error('Check URL Error:', error)
      throw error
    }
  },

  deduplicate: async (collectionName) => {
    try {
      const response = await api.post('/knowledge_base/deduplicate_collection', null, {
        params: { collection_name: collectionName }
      })
      return response.data
    } catch (error) {
      console.error('Deduplicate Error:', error)
      throw error
    }
  },
  
  uploadDocuments: async (collectionName, documents) => {
    try {
      const response = await api.post('/knowledge_base/upload_documents', {
        collection_name: collectionName,
        documents: documents.map(doc => ({
          url: doc.url,
          custom_payload: doc.custom_payload || null,
        }))
      })
      return response.data
    } catch (error) {
      console.error('Upload Documents Error:', error)
      throw error
    }
  }
}

// Website/Crawling API
export const websiteAPI = {
  getLinks: async (baseUrl, includeExternal = false) => {
    try {
      const response = await api.get('/website/links', {
        params: {
          base_url: baseUrl,
          include_external_domains: includeExternal
        }
      })
      return response.data
    } catch (error) {
      console.error('Get Links Error:', error)
      throw error
    }
  },

  createUploadStream: (collectionName, urls) => {
    const params = new URLSearchParams({
      collection_name: collectionName,
      urls: JSON.stringify(urls),
    })

    return new EventSource(
      `${API_BASE_URL}/website/upload-documents-stream?${params}`
    )
  },

  uploadDocuments: async (collectionName, urls) => {
    try {
      const response = await api.post('/website/upload-documents', {
        collection_name: collectionName,
        urls: urls,
      })
      return response.data
    } catch (error) {
      console.error('Upload Documents Error:', error)
      throw error
    }
  },
}

// Ollama API
export const ollamaAPI = {
  getModels: async () => {
    try {
      const response = await api.get('/ollama/models')
      return response.data
    } catch (error) {
      console.error('Ollama Models Error:', error)
      throw error
    }
  }
}

// Evaluation API
export const evaluationAPI = {
  getDatasets: async () => {
    try {
      const response = await api.get('/evaluation/datasets')
      return response.data
    } catch (error) {
      console.error('Get Datasets Error:', error)
      throw error
    }
  },

  createDataset: async (data) => {
    try {
      const response = await api.post('/evaluation/datasets', {
        dataset_name: data.dataset_name,
        qa_pairs: data.qa_pairs,
        source_collection: data.source_collection || 'manual'
      })
      return response.data
    } catch (error) {
      console.error('Create Dataset Error:', error)
      throw error
    }
  },

  updateDataset: async (datasetId, data) => {
    try {
      const response = await api.put(`/evaluation/datasets/${datasetId}`, data)
      return response.data
    } catch (error) {
      console.error('Update Dataset Error:', error)
      throw error
    }
  },

  deleteDataset: async (datasetId) => {
    try {
      const response = await api.delete(`/evaluation/datasets/${datasetId}`)
      return response.data
    } catch (error) {
      console.error('Delete Dataset Error:', error)
      throw error
    }
  },

  generateDataset: async (collectionName, datasetName, testsetSize) => {
    try {
      const response = await api.post('/evaluation/ragas', {
        collection_name: collectionName,
        dataset_name: datasetName,
        testset_size: testsetSize
      })
      return response.data
    } catch (error) {
      console.error('Generate Dataset Error:', error)
      throw error
    }
  },

  evaluateAssistant: async (datasetName, assistantId, questions, groundTruths, answers, contexts) => {
    try {
      const response = await api.post('/evaluation/evaluate-assistant', {
        dataset_name: datasetName,
        assistant_id: assistantId,
        questions: questions,
        ground_truths: groundTruths,
        answers: answers,
        retrieved_contexts: contexts
      })
      return response.data
    } catch (error) {
      console.error('Evaluate Assistant Error:', error)
      throw error
    }
  },

  getEvaluations: async () => {
    try {
      const response = await api.get('/evaluation/evaluations')
      return response.data
    } catch (error) {
      console.error('Get Evaluations Error:', error)
      throw error
    }
  }
}

export default api