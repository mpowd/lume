import { useState, useEffect } from 'react'
import { Play, Check, Loader2, AlertCircle, ArrowLeft, Sparkles, Cpu } from 'lucide-react'
import { evaluateAssistant, executeAssistant, getOllamaModelsIntegrationsOllamaModelsGet } from '../../api/generated'
import { OPENAI_MODELS } from '../../constants/models'
import Card from '../shared/Card'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'

const NON_LLM_KEYWORDS = ['embed', 'embedding', 'rerank', 'reranker', 'jina', 'mxbai', 'nomic', 'snowflake', 'bge']

export default function EvaluationRunner({ datasets, assistants, selectedDataset, onComplete, onCancel }) {
  const [currentDataset, setCurrentDataset] = useState(selectedDataset)
  const [selectedAssistants, setSelectedAssistants] = useState([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [results, setResults] = useState(null)
  const [error, setError] = useState(null)

  const [evalLLMProvider, setEvalLLMProvider] = useState('openai')
  const [evalLLMModel, setEvalLLMModel] = useState('gpt-4o-mini')
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingOllamaModels, setLoadingOllamaModels] = useState(false)

  useEffect(() => { loadOllamaModelsList() }, [])

  const loadOllamaModelsList = async () => {
    setLoadingOllamaModels(true)
    try {
      const data = await getOllamaModelsIntegrationsOllamaModelsGet()
      const models = data.models || []
      const filteredModels = models
        .filter(model => {
          const lowerName = (typeof model === 'string' ? model : model.name || '').toLowerCase()
          return !NON_LLM_KEYWORDS.some(keyword => lowerName.includes(keyword))
        })
        .map(m => typeof m === 'string' ? m : m.name)
        .sort()
      setOllamaModels(filteredModels)
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

  // Support both Orval format (assistant.config.*) and legacy flattened format
  const qaAssistants = assistants?.filter(a => {
    const isQA = a.type === 'qa'
    const isActive = a.is_active !== false
    return isQA && isActive
  }) || []

  const toggleAssistant = (assistantId) => {
    setSelectedAssistants(prev =>
      prev.includes(assistantId) ? prev.filter(id => id !== assistantId) : [...prev, assistantId]
    )
  }

  const handleProviderChange = (provider) => {
    setEvalLLMProvider(provider)
    if (provider === 'openai') setEvalLLMModel('gpt-4o-mini')
    else if (provider === 'ollama' && ollamaModels.length > 0) setEvalLLMModel(ollamaModels[0])
  }

  const runEvaluation = async () => {
    if (selectedAssistants.length === 0 || !currentDataset || !evalLLMModel) return

    setRunning(true)
    setError(null)
    setResults(null)

    const dataset = currentDataset
    const qaArrays = { questions: [], ground_truths: [], answers: [], contexts: [] }

    try {
      for (const assistantId of selectedAssistants) {
        const assistant = assistants.find(a => a._id === assistantId || a.id === assistantId)
        if (!assistant) throw new Error(`Assistant with ID ${assistantId} not found`)

        setProgress({ current: 0, total: dataset.qa_pairs.length, assistant: assistant.name })

        for (let i = 0; i < dataset.qa_pairs.length; i++) {
          const pair = dataset.qa_pairs[i]
          setProgress({ current: i + 1, total: dataset.qa_pairs.length, assistant: assistant.name })

          try {
            const response = await executeAssistant(assistantId, { input_data: { question: pair.question } })
            qaArrays.questions.push(pair.question)
            qaArrays.ground_truths.push(pair.ground_truth || pair.answer)
            qaArrays.answers.push(response.output?.response || response.output?.answer || '')
            qaArrays.contexts.push(response.output?.contexts || [])
          } catch (err) {
            console.error(`Error processing question ${i + 1}:`, err)
            qaArrays.questions.push(pair.question)
            qaArrays.ground_truths.push(pair.ground_truth || pair.answer)
            qaArrays.answers.push('')
            qaArrays.contexts.push([])
          }
        }

        const evalResult = await evaluateAssistant({
          dataset_name: dataset.name || dataset.dataset_name,
          assistant_id: assistantId,
          questions: qaArrays.questions,
          ground_truths: qaArrays.ground_truths,
          answers: qaArrays.answers,
          retrieved_contexts: qaArrays.contexts,
          eval_llm_model: evalLLMModel,
          eval_llm_provider: evalLLMProvider,
        })

        setResults(prev => ({ ...prev, [assistantId]: evalResult }))
        qaArrays.questions = []
        qaArrays.ground_truths = []
        qaArrays.answers = []
        qaArrays.contexts = []
      }

      setRunning(false)
      setTimeout(() => onComplete(), 2000)
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
          <button onClick={onCancel} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">Run Evaluation</h2>
          <p className="text-slate-400">Test assistants against your evaluation dataset</p>
        </div>

        {/* Dataset Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">Select Dataset</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {datasets.map((dataset) => (
              <button key={dataset._id || dataset.id} onClick={() => setCurrentDataset(dataset)} disabled={running}
                className={`p-4 rounded-xl border-2 transition-all text-left ${(currentDataset?._id || currentDataset?.id) === (dataset._id || dataset.id) ? 'border-brand-teal bg-brand-teal/10' : 'border-white/10 hover:border-white/20 bg-slate-950/30'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-white">{dataset.name || dataset.dataset_name}</span>
                  {(currentDataset?._id || currentDataset?.id) === (dataset._id || dataset.id) && <Check className="w-5 h-5 text-brand-teal" />}
                </div>
                <p className="text-sm text-slate-400">{dataset.qa_pairs?.length || 0} Q&A pairs</p>
              </button>
            ))}
          </div>
        </div>

        {/* Assistant Selection */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-3">Select Assistants to Evaluate</label>
          {qaAssistants.length === 0 ? (
            <EmptyState icon={AlertCircle} title="No Assistants Available" description="Create a Q&A assistant first to run evaluations." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {qaAssistants.map((assistant) => {
                const assistantId = assistant._id || assistant.id
                const config = assistant.config || {}
                return (
                  <button key={assistantId} onClick={() => toggleAssistant(assistantId)} disabled={running}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${selectedAssistants.includes(assistantId) ? 'border-brand-teal bg-brand-teal/10' : 'border-white/10 hover:border-white/20 bg-slate-950/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">{assistant.name}</span>
                      {selectedAssistants.includes(assistantId) && <Check className="w-5 h-5 text-brand-teal" />}
                    </div>
                    {assistant.description && <p className="text-sm text-slate-400 line-clamp-1">{assistant.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                      <span className="px-2 py-0.5 bg-slate-800 rounded">{assistant.type || 'qa'}</span>
                      {(config.knowledge_base_ids || []).length > 0 && <span>{config.knowledge_base_ids.length} collections</span>}
                      {config.llm_model && <span>{config.llm_model}</span>}
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
            <Sparkles className="w-4 h-4 text-brand-teal" />
            <label className="text-sm font-medium text-slate-300">Evaluation LLM</label>
          </div>
          <p className="text-xs text-slate-400 mb-4">This model will evaluate the quality of responses against ground truth</p>

          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10 mb-4">
            <button type="button" onClick={() => handleProviderChange('openai')} disabled={running}
              className={`py-2.5 rounded-lg font-medium transition-all ${evalLLMProvider === 'openai' ? 'bg-brand-teal text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              OpenAI
            </button>
            <button type="button" onClick={() => handleProviderChange('ollama')} disabled={running}
              className={`py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${evalLLMProvider === 'ollama' ? 'bg-white/10 text-white border border-white/20 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              Ollama {loadingOllamaModels && <Loader2 className="w-3 h-3 animate-spin" />}
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {evalLLMProvider === 'openai' ? (
              OPENAI_MODELS.map(model => (
                <button key={model} type="button" onClick={() => setEvalLLMModel(model)} disabled={running}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${evalLLMModel === model ? 'bg-brand-teal text-white shadow-lg border-2 border-brand-teal' : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'}`}>
                  {model}
                </button>
              ))
            ) : (
              <>
                {loadingOllamaModels ? (
                  <div className="col-span-full flex items-center justify-center py-8"><Loader2 className="w-6 h-6 text-blue-400 animate-spin" /></div>
                ) : ollamaModels.length === 0 ? (
                  <div className="col-span-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                    <p className="text-orange-400 text-sm">No Ollama models found. Make sure Ollama is running and has models installed.</p>
                  </div>
                ) : (
                  ollamaModels.map(model => (
                    <button key={model} type="button" onClick={() => setEvalLLMModel(model)} disabled={running}
                      className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${evalLLMModel === model ? 'bg-white/10 text-white border-2 border-white/30 shadow-lg' : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'}`}>
                      {model}
                    </button>
                  ))
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div><p className="text-red-400 font-medium mb-1">Evaluation Failed</p><p className="text-sm text-red-400/80">{error}</p></div>
            </div>
          </div>
        )}

        {running && (
          <div className="mb-6 p-6 rounded-xl bg-brand-teal/10 border border-brand-teal/20">
            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
            <p className="text-brand-teal font-medium">Running Evaluation...</p>
            {progress.assistant && <p className="text-sm text-brand-teal/80">Testing {progress.assistant}: {progress.current} / {progress.total} questions</p>}
            <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden">
              <div className="h-full bg-brand-teal transition-all duration-300" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
            </div>
          </div>
        )}

        {results && (
          <div className="mb-6 p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <Check className="w-6 h-6 text-emerald-400" />
              <div><p className="text-emerald-400 font-medium">Evaluation Complete!</p><p className="text-sm text-emerald-400/80">Results have been saved. Redirecting to results...</p></div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="primary" onClick={runEvaluation} disabled={running || selectedAssistants.length === 0 || !currentDataset || !evalLLMModel} loading={running} icon={Play} fullWidth>
            {running ? 'Running Evaluation...' : 'Start Evaluation'}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={running}>Cancel</Button>
        </div>
      </Card>
    </div>
  )
}
