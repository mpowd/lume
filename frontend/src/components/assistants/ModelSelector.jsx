import { useMemo } from 'react'
import { Cpu, Lock, Loader2 } from 'lucide-react'
import { OPENAI_MODELS } from '../../constants/models'

// Keywords to filter out non-LLM models
const NON_LLM_KEYWORDS = [
  'embed', 'embedding', 'rerank', 'reranker', 
  'jina', 'mxbai', 'nomic', 'snowflake', 'bge'
]

export default function ModelSelector({ 
  formData, 
  setFormData, 
  ollamaModels, 
  loadingModels,
  formatModelSize 
}) {
  // Filter out embedding and reranking models, then sort by size (smallest first)
  const filteredOllamaModels = useMemo(() => {
    return ollamaModels
      .filter(model => {
        const lowerName = model.name.toLowerCase()
        return !NON_LLM_KEYWORDS.some(keyword => lowerName.includes(keyword))
      })
      .sort((a, b) => a.size - b.size)
  }, [ollamaModels])

  return (
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
            const firstOllama = filteredOllamaModels[0]?.name || 'mistral'
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
            ) : filteredOllamaModels.length === 0 ? (
              <div className="col-span-full p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                <p className="text-orange-400 text-sm">No Ollama models found. Make sure Ollama is running.</p>
              </div>
            ) : (
              filteredOllamaModels.map(model => (
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
  )
}