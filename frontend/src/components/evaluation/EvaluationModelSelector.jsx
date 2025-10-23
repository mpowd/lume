import { useState, useEffect, useMemo } from 'react'
import { Cpu, Lock, Loader2 } from 'lucide-react'
import { ollamaAPI } from '../../services/api'

const OPENAI_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']

const NON_LLM_KEYWORDS = [
  'embed', 'embedding', 'rerank', 'reranker', 
  'jina', 'mxbai', 'nomic', 'snowflake', 'bge'
]

export default function EvaluationModelSelector({ 
  llmProvider, 
  llmModel, 
  onProviderChange, 
  onModelChange 
}) {
  const [ollamaModels, setOllamaModels] = useState([])
  const [loadingModels, setLoadingModels] = useState(false)

  useEffect(() => {
    loadOllamaModels()
  }, [])

  const loadOllamaModels = async () => {
    setLoadingModels(true)
    try {
      const response = await ollamaAPI.getModels()
      const chatModels = (response.models || [])
        .filter(m => !NON_LLM_KEYWORDS.some(keyword => m.name.toLowerCase().includes(keyword)))
        .map(m => ({ name: m.name, size: m.size }))
        .sort((a, b) => a.size - b.size)
      setOllamaModels(chatModels)
    } catch (err) {
      console.error('Error loading Ollama models:', err)
    } finally {
      setLoadingModels(false)
    }
  }

  const formatModelSize = (bytes) => {
    const gb = bytes / (1024 ** 3)
    return gb < 1 ? `${(gb * 1024).toFixed(0)}MB` : `${gb.toFixed(1)}GB`
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-300">
          <Cpu className="w-4 h-4 inline mr-2" />
          Evaluation LLM
        </label>
        <p className="text-xs text-slate-500">
          This model will be used to evaluate responses using metrics like faithfulness and relevancy
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/50 rounded-xl border border-white/10">
        <button
          type="button"
          onClick={() => {
            onProviderChange('openai')
            onModelChange('gpt-4o-mini')
          }}
          className={`py-2.5 rounded-lg font-medium transition-all ${
            llmProvider === 'openai'
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          OpenAI
        </button>
        <button
          type="button"
          onClick={() => {
            onProviderChange('ollama')
            const firstOllama = ollamaModels[0]?.name || 'mistral'
            onModelChange(firstOllama)
          }}
          className={`py-2.5 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${
            llmProvider === 'ollama'
              ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Ollama
          {loadingModels && <Loader2 className="w-3 h-3 animate-spin" />}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {llmProvider === 'openai' ? (
          OPENAI_MODELS.map(model => (
            <button
              key={model}
              type="button"
              onClick={() => onModelChange(model)}
              className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                llmModel === model
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
                  key={model.name}
                  type="button"
                  onClick={() => onModelChange(model.name)}
                  className={`py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    llmModel === model.name
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg ring-2 ring-orange-400/50'
                      : 'bg-slate-950/50 text-slate-400 border border-white/10 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col items-start gap-1 w-full">
                    <span className="truncate w-full text-left">{model.name}</span>
                    <span className={`text-xs ${llmModel === model.name ? 'text-white/70' : 'text-slate-500'}`}>
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
  )
}