// src/services/api.js
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Chat API
export const chatAPI = {
  sendMessage: async (chatbotId, message, conversationHistory) => {
    try {
      const response = await api.post('/chat/', {
        chatbot_id: chatbotId,
        query: message
      })
      return response.data
    } catch (error) {
      console.error('Chat API Error:', error)
      throw error
    }
  }
}

// Chatbots API
export const chatbotsAPI = {
  getAll: async () => {
    try {
      const response = await api.get('/chatbot/list')
      return response.data.chatbots || response.data
    } catch (error) {
      console.error('Chatbots API Error:', error)
      throw error
    }
  },
  
  getById: async (id) => {
    try {
      const response = await api.get(`/chatbot/${id}`)
      return response.data
    } catch (error) {
      console.error('Get Chatbot Error:', error)
      throw error
    }
  },
  
  create: async (data) => {
    try {
      const response = await api.post('/chatbot/save', data)
      return response.data
    } catch (error) {
      console.error('Create Chatbot Error:', error)
      throw error
    }
  },
  
  update: async (id, data) => {
    try {
      const response = await api.put(`/chatbot/${id}`, data)
      return response.data
    } catch (error) {
      console.error('Update Chatbot Error:', error)
      throw error
    }
  },
  
  delete: async (id) => {
    try {
      const response = await api.delete(`/chatbot/${id}`)
      return response.data
    } catch (error) {
      console.error('Delete Chatbot Error:', error)
      throw error
    }
  }
}

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
  /**
   * Discover links from a website
   */
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

  /**
   * Upload documents with streaming progress (uses EventSource/SSE)
   * Returns an EventSource for real-time progress updates
   */
  createUploadStream: (collectionName, urls) => {
    const params = new URLSearchParams({
      collection_name: collectionName,
      urls: JSON.stringify(urls),
    })

    return new EventSource(
      `${API_BASE_URL}/website/upload-documents-stream?${params}`
    )
  },

  /**
   * Upload documents (non-streaming version)
   */
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

// Crawl API (Legacy - consider migrating to websiteAPI)
export const crawlAPI = {
  crawlWebsite: async (baseUrl, depth, maxPages, collectionName, onProgress) => {
    try {
      const response = await fetch(`${API_BASE_URL}/crawl/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_url: baseUrl,
          depth: depth,
          max_pages: maxPages,
          include_external_domains: false
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6))
            
            if (onProgress) onProgress(data)
            
            if (data.status === 'complete') {
              return { 
                response: { 
                  urls: data.urls, 
                  crawl_session_id: data.crawl_session_id 
                } 
              }
            }
            
            if (data.status === 'error') {
              throw new Error(data.message)
            }
          }
        }
      }
    } catch (error) {
      console.error('Crawl API Error:', error)
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

  evaluateChatbot: async (datasetName, chatbotId, questions, groundTruths, answers, contexts) => {
    try {
      const response = await api.post('/evaluation/evaluate-chatbot', {
        dataset_name: datasetName,
        chatbot_id: chatbotId,
        questions: questions,
        ground_truths: groundTruths,
        answers: answers,
        retrieved_contexts: contexts
      })
      return response.data
    } catch (error) {
      console.error('Evaluate Chatbot Error:', error)
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