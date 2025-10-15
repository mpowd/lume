import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, Loader2, Bot, Sparkles, Database, Zap, X, Check, ChevronDown, ChevronUp, Settings, AlertCircle, Target, Cpu, Lock } from 'lucide-react'
import { chatbotsAPI, knowledgeBaseAPI, ollamaAPI } from '../../services/api'

export default function ChatbotsPage() {
  const [chatbots, setChatbots] = useState([])
  const [collections, setCollections] = useState([])
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingChatbot, setEditingChatbot] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
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

  const OPENAI_MODELS = ['gpt-4o-mini', 'gpt-4o', 'gpt-4-turbo']
  const COHERE_RERANKERS = ['rerank-v3.5', 'rerank-english-v3.0', 'rerank-multilingual-v3.0']
  const HUGGINGFACE_RERANKERS = [
    'BAAI/bge-reranker-v2-m3',
    'BAAI/bge-reranker-base',
    'BAAI/bge-reranker-large'
  ]

  useEffect(() => {
    loadData()
    loadOllamaModels()
  }, [])

  const loadOllamaModels = async () => {
    setLoadingModels(true)
    try {
      const response = await ollamaAPI.getModels()
      const chatModels = (response.models || [])
        .filter(m => !m.name.includes('embed') && !m.name.includes('jina'))
        .map(m => ({
          name: m.name,
          fullName: m.name,
          size: m.size
        }))
      setOllamaModels(chatModels)
    } catch (err) {
      console.error('Error loading Ollama models:', err)
      setError('Failed to load Ollama models. Make sure Ollama is running.')
    } finally {
      setLoadingModels(false)
    }
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)
    try {
      const [chatbotsData, collectionsData] = await Promise.all([
        chatbotsAPI.getAll(),
        knowledgeBaseAPI.getAll()
      ])
      
      const mappedChatbots = chatbotsData.map(bot => ({
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
      setCollections(collectionsData.collection_names || [])
    } catch (err) {
      console.error('Error loading data:', err)
      setError(`Failed to load data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const formatModelSize = (bytes) => {
    const gb = bytes / (1024 ** 3)
    return `${gb.toFixed(1)} GB`
  }

  const handleSubmit = async () => {
    if (!formData.chatbot_name) {
      setError('Please enter a chatbot name')
      return
    }
    if (formData.workflow === 'linear' && formData.collections.length === 0) {
      setError('Please select at least one knowledge source')
      return
    }
    
    setSaving(true)
    setError(null)
    
    try {
      if (editingChatbot) {
        await chatbotsAPI.update(editingChatbot.id, formData)
      } else {
        await chatbotsAPI.create(formData)
      }
      await loadData()
      resetForm()
    } catch (err) {
      console.error('Error saving chatbot:', err)
      setError('Failed to save chatbot. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (chatbot) => {
    setEditingChatbot(chatbot)
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
    setShowForm(true)
    setShowAdvanced(false)
    setError(null)
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    try {
      await chatbotsAPI.delete(id)
      await loadData()
      setConfirmDelete(null)
    } catch (err) {
      console.error('Error deleting chatbot:', err)
      setError('Failed to delete chatbot. Please try again.')
    }
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingChatbot(null)
    setShowAdvanced(false)
    setError(null)
    setFormData({
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
    
    // If enabling local-only mode and currently using proprietary models
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                <Bot className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Chatbots</h1>
                <p className="text-sm text-slate-400">{chatbots.length} active assistant{chatbots.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <button
              onClick={() => {
                setShowForm(!showForm)
                if (showForm) resetForm()
              }}
              className="group relative px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center gap-2 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Plus className={`w-4 h-4 relative z-10 transition-transform duration-300 ${showForm ? 'rotate-45' : ''}`} />
              <span className="relative z-10">{showForm ? 'Cancel' : 'New Chatbot'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {showForm && (
          <div className="mb-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">
                {editingChatbot ? 'Edit Assistant' : 'Create New Assistant'}
              </h2>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">Name</label>
                  <input
                    type="text"
                    value={formData.chatbot_name}
                    onChange={(e) => setFormData({...formData, chatbot_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                    placeholder="e.g., Customer Support Bot"
                  />
                </div>

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

                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-300">
                      <Cpu className="w-4 h-4 inline mr-2" />
                      Language Model
                    </label>
                    
                    <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10">
                      <button
                        type="button"
                        onClick={() => !formData.local_only && setFormData({...formData, llm_provider: 'openai', llm: 'gpt-4o-mini'})}
                        disabled={formData.local_only}
                        className={`py-2.5 rounded-lg font-medium transition-all ${
                          formData.llm_provider === 'openai'
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                            : formData.local_only
                            ? 'text-slate-600 cursor-not-allowed'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        OpenAI {formData.local_only && <Lock className="w-3 h-3 inline ml-1" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const firstOllama = ollamaModels[0]?.name || 'mistral'
                          setFormData({...formData, llm_provider: 'ollama', llm: firstOllama})
                        }}
                        className={`py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                          formData.llm_provider === 'ollama'
                            ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Ollama
                        {loadingModels && <Loader2 className="w-3 h-3 animate-spin" />}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {formData.llm_provider === 'openai' ? (
                        OPENAI_MODELS.map(model => (
                          <button
                            key={model}
                            type="button"
                            onClick={() => setFormData({...formData, llm: model})}
                            className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                              formData.llm === model
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-emerald-400/50'
                                : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                            }`}
                          >
                            {model}
                          </button>
                        ))
                      ) : (
                        <>
                          {loadingModels ? (
                            <div className="col-span-full flex items-center justify-center py-8">
                              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                            </div>
                          ) : ollamaModels.length === 0 ? (
                            <div className="col-span-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                              <p className="text-orange-400 text-sm">No Ollama models found. Make sure Ollama is running.</p>
                            </div>
                          ) : (
                            ollamaModels.map(model => (
                              <button
                                key={model.fullName}
                                type="button"
                                onClick={() => setFormData({...formData, llm: model.name})}
                                className={`py-3 px-4 rounded-xl text-sm font-medium transition-all group relative ${
                                  formData.llm === model.name
                                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg ring-2 ring-orange-400/50'
                                    : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                                }`}
                              >
                                <div className="flex flex-col items-start gap-1 w-full">
                                  <span className="truncate w-full text-left">{model.name}</span>
                                  <span className={`text-xs ${formData.llm === model.name ? 'text-white/70' : 'text-slate-500'}`}>
                                    {formatModelSize(model.size)}
                                  </span>
                                </div>
                              </button>
                            ))
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="font-medium">Advanced Settings</span>
                      {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {showAdvanced && (
                    <div className="space-y-6 p-6 bg-slate-950/30 rounded-xl border border-white/5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/10 rounded-xl hover:border-white/20 transition-all group">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Hybrid Search</span>
                            <input
                              type="checkbox"
                              checked={formData.hybrid_search}
                              onChange={(e) => setFormData({...formData, hybrid_search: e.target.checked})}
                              className="w-5 h-5 rounded-lg"
                            />
                          </label>
                          
                          <label className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/10 rounded-xl hover:border-white/20 transition-all group">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">HyDE</span>
                            <input
                              type="checkbox"
                              checked={formData.hyde}
                              onChange={(e) => setFormData({...formData, hyde: e.target.checked})}
                              className="w-5 h-5 rounded-lg"
                            />
                          </label>

                          <label className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/10 rounded-xl hover:border-white/20 transition-all group">
                            <div className="flex items-center gap-2">
                              <Target className="w-4 h-4 text-blue-400" />
                              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Precise Citation</span>
                            </div>
                            <input
                              type="checkbox"
                              checked={formData.precise_citation}
                              onChange={(e) => setFormData({...formData, precise_citation: e.target.checked})}
                              className="w-5 h-5 rounded-lg"
                            />
                          </label>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-slate-300">Top K Results</label>
                            <input
                              type="number"
                              value={formData.top_k}
                              onChange={(e) => setFormData({...formData, top_k: parseInt(e.target.value) || 10})}
                              min="1"
                              max="100"
                              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                            />
                          </div>

                          <label className="flex items-center justify-between p-4 bg-slate-950/50 border border-white/10 rounded-xl hover:border-white/20 transition-all group">
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Enable Reranking</span>
                            <input
                              type="checkbox"
                              checked={formData.reranking}
                              onChange={(e) => setFormData({...formData, reranking: e.target.checked})}
                              className="w-5 h-5 rounded-lg"
                            />
                          </label>

                          {formData.reranking && (
                            <>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">Reranker Provider</label>
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10">
                                  <button
                                    type="button"
                                    onClick={() => !formData.local_only && setFormData({
                                      ...formData, 
                                      reranker_provider: 'cohere',
                                      reranker_model: 'rerank-v3.5'
                                    })}
                                    disabled={formData.local_only}
                                    className={`py-2.5 rounded-lg font-medium transition-all ${
                                      formData.reranker_provider === 'cohere'
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg'
                                        : formData.local_only
                                        ? 'text-slate-600 cursor-not-allowed'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    Cohere {formData.local_only && <Lock className="w-3 h-3 inline ml-1" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setFormData({
                                      ...formData, 
                                      reranker_provider: 'huggingface',
                                      reranker_model: 'BAAI/bge-reranker-v2-m3'
                                    })}
                                    className={`py-2.5 rounded-lg font-medium transition-all ${
                                      formData.reranker_provider === 'huggingface'
                                        ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                    }`}
                                  >
                                    HuggingFace
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">Reranker Model</label>
                                <div className="grid grid-cols-1 gap-2">
                                  {formData.reranker_provider === 'cohere' ? (
                                    COHERE_RERANKERS.map(model => (
                                      <button
                                        key={model}
                                        type="button"
                                        onClick={() => setFormData({...formData, reranker_model: model})}
                                        className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-left ${
                                          formData.reranker_model === model
                                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg ring-2 ring-purple-400/50'
                                            : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                                        }`}
                                      >
                                        {model}
                                      </button>
                                    ))
                                  ) : (
                                    HUGGINGFACE_RERANKERS.map(model => (
                                      <button
                                        key={model}
                                        type="button"
                                        onClick={() => setFormData({...formData, reranker_model: model})}
                                        className={`py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-left ${
                                          formData.reranker_model === model
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg ring-2 ring-yellow-400/50'
                                            : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                                        }`}
                                      >
                                        {model}
                                      </button>
                                    ))
                                  )}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-slate-300">Top N (after reranking)</label>
                                <input
                                  type="number"
                                  value={formData.top_n}
                                  onChange={(e) => setFormData({...formData, top_n: parseInt(e.target.value) || 5})}
                                  min="1"
                                  max={formData.top_k}
                                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">RAG Prompt Template</label>
                        <textarea
                          value={formData.rag_prompt}
                          onChange={(e) => setFormData({...formData, rag_prompt: e.target.value})}
                          rows={6}
                          className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                          placeholder="Enter your RAG prompt template..."
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSubmit}
                  disabled={saving || !formData.chatbot_name || (formData.workflow === 'linear' && formData.collections.length === 0)}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-medium shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {saving ? 'Saving...' : (editingChatbot ? 'Update Assistant' : 'Create Assistant')}
                </button>
                <button
                  onClick={resetForm}
                  disabled={saving}
                  className="px-6 py-3 bg-slate-950/50 text-slate-300 border border-white/10 rounded-xl font-medium hover:bg-slate-900/50 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chatbots.length === 0 ? (
            <div className="col-span-full text-center py-16">
              <div className="inline-flex p-4 bg-slate-900/50 rounded-2xl mb-4">
                <Bot className="w-12 h-12 text-slate-600" />
              </div>
              <p className="text-slate-400 text-lg">No chatbots yet</p>
              <p className="text-slate-500 text-sm mt-2">Create your first assistant to get started</p>
            </div>
          ) : (
            chatbots.map(chatbot => (
              <div
                key={chatbot.id}
                onClick={() => handleEdit(chatbot)}
                className="group relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/20"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
                      <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-lg group-hover:text-blue-400 transition-colors">{chatbot.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                          <Zap className="w-3 h-3" />
                          {chatbot.workflow}
                        </span>
                        {chatbot.local_only && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded">
                            <Lock className="w-3 h-3" />
                            Local
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Model</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        chatbot.llm_provider === 'ollama' 
                          ? 'bg-orange-500/20 text-orange-400' 
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {chatbot.llm_provider || 'openai'}
                      </span>
                      <span className="text-white font-medium">{chatbot.llm}</span>
                    </div>
                  </div>
                  {chatbot.collections && chatbot.collections.length > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Sources</span>
                      <span className="text-white font-medium">{chatbot.collections.length}</span>
                    </div>
                  )}
                  {chatbot.reranking && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Reranker</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          chatbot.reranker_provider === 'huggingface' 
                            ? 'bg-yellow-500/20 text-yellow-400' 
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {chatbot.reranker_provider || 'cohere'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {chatbot.workflow === 'linear' && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {chatbot.hybrid_search && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-lg">Hybrid</span>
                    )}
                    {chatbot.hyde && (
                      <span className="px-2 py-1 bg-purple-500/10 text-purple-400 text-xs rounded-lg">HyDE</span>
                    )}
                    {chatbot.reranking && (
                      <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded-lg">Rerank</span>
                    )}
                    {chatbot.precise_citation && (
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded-lg flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        Precise
                      </span>
                    )}
                  </div>
                )}

                <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleEdit(chatbot)
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all font-medium"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  
                  {confirmDelete === chatbot.id ? (
                    <>
                      <button
                        onClick={(e) => handleDelete(e, chatbot.id)}
                        className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setConfirmDelete(null)
                        }}
                        className="px-4 py-2 bg-slate-950/50 text-slate-300 border border-white/10 rounded-xl hover:bg-slate-900/50 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setConfirmDelete(chatbot.id)
                      }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}