import { useState, useEffect } from 'react'
import { Sparkles, Database, Check, Lock, Plus, ScrollText } from 'lucide-react'
import { useCollections } from '../../hooks/useCollections'
import { ollamaAPI } from '../../services/api'
import FormInput from '../shared/FormInput'
import Button from '../shared/Button'
import Card from '../shared/Card'
import ModelSelector from './ModelSelector'
import AdvancedSettings from './AdvancedSettings'
import { formatModelSize } from '../../utils/formatters'

const DEFAULT_PROMPT = `Answer the question using only the context provided.

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

  const [showForm, setShowForm] = useState(false);
  const [newReferenceText, setNewReferenceText] = useState('');
  const [newReferenceName, setNewReferenceName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReferenceIndex, setEditingReferenceIndex] = useState(null);

  const openReferenceModal = (index) => {
    const reference = formData.references[index];
    setNewReferenceText(reference.text);
    setNewReferenceName(reference.name);
    setIsModalOpen(true);
    setEditingReferenceIndex(index);
  };

  // Initialize formData with default values
  const [formData, setFormData] = useState({
    assistant_name: '',
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
    prompt: DEFAULT_PROMPT,
    precise_citation_prompt: DEFAULT_PRECISE_CITATION_PROMPT,
    tools: [],
    max_steps: 4,
    precise_citation: false,
    system_prompt: 'Search Tavily for the given query and return the results.'
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
        references: assistant.references || [],
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
        prompt: assistant.prompt || DEFAULT_PROMPT,
        precise_citation_prompt: assistant.precise_citation_prompt || DEFAULT_PRECISE_CITATION_PROMPT,
        tools: assistant.tools || [],
        max_steps: assistant.max_steps || 4,
        precise_citation: assistant.precise_citation ?? false,
        system_prompt: assistant.system_prompt || 'Search Tavily for the given query and return the results.'
      })
    }
  }, [assistant])

  useEffect(() => {
    const updatePrompts = () => {
      // Skip prompt updates when loading an existing assistant
      if (assistant) {
        return;
      }
      
      const hasCollections = formData.collections && formData.collections.length > 0;
      const hasReferences = formData.references && formData.references.length > 0;
      
      let newPrompt = DEFAULT_PROMPT;
      let newPreciseCitationPrompt = DEFAULT_PRECISE_CITATION_PROMPT;
      
      if (!hasCollections && !hasReferences) {
        // Case 4: No collections, no references
        newPrompt = `Answer the question based on the provided reference.
        
  User Question: {question}`;
      } else if (hasCollections && !hasReferences) {
        // Case 1: Collections, no references
        newPrompt = `Answer the question using only the context provided.

  Retrieved Context: {context}

  User Question: {question}

  Answer conversationally. User is not aware of context.`;
      } else if (hasCollections && hasReferences) {
        // Case 2: Collections and references
        const refPlaceholders = formData.references.map((_, i) => `{reference${i+1}}`).join('\n');
        newPrompt = `Answer the question using the context and references provided.

  Retrieved Context: {context}

  ${refPlaceholders}

  User Question: {question}

  Answer conversationally. User is not aware of context.`;
      } else if (!hasCollections && hasReferences) {
        // Case 3: No collections, references
        const refPlaceholders = formData.references.map(ref => `${ref.name}: ${ref.text}`).join('\n');
        newPrompt = `Answer the question based on the provided references.

  ${refPlaceholders}

  User Question: {question}`;
      }
      
      setFormData(prev => ({
        ...prev,
        prompt: newPrompt,
        precise_citation_prompt: newPreciseCitationPrompt
      }));
    };
    
    updatePrompts();
  }, [formData.collections, formData.references]);

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

  const addReference = () => {
    if (!newReferenceText.trim() || !newReferenceName.trim()) return;
    
    if (editingReferenceIndex !== null) {
      // Editing existing reference
      const updatedReferences = [...formData.references];
      updatedReferences[editingReferenceIndex] = {
        text: newReferenceText,
        name: newReferenceName
      };
      setFormData(prev => ({
        ...prev,
        references: updatedReferences
      }));
    } else {
      // Adding new reference
      const newPrompt = formData.prompt.replace(
        '{question}',
        `{question}\n\nReference ${formData.references.length}: {reference${formData.references.length}}`
      );
      setFormData(prev => ({
        ...prev,
        references: [...prev.references, {
          text: newReferenceText,
          name: newReferenceName
        }]
      }));
    }
    
    // Reset modal
    setIsModalOpen(false);
    setNewReferenceText('');
    setNewReferenceName('');
    setEditingReferenceIndex(null);
  };

  const deleteReference = (index) => {
    // Update prompts when deleting references
    setFormData(prevState => {
      const updatedReferences = prevState.references.filter((_, i) => i !== index);
      const newPrompt = updatedReferences.reduce((prompt, ref, i) => {
        return prompt.replace(`\n\nReference ${i+1}: {reference${i+1}}`, '');
      }, prevState.prompt);
      
      return {
        ...prevState,
        references: updatedReferences,
        prompt: newPrompt
      };
    });
  };

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
                Collection Access
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

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary mb-3">
                <ScrollText className="w-4 h-4 inline mr-2" />
                Additional references
              </label>
              {formData.references.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.references.map((ref, index) => (
                    <div key={ref.name} className="relative group">
                      <button
                        type="button"
                        onClick={() => openReferenceModal(index)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-all 
                          flex items-center gap-1
                          bg-white/5 border border-white/10 hover:border-brand-teal/50 hover:text-white
                        `}
                      >
                        {ref.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReference(index)}
                        className="absolute -top-1 -right-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Delete reference"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(true);
                  setEditingReferenceIndex(null);
                }} 
                className="p-2 bg-transparent hover:bg-white/5 border border-brand-teal/30 hover:border-brand-teal/50 rounded-xl transition-all"
              >
                <Plus className="w-4 h-4 text-brand-teal" />
              </button>
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
              defaultPrompt={DEFAULT_PROMPT}
              defaultPreciseCitationPrompt={DEFAULT_PRECISE_CITATION_PROMPT}
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
                value={formData.system_prompt}
                onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
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
            disabled={!formData.assistant_name || (formData.workflow === 'linear' && formData.collections.length === 0 && formData.references.length === 0) || (formData.workflow === 'agentic' && formData.tools.length === 0)}
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

        {/* Modal for adding references */}
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
            <div className="bg-background-elevated rounded-xl shadow-xl w-full max-w-md border border-white/10 relative z-10">
              <div className="p-6">
                <h2 className="text-xl font-semibold text-white mb-4">
                  {editingReferenceIndex !== null ? 'Edit Reference' : 'Add Reference'}
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Reference Text</label>
                    <textarea
                      value={newReferenceText}
                      onChange={(e) => setNewReferenceText(e.target.value)}
                      placeholder="Enter reference text here"
                      rows="4"
                      className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-text-secondary mb-1">Reference Name</label>
                    <input
                      value={newReferenceName}
                      onChange={(e) => setNewReferenceName(e.target.value)}
                      placeholder="Enter reference name here"
                      className="w-full border border-white/10 rounded-lg px-3 py-2 focus:outline-none bg-background-elevated focus:border-brand-teal text-white"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setIsModalOpen(false);
                      setNewReferenceText('');
                      setNewReferenceName('');
                      setEditingReferenceIndex(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="standout"
                    onClick={addReference}
                    disabled={!newReferenceText.trim() || !newReferenceName.trim()}
                  >
                    {editingReferenceIndex !== null ? 'Edit Reference' : 'Add Reference'}
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