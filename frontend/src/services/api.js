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
        query: message  // Changed from "message" to "query"
        // Remove conversation_history - backend doesn't use it yet
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

// Knowledge Base API (renamed from collectionsAPI)
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
  
  create: async (data) => {
    try {
      const response = await api.post('/knowledge_base/collections', data)
      return response.data
    } catch (error) {
      console.error('Create Knowledge Base Error:', error)
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
  
  uploadDocuments: async (collectionName, documents) => {
    try {
      const response = await api.post(`/knowledge_base/collections/${collectionName}/documents`, {
        documents: documents
      })
      return response.data
    } catch (error) {
      console.error('Upload Documents Error:', error)
      throw error
    }
  }
}

// Ollama API
export const ollamaAPI = {
  getModels: async () => {
    const response = await fetch('http://localhost:8000/ollama/models');
    if (!response.ok) throw new Error('Failed to fetch Ollama models');
    return response.json();
  }
}

// Crawl API
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
            
            // Progress Callback aufrufen
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
        retrieved_contexts: contexts  // Changed from 'contexts' to 'retrieved_contexts'
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