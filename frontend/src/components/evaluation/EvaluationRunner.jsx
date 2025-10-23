import { useState, useEffect } from 'react'
import { Play, Check, Loader2, AlertCircle, ArrowLeft, Sparkles, Cpu } from 'lucide-react'
import { evaluationAPI, executionAPI, ollamaAPI } from '../../services/api'
import { OPENAI_MODELS } from '../../constants/models'
import Card from '../shared/Card'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'

// Keywords to filter out non-LLM models
const NON_LLM_KEYWORDS = [
  'embed', 'embedding', 'rerank', 'reranker', 
  'jina', 'mxbai', 'nomic', 'snowflake', 'bge'
]

export default function EvaluationRunner({ datasets, assistants, selectedDataset, onComplete, onCancel }) {
  const [currentDataset, setCurrentDataset] = useState(selectedDataset)
  const [selectedAssistants, setSelectedAssistants] = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)
  
  // LLM Selection State
  const [evalLLMProvider, setEvalLLMProvider] = useState('openai')
  const [evalLLMModel, setEvalLLMModel] = useState('gpt-4o-mini')
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false)

  // Debug: Log the assistants prop
  useEffect(() => {
    console.log('EvaluationRunner - All assistants:', assistants)
    console.log('EvaluationRunner - Assistants structure:', assistants?.[0])
  }, [assistants])

  // Load Ollama models on mount
  useEffect(() => {
    loadOllamaModels()
  }, [])

  const loadOllamaModels = async () => {
    setLoadingOllamaModels(true)
    try {
      const data = await ollamaAPI.getModels()
      const models = data.models || []
      
      // Filter and sort models
      const filteredModels = models
        .filter(model => {
          const lowerName = model.toLowerCase()
          return !NON_LLM_KEYWORDS.some(keyword => lowerName.includes(keyword))
        })
        .sort()
      
      setOllamaModels(filteredModels)
      
      // Set first Ollama model if provider is ollama and no model selected
      if (evalLLMProvider === 'ollama' && !evalLLMModel && filteredModels.length > 0) {
        setEvalLLMModel(filteredModels[0])
      }
    } catch (error) {
      console.error('Error loading Ollama models:', error)
      setOllamaModels([])
    } finally {
      setLoadingOllamaModels(false)
    }
  }

  // Filter to only Q&A assistants that are active
  const qaAssistants = assistants?.filter(a => {
    const isQA = a.type === 'qa'
    const isActive = a.is_active !== false
    console.log(`Assistant ${a.name}: type=${a.type}, is_active=${a.is_active}, included=${isQA && isActive}`)
    return isQA && isActive
  }) || []

  console.log('Filtered QA assistants for evaluation:', qaAssistants)

  const toggleAssistant = (assistantId) => {
    setSelectedAssistants(prev =>
      prev.includes(assistantId)
        ? prev.filter(id => id !== assistantId)
        : [...prev, assistantId]
    )
  }

  const handleProviderChange = (provider) => {
    setEvalLLMProvider(provider)
    if (provider === 'openai') {
      setEvalLLMModel('gpt-4o-mini')
    } else if (provider === 'ollama' && ollamaModels.length > 0) {
      setEvalLLMModel(ollamaModels[0])
    }
  }

  const formatModelSize = (bytes) => {
    const gb = bytes / (1024 * 1024 * 1024)
    return `${gb.toFixed(1)}GB`
  }

  const runEvaluation = async () => {
    if (selectedAssistants.length === 0) {
      alert('Please select at least one assistant to evaluate')
      return
    }

    if (!currentDataset) {
      alert('Please select a dataset')
      return
    }

    if (!evalLLMModel) {
      alert('Please select an evaluation LLM')
      return
    }

    setRunning(true)
    setError(null)
    setResults(null)
    
    const dataset = currentDataset
    const qaArrays = {
      questions: [],
      ground_truths: [],
      answers: [],
      contexts: []
    }

    try {
      // Run each assistant
      for (const assistantId of selectedAssistants) {
        // Support both _id and id fields
        const assistant = assistants.find(a => a._id === assistantId || a.id === assistantId)
        if (!assistant) {
          throw new Error(`Assistant with ID ${assistantId} not found`)
        }

        setProgress({ current: 0, total: dataset.qa_pairs.length, assistant: assistant.name })

        // Run each question
        for (let i = 0; i < dataset.qa_pairs.length; i++) {
          const pair = dataset.qa_pairs[i]
          setProgress({ 
            current: i + 1, 
            total: dataset.qa_pairs.length, 
            assistant: assistant.name 
          })

          const response = await executionAPI.executeQA(assistantId, pair.question)
          
          qaArrays.questions.push(pair.question)
          qaArrays.ground_truths.push(pair.ground_truth || pair.answer)
          qaArrays.answers.push(response.response)
          qaArrays.contexts.push(response.contexts || [])
        }

        // Evaluate this assistant with selected LLM
        const evalResult = await evaluationAPI.evaluateAssistant(
          dataset.name || dataset.dataset_name,
          assistantId,
          qaArrays.questions,
          qaArrays.ground_truths,
          qaArrays.answers,
          qaArrays.contexts,
          evalLLMModel,
          evalLLMProvider
        )

        setResults(prev => ({
          ...prev,
          [assistantId]: evalResult
        }))

        // Clear for next assistant
        qaArrays.questions = []
        qaArrays.ground_truths = []
        qaArrays.answers = []
        qaArrays.contexts = []
      }

      setRunning(false)
      setTimeout(() => {
        onComplete()
      }, 2000)
    } catch (err) {
      console.error('Evaluation error:', err)
      setError(err.response?.data?.detail || err.message || 'Failed to run evaluation')
      setRunning(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card className="p-8">
        <div className="mb-6">
          <button
            onClick={onCancel}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">Run Evaluation</h2>
          <p className="text-slate-400">Test assistants against your evaluation dataset</p>
        </div>

        {/* Dataset Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select Dataset
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {datasets.map((dataset) => (
              <button
                key={dataset._id}
                onClick={() => setCurrentDataset(dataset)}
                disabled={running}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  currentDataset?._id === dataset._id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/30'
                } ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">
                    {dataset.name || dataset.dataset_name}
                  </span>
                  {currentDataset?._id === dataset._id && (
                    <Check className="w-5 h-5 text-blue-400" />
                  )}
                </div>
                <p className="text-sm text-slate-400">
                  {dataset.qa_pairs?.length || 0} Q&A pairs
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Assistant Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Select Assistants to Evaluate
          </label>
          {qaAssistants.length === 0 ? (
            <div className="space-y-4">
              <EmptyState
                icon={AlertCircle}
                title="No Assistants Available"
                description="Create a Q&A assistant first to run evaluations."
              />
              
              {/* Debug Info */}
              {assistants && assistants.length > 0 && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-amber-400 font-medium mb-1">Assistants Found But Not Shown</p>
                      <p className="text-sm text-amber-400/80 mb-2">
                        You have {assistants.length} assistant(s), but they might not be configured correctly for evaluation.
                      </p>
                      <p className="text-xs text-amber-400/60">
                        Make sure your assistants have type='qa' and is_active=true. Check the browser console for details.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qaAssistants.map((assistant) => {
                const assistantId = assistant._id || assistant.id
                
                return (
                  <button
                    key={assistantId}
                    onClick={() => toggleAssistant(assistantId)}
                    disabled={running}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedAssistants.includes(assistantId)
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 hover:border-white/20 bg-slate-950/30'
                    } ${running ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{assistant.name}</span>
                      {selectedAssistants.includes(assistantId) && (
                        <Check className="w-5 h-5 text-purple-400" />
                      )}
                    </div>
                    {assistant.description && (
                      <p className="text-sm text-slate-400 line-clamp-1">
                        {assistant.description}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-800 rounded">
                        {assistant.type || 'qa'}
                      </span>
                      {assistant.collections && assistant.collections.length > 0 && (
                        <span>{assistant.collections.length} collections</span>
                      )}
                      {assistant.llm && (
                        <span>{assistant.llm}</span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Evaluation LLM Selection */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <label className="text-sm font-medium text-slate-300">
              Evaluation LLM
            </label>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            This model will evaluate the quality of responses against ground truth
          </p>

          {/* Provider Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10 mb-4">
            <button
              type="button"
              onClick={() => handleProviderChange('openai')}
              disabled={running}
              className={`py-2.5 rounded-lg font-medium transition-all ${
                evalLLMProvider === 'openai'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              OpenAI
            </button>
            <button
              type="button"
              onClick={() => handleProviderChange('ollama')}
              disabled={running}
              className={`py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
                evalLLMProvider === 'ollama'
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Ollama
              {loadingOllamaModels && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          </div>

          {/* Model Selection */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {evalLLMProvider === 'openai' ? (
              OPENAI_MODELS.map(model => (
                <button
                  key={model}
                  type="button"
                  onClick={() => setEvalLLMModel(model)}
                  disabled={running}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    evalLLMModel === model
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-emerald-400/50'
                      : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                  } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {model}
                </button>
              ))
            ) : (
              <>
                {loadingOllamaModels ? (
                  <div className="col-span-full flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                  </div>
                ) : ollamaModels.length === 0 ? (
                  <div className="col-span-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <p className="text-orange-400 text-sm">
                      No Ollama models found. Make sure Ollama is running and has models installed.
                    </p>
                  </div>
                ) : (
                  ollamaModels.map(model => (
                    <button
                      key={model}
                      type="button"
                      onClick={() => setEvalLLMModel(model)}
                      disabled={running}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                        evalLLMModel === model
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg ring-2 ring-orange-400/50'
                          : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                      } ${running ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {model}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-400 font-medium mb-1">Evaluation Failed</p>
                <p className="text-sm text-red-400/80">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress */}
        {running && (
          <div className="mb-6 p-6 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              <div>
                <p className="text-blue-400 font-medium">Running Evaluation...</p>
                {progress.assistant && (
                  <p className="text-sm text-blue-400/80">
                    Testing {progress.assistant}: {progress.current} / {progress.total} questions
                  </p>
                )}
              </div>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                style={{ width: `${(progress.current / progress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Results Preview */}
        {results && (
          <div className="mb-6 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-emerald-400" />
              <div>
                <p className="text-emerald-400 font-medium">Evaluation Complete!</p>
                <p className="text-sm text-emerald-400/80">
                  Results have been saved. Redirecting to results...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Button */}
        <div className="flex gap-3">
          <Button
            variant="primary"
            onClick={runEvaluation}
            disabled={running || selectedAssistants.length === 0 || !currentDataset || !evalLLMModel}
            loading={running}
            icon={Play}
            fullWidth
          >
            {running ? 'Running Evaluation...' : 'Start Evaluation'}
          </Button>
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={running}
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  )
}