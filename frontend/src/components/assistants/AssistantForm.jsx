import { useState, useEffect } from 'react'
import { Sparkles, Database, Check, Lock } from 'lucide-react'
import { useCollections } from '../../hooks/useCollections'
import { ollamaAPI } from '../../services/api'
import FormInput from '../shared/FormInput'
import Button from '../shared/Button'
import Card from '../shared/Card'
import ModelSelector from './ModelSelector'
import AdvancedSettings from './AdvancedSettings'
import { formatModelSize } from '../../utils/formatters'

const DEFAULT_RAG_PROMPT = `Answer the question using only the context provided.

Retrieved Context: {context}

User Question: {question}

Answer conversationally. User is not aware of context.`

const DEFAULT_PRECISE_CITATION_PROMPT = `You are answering a question using provided context chunks.
Each chunk is numbered starting from 0. Track which chunks you use.

Retrieved Context Chunks:
{context_with_indices}

User Question: {question}

Instructions:
1. Answer using ONLY information from the chunks above
2. Track which chunk numbers you actually used
3. Only include chunk indices you directly referenced
4. If you didn't use a chunk, don't include its index
5. Do not include the used chunks in the answer directly

{format_instructions}

Be precise with chunk indices!`

export default function AssistantForm({ 
  assistant, 
  onSubmit, 
  onCancel, 
  loading 
}) {
  const { collections } = useCollections()
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  const [formData, setFormData] = useState({
    assistant_name: '',
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
    rag_prompt: DEFAULT_RAG_PROMPT,
    precise_citation_prompt: DEFAULT_PRECISE_CITATION_PROMPT,
    tools: [],
    max_steps: 4,
    precise_citation: false
  })

  useEffect(() => {
    loadOllamaModels()
  }, [])

  useEffect(() => {
    if (assistant) {
      setFormData({
        assistant_name: assistant.name || assistant.assistant_name,
        workflow: assistant.workflow || 'linear',
        collections: assistant.collections || [],
        local_only: assistant.local_only || false,
        hybrid_search: assistant.hybrid_search ?? true,
        hyde: assistant.hyde ?? false,
        hyde_prompt: assistant.hyde_prompt || formData.hyde_prompt,
        top_k: assistant.top_k || 10,
        reranking: assistant.reranking ?? false,
        reranker_provider: assistant.reranker_provider || 'cohere',
        reranker_model: assistant.reranker_model || 'rerank-v3.5',
        top_n: assistant.top_n || 5,
        llm: assistant.llm || 'gpt-4o-mini',
        llm_provider: assistant.llm_provider || 'openai',
        rag_prompt: assistant.rag_prompt || DEFAULT_RAG_PROMPT,
        precise_citation_prompt: assistant.precise_citation_prompt || DEFAULT_PRECISE_CITATION_PROMPT,
        tools: assistant.tools || [],
        max_steps: assistant.max_steps || 4,
        precise_citation: assistant.precise_citation ?? false
      })
    }
  }, [assistant])

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
        <Sparkles className="w-5 h-5 text-brand-teal" />
        <h2 className="text-xl font-semibold text-white">
          {assistant ? 'Edit Assistant' : 'Create New Assistant'}
        </h2>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormInput
            label="Name"
            value={formData.assistant_name}
            onChange={(e) => setFormData({...formData, assistant_name: e.target.value})}
            placeholder="e.g., Customer Support Bot"
            required
          />

          <div className="space-y-2">
            <label className="block text-sm font-medium text-text-secondary">Workflow Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-transparent rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setFormData({...formData, workflow: 'linear'})}
                className={`
                  py-2.5 rounded-lg font-medium transition-all
                  ${formData.workflow === 'linear'
                    ? 'border border-brand-teal/50 bg-white/5 text-white'
                    : 'border border-transparent text-text-tertiary hover:text-white hover:border-white/10'
                  }
                `}
              >
                Linear
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, workflow: 'agentic'})}
                className={`
                  py-2.5 rounded-lg font-medium transition-all
                  ${formData.workflow === 'agentic'
                    ? 'border border-brand-teal/50 bg-white/5 text-white'
                    : 'border border-transparent text-text-tertiary hover:text-white hover:border-white/10'
                  }
                `}
              >
                Agentic
              </button>
            </div>
          </div>
        </div>

        {formData.workflow === 'linear' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                <Database className="w-4 h-4 inline mr-2" />
                Knowledge Sources {formData.collections.length === 0 && <span className="text-danger text-xs">(Select at least one)</span>}
              </label>
              {collections.length === 0 ? (
                <div className="p-4 bg-transparent border border-white/10 rounded-xl text-center">
                  <p className="text-text-tertiary text-sm">No knowledge bases available. Please create one first.</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {collections.map(col => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => toggleCollection(col)}
                      className={`
                        px-4 py-2 rounded-lg text-sm font-medium transition-all 
                        flex items-center gap-1
                        ${formData.collections.includes(col)
                          ? 'border border-brand-teal/50 bg-white/5 text-white'
                          : 'bg-transparent text-text-tertiary border border-white/10 hover:border-brand-teal/30 hover:text-white'
                        }
                      `}
                    >
                      {formData.collections.includes(col) && <Check className="w-3 h-3" />}
                      {col}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 bg-transparent border border-white/10 rounded-xl">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-success" />
                  <div>
                    <span className="text-sm font-medium text-text-secondary">Local Data Processing Only</span>
                    <p className="text-xs text-text-quaternary mt-1">Restrict to local models and processing (no external APIs)</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.local_only}
                  onChange={(e) => handleLocalOnlyToggle(e.target.checked)}
                  className="w-5 h-5 rounded-lg cursor-pointer accent-brand-teal"
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
              defaultRagPrompt={DEFAULT_RAG_PROMPT}
              defaultPreciseCitationPrompt={DEFAULT_PRECISE_CITATION_PROMPT}
            />
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="standout"
            fullWidth
            loading={loading}
            disabled={!formData.assistant_name || (formData.workflow === 'linear' && formData.collections.length === 0)}
          >
            {assistant ? 'Update Assistant' : 'Create Assistant'}
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