import { useState, useEffect } from 'react'
import { Sparkles, Database, Check, Lock, Plus, ScrollText, X, Edit2, MessageSquare } from 'lucide-react'
import { useCollections } from '../../hooks/useCollections'
import { ollamaAPI } from '../../services/api'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Button from '../shared/Button'
import Card from '../shared/Card'
import ModelSelector from './ModelSelector'
import AdvancedSettings from './AdvancedSettings'
import { formatModelSize } from '../../utils/formatters'

const DEFAULT_SYSTEM_PROMPT = `You are a helpful assistant that answers questions using only the provided context.
Answer conversationally without mentioning the context or chunks to the user.`

const DEFAULT_USER_PROMPT = `Context:
{context}

Question: {question}`

const DEFAULT_PRECISE_CITATION_SYSTEM = `You are answering questions using provided context chunks.
Each chunk is numbered starting from 0. Track which chunks you use.

Instructions:
1. Answer using ONLY information from the chunks
2. Track which chunk numbers you actually used
3. Only include chunk indices you directly referenced
4. Do not include the used chunks in the answer

{format_instructions}`

const DEFAULT_PRECISE_CITATION_USER = `Context Chunks:
{context_with_indices}

Question: {question}`

// Color palette for reference badges
const REFERENCE_COLORS = [
  'bg-blue-500/20 border-blue-500/50 text-blue-300',
  'bg-purple-500/20 border-purple-500/50 text-purple-300',
  'bg-pink-500/20 border-pink-500/50 text-pink-300',
  'bg-orange-500/20 border-orange-500/50 text-orange-300',
  'bg-green-500/20 border-green-500/50 text-green-300',
  'bg-yellow-500/20 border-yellow-500/50 text-yellow-300',
  'bg-cyan-500/20 border-cyan-500/50 text-cyan-300',
  'bg-red-500/20 border-red-500/50 text-red-300'
]

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

  const [newReferenceText, setNewReferenceText] = useState('')
  const [newReferenceName, setNewReferenceName] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingReferenceIndex, setEditingReferenceIndex] = useState(null)

  const [formData, setFormData] = useState({
    assistant_name: '',
    opening_message: '',
    workflow: 'linear',
    collections: [],
    references: [],
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
    system_prompt: DEFAULT_SYSTEM_PROMPT,
    user_prompt: DEFAULT_USER_PROMPT,
    precise_citation_system_prompt: DEFAULT_PRECISE_CITATION_SYSTEM,
    precise_citation_user_prompt: DEFAULT_PRECISE_CITATION_USER,
    tools: [],
    max_steps: 4,
    precise_citation: false,
    agentic_system_prompt: 'Search Tavily for the given query and return the results.'
  })

  useEffect(() => {
    loadOllamaModels()
  }, [])

  useEffect(() => {
    if (assistant) {
      // Assign colors to references if they don't have them
      const referencesWithColors = (assistant.references || []).map((ref, index) => ({
        ...ref,
        color: ref.color || REFERENCE_COLORS[index % REFERENCE_COLORS.length]
      }))

      setFormData({
        assistant_name: assistant.name || assistant.assistant_name,
        opening_message: assistant.opening_message || '',
        workflow: assistant.workflow || 'linear',
        collections: assistant.collections || [],
        references: referencesWithColors,
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
        system_prompt: assistant.system_prompt || DEFAULT_SYSTEM_PROMPT,
        user_prompt: assistant.user_prompt || DEFAULT_USER_PROMPT,
        precise_citation_system_prompt: assistant.precise_citation_system_prompt || DEFAULT_PRECISE_CITATION_SYSTEM,
        precise_citation_user_prompt: assistant.precise_citation_user_prompt || DEFAULT_PRECISE_CITATION_USER,
        tools: assistant.tools || [],
        max_steps: assistant.max_steps || 4,
        precise_citation: assistant.precise_citation ?? false,
        agentic_system_prompt: assistant.agentic_system_prompt || 'Search Tavily for the given query and return the results.'
      })
    }
  }, [assistant])

  useEffect(() => {
    const updatePrompts = () => {
      // Skip prompt updates when loading an existing assistant
      if (assistant) {
        return
      }
      
      const hasCollections = formData.collections && formData.collections.length > 0
      const hasReferences = formData.references && formData.references.length > 0
      
      let newSystemPrompt = DEFAULT_SYSTEM_PROMPT
      let newUserPrompt = DEFAULT_USER_PROMPT
      
      if (!hasCollections && !hasReferences) {
        // Case 4: No collections, no references
        newSystemPrompt = `You are a helpful assistant that answers questions based on your knowledge.`
        newUserPrompt = `Question: {question}`
      } else if (hasCollections && !hasReferences) {
        // Case 1: Collections, no references (keep defaults)
        newSystemPrompt = DEFAULT_SYSTEM_PROMPT
        newUserPrompt = DEFAULT_USER_PROMPT
      } else if (hasCollections && hasReferences) {
        // Case 2: Collections and references - use placeholders
        const refPlaceholders = formData.references.map(ref => `{${ref.name}}`).join('\n')
        newSystemPrompt = `You are a helpful assistant that answers questions using the provided context and reference materials.
Answer conversationally without mentioning the context or chunks to the user.`
        newUserPrompt = `Context:
{context}

References:
${refPlaceholders}

Question: {question}`
      } else if (!hasCollections && hasReferences) {
        // Case 3: No collections, references only - use placeholders
        const refPlaceholders = formData.references.map(ref => `{${ref.name}}`).join('\n')
        newSystemPrompt = `You are a helpful assistant that answers questions based on the provided reference materials.`
        newUserPrompt = `References:
${refPlaceholders}

Question: {question}`
      }
      
      setFormData(prev => ({
        ...prev,
        system_prompt: newSystemPrompt,
        user_prompt: newUserPrompt
      }))
    }
    
    updatePrompts()
  }, [formData.collections.length, formData.references.length])

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

  const toggleTool = (tool) => {
    if (formData.tools.includes(tool)) {
      setFormData({
        ...formData,
        tools: formData.tools.filter(t => t !== tool)
      })
    } else {
      setFormData({
        ...formData,
        tools: [...formData.tools, tool]
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

  const openReferenceModal = (index = null) => {
    if (index !== null) {
      const reference = formData.references[index]
      setNewReferenceText(reference.text)
      setNewReferenceName(reference.name)
      setEditingReferenceIndex(index)
    } else {
      setNewReferenceText('')
      setNewReferenceName('')
      setEditingReferenceIndex(null)
    }
    setIsModalOpen(true)
  }

  const closeReferenceModal = () => {
    setIsModalOpen(false)
    setNewReferenceText('')
    setNewReferenceName('')
    setEditingReferenceIndex(null)
  }

  const saveReference = () => {
    if (!newReferenceText.trim() || !newReferenceName.trim()) return
    
    // Sanitize name to only allow alphanumeric and underscores
    const sanitizedName = newReferenceName.replace(/[^a-zA-Z0-9_]/g, '')
    if (!sanitizedName) return

    if (editingReferenceIndex !== null) {
      // Editing existing reference
      const updatedReferences = [...formData.references]
      const oldName = updatedReferences[editingReferenceIndex].name
      updatedReferences[editingReferenceIndex] = {
        text: newReferenceText,
        name: sanitizedName,
        color: updatedReferences[editingReferenceIndex].color
      }
      
      setFormData(prev => {
        let updatedPrompt = prev.user_prompt
        
        // Update prompt if name changed
        if (oldName !== sanitizedName) {
          updatedPrompt = updatedPrompt.replace(
            new RegExp(`\\{${oldName}\\}`, 'g'), 
            `{${sanitizedName}}`
          )
        }
        
        return {
          ...prev,
          references: updatedReferences,
          user_prompt: updatedPrompt
        }
      })
    } else {
      // Adding new reference
      const color = REFERENCE_COLORS[formData.references.length % REFERENCE_COLORS.length]
      const newRef = {
        text: newReferenceText,
        name: sanitizedName,
        color
      }
      
      setFormData(prev => {
        let updatedPrompt = prev.user_prompt
        
        // Auto-insert placeholder in the appropriate location
        const lines = updatedPrompt.split('\n')
        const refSectionIndex = lines.findIndex(line => line.includes('References:'))
        
        if (refSectionIndex !== -1) {
          // Find the last reference placeholder
          let lastRefIndex = refSectionIndex
          for (let i = refSectionIndex + 1; i < lines.length; i++) {
            if (lines[i].trim().match(/^\{[\w_]+\}$/)) {
              lastRefIndex = i
            } else if (lines[i].trim() && !lines[i].trim().match(/^\{[\w_]+\}$/)) {
              break
            }
          }
          lines.splice(lastRefIndex + 1, 0, `{${sanitizedName}}`)
          updatedPrompt = lines.join('\n')
        }
        
        return {
          ...prev,
          references: [...prev.references, newRef],
          user_prompt: updatedPrompt
        }
      })
    }
    
    closeReferenceModal()
  }

  const deleteReference = (index) => {
    const refName = formData.references[index].name
    
    setFormData(prev => {
      // Remove from prompt
      const updatedPrompt = prev.user_prompt.replace(
        new RegExp(`\n?\\{${refName}\\}`, 'g'), 
        ''
      )
      
      return {
        ...prev,
        references: prev.references.filter((_, i) => i !== index),
        user_prompt: updatedPrompt
      }
    })
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

        {/* Opening Message Field */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
            <MessageSquare className="w-4 h-4" />
            Opening Message
          </label>
          <FormTextarea
            value={formData.opening_message}
            onChange={(e) => setFormData({...formData, opening_message: e.target.value})}
            placeholder="e.g., Hi! I'm your travel assistant. You can ask me questions about Morocco."
            rows={3}
          />
          <p className="text-xs text-text-quaternary">
            This message will be shown when users start a new chat with this assistant
          </p>
        </div>

        {formData.workflow === 'linear' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                <Database className="w-4 h-4 inline mr-2" />
                Collection Access (Optional)
              </label>
              {collections.length === 0 ? (
                <div className="p-4 bg-transparent border border-white/10 rounded-xl text-center">
                  <p className="text-text-tertiary text-sm">No knowledge bases available. You can still create an assistant without collections.</p>
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

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-text-secondary">
                  <ScrollText className="w-4 h-4 inline mr-2" />
                  Additional References
                </label>
                <button
                  type="button"
                  onClick={() => openReferenceModal()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-transparent hover:bg-white/5 border border-brand-teal/30 hover:border-brand-teal/50 rounded-lg transition-all text-brand-teal text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Reference
                </button>
              </div>
              
              {formData.references.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {formData.references.map((ref, index) => (
                    <div
                      key={ref.name}
                      className="group relative bg-transparent border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className={`px-2 py-1 rounded border font-mono text-xs font-semibold ${ref.color}`}>
                          {`{${ref.name}}`}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => openReferenceModal(index)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Edit reference"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-text-tertiary hover:text-white" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteReference(index)}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors"
                            title="Delete reference"
                          >
                            <X className="w-3.5 h-3.5 text-text-tertiary hover:text-red-400" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-tertiary line-clamp-2">{ref.text}</p>
                    </div>
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
              defaultSystemPrompt={DEFAULT_SYSTEM_PROMPT}
              defaultUserPrompt={DEFAULT_USER_PROMPT}
              defaultPreciseCitationSystem={DEFAULT_PRECISE_CITATION_SYSTEM}
              defaultPreciseCitationUser={DEFAULT_PRECISE_CITATION_USER}
            />
          </>
        )}

        {formData.workflow === 'agentic' && (
          <>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                <Sparkles className="w-4 h-4 inline mr-2" />
                Tool Selection
              </label>
              <div className="flex flex-wrap gap-2">
                {['tavily_search', 'wikipedia', 'calculator', 'web_scraper'].map(tool => (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all 
                      flex items-center gap-1
                      ${formData.tools.includes(tool)
                        ? 'border border-brand-teal/50 bg-white/5 text-white'
                        : 'bg-transparent text-text-tertiary border border-white/10 hover:border-brand-teal/30 hover:text-white'
                      }
                    `}
                  >
                    {formData.tools.includes(tool) && <Check className="w-3 h-3" />}
                    {tool.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                System Prompt
              </label>
              <textarea
                value={formData.agentic_system_prompt}
                onChange={(e) => setFormData({...formData, agentic_system_prompt: e.target.value})}
                placeholder="Enter system prompt for the agent..."
                rows="4"
                className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white font-mono text-sm"
                required
              />
            </div>

            <ModelSelector
              formData={formData}
              setFormData={setFormData}
              ollamaModels={ollamaModels}
              loadingModels={loadingModels}
              formatModelSize={formatModelSize}
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Max Steps
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.max_steps}
                onChange={(e) => setFormData({...formData, max_steps: parseInt(e.target.value)})}
                className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white"
              />
              <p className="text-xs text-text-quaternary mt-1">Maximum number of reasoning steps the agent can take</p>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-4">
          <Button
            type="submit"
            variant="standout"
            fullWidth
            loading={loading}
            disabled={!formData.assistant_name || (formData.workflow === 'agentic' && formData.tools.length === 0)}
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

        {/* Modal for adding/editing references */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeReferenceModal}></div>
            <div className="bg-background-elevated rounded-xl shadow-2xl w-full max-w-2xl border border-white/10 relative z-10">
              <div className="p-6 space-y-4">
                <h2 className="text-xl font-semibold text-white">
                  {editingReferenceIndex !== null ? 'Edit Reference' : 'Add Reference'}
                </h2>
                
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Reference Name (placeholder)
                  </label>
                  <input
                    value={newReferenceName}
                    onChange={(e) => setNewReferenceName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                    placeholder="e.g., company_policy"
                    className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white font-mono"
                  />
                  <p className="text-xs text-text-quaternary mt-1">
                    Use letters, numbers, and underscores only. Will appear as <code className="px-1.5 py-0.5 bg-white/5 rounded font-mono">{`{${newReferenceName || 'name'}}`}</code>
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    Reference Text
                  </label>
                  <textarea
                    value={newReferenceText}
                    onChange={(e) => setNewReferenceText(e.target.value)}
                    placeholder="Enter the full reference text that will be injected at runtime..."
                    rows="8"
                    className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white"
                  />
                  <p className="text-xs text-text-quaternary mt-1">
                    This text will replace the placeholder when the assistant runs
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={closeReferenceModal}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="standout"
                    onClick={saveReference}
                    disabled={!newReferenceName.trim() || !newReferenceText.trim()}
                  >
                    {editingReferenceIndex !== null ? 'Update' : 'Add'} Reference
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </form>
    </Card>
  )
}