import { useState, useEffect } from 'react'
import { Sparkles, Database, Check, Lock } from 'lucide-react'
import { useCollections } from '../../hooks/useCollections'
import { ollamaAPI } from '../../services/api'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Button from '../shared/Button'
import Card from '../shared/Card'
import ModelSelector from './ModelSelector'
import AdvancedSettings from './AdvancedSettings'
import { formatModelSize } from '../../utils/formatters'

export default function ChatbotForm({ 
  chatbot, 
  onSubmit, 
  onCancel, 
  loading 
}) {
  const { collections } = useCollections()
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    chatbot_name: '',
    workflow: 'linear',
    collections: [],
    local_only: false,
    hybrid_search: true,
    hyde: false,
    hyde_prompt: 'Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: ',
    top_k: 10,
    reranking: false,
    reranker_provider: 'cohere',
    reranker_model: 'rerank-v3.5',
    top_n: 5,
    llm: 'gpt-4o-mini',
    llm_provider: 'openai',
    rag_prompt: 'Answer the question using only the context\n\nRetrieved Context: {context}\n\nUser Question: {question}\nAnswer the user conversationally. User is not aware of context.',
    tools: [],
    max_steps: 4,
    precise_citation: false
  })

  useEffect(() => {
    loadOllamaModels()
  }, [])

  useEffect(() => {
    if (chatbot) {
      setFormData({
        chatbot_name: chatbot.name || chatbot.chatbot_name,
        workflow: chatbot.workflow || 'linear',
        collections: chatbot.collections || [],
        local_only: chatbot.local_only || false,
        hybrid_search: chatbot.hybrid_search ?? true,
        hyde: chatbot.hyde ?? false,
        hyde_prompt: chatbot.hyde_prompt || formData.hyde_prompt,
        top_k: chatbot.top_k || 10,
        reranking: chatbot.reranking ?? false,
        reranker_provider: chatbot.reranker_provider || 'cohere',
        reranker_model: chatbot.reranker_model || 'rerank-v3.5',
        top_n: chatbot.top_n || 5,
        llm: chatbot.llm || 'gpt-4o-mini',
        llm_provider: chatbot.llm_provider || 'openai',
        rag_prompt: chatbot.rag_prompt || formData.rag_prompt,
        tools: chatbot.tools || [],
        max_steps: chatbot.max_steps || 4,
        precise_citation: chatbot.precise_citation ?? false
      })
    }
  }, [chatbot])

  const loadOllamaModels = async () => {
    setLoadingModels(true)
    try {
      const response = await ollamaAPI.getModels()
      const chatModels = (response.models || [])
        .filter(m => !m.name.includes('embed') && !m.name.includes('jina'))
        .map(m => ({ name: m.name, fullName: m.name, size: m.size }))
      setOllamaModels(chatModels)
    } catch (err) {
      console.error('Error loading Ollama models:', err)
    } finally {
      setLoadingModels(false)
    }
  }

  const toggleCollection = (collection) => {
    if (formData.collections.includes(collection)) {
      setFormData({
        ...formData,
        collections: formData.collections.filter(c => c !== collection)
      })
    } else {
      setFormData({
        ...formData,
        collections: [...formData.collections, collection]
      })
    }
  }

  const handleLocalOnlyToggle = (checked) => {
    const updates = { local_only: checked }
    
    if (checked) {
      if (formData.llm_provider === 'openai') {
        const firstOllama = ollamaModels[0]?.name || 'mistral'
        updates.llm_provider = 'ollama'
        updates.llm = firstOllama
      }
      if (formData.reranker_provider === 'cohere') {
        updates.reranker_provider = 'huggingface'
        updates.reranker_model = 'BAAI/bge-reranker-v2-m3'
      }
    }
    
    setFormData({ ...formData, ...updates })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <Card className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Sparkles className="w-5 h-5 text-blue-400" />
        <h2 className="text-xl font-semibold text-white">
          {chatbot ? 'Edit Assistant' : 'Create New Assistant'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Name"
            value={formData.chatbot_name}
            onChange={(e) => setFormData({...formData, chatbot_name: e.target.value})}
            placeholder="e.g., Customer Support Bot"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-300">Workflow Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setFormData({...formData, workflow: 'linear'})}
                className={`py-2.5 rounded-lg font-medium transition-all ${
                  formData.workflow === 'linear'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Linear
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, workflow: 'agentic'})}
                className={`py-2.5 rounded-lg font-medium transition-all ${
                  formData.workflow === 'agentic'
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Agentic
              </button>
            </div>
          </div>
        </div>

        {formData.workflow === 'linear' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Database className="w-4 h-4 inline mr-2" />
                Knowledge Sources {formData.collections.length === 0 && <span className="text-red-400 text-xs">(Select at least one)</span>}
              </label>
              {collections.length === 0 ? (
                <div className="p-4 bg-slate-950/50 border border-white/10 rounded-xl text-center">
                  <p className="text-slate-400 text-sm">No knowledge bases available. Please create one first.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {collections.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleCollection(col)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        formData.collections.includes(col)
                          ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                          : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      {formData.collections.includes(col) && <Check className="w-3 h-3 inline mr-1" />}
                      {col}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/30 border border-white/10 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-green-400" />
                  <div>
                    <span className="text-sm font-medium text-slate-300">Local Data Processing Only</span>
                    <p className="text-xs text-slate-500 mt-1">Restrict to local models and processing (no external APIs)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.local_only}
                  onChange={(e) => handleLocalOnlyToggle(e.target.checked)}
                  className="w-5 h-5 rounded-lg cursor-pointer"
                />
              </label>
            </div>

            <ModelSelector
              formData={formData}
              setFormData={setFormData}
              ollamaModels={ollamaModels}
              loadingModels={loadingModels}
              formatModelSize={formatModelSize}
            />

            <AdvancedSettings
              formData={formData}
              setFormData={setFormData}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
            />
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={!formData.chatbot_name || (formData.workflow === 'linear' && formData.collections.length === 0)}
          >
            {chatbot ? 'Update Assistant' : 'Create Assistant'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  )
}