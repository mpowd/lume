import { Settings, Target, Lock, AlertCircle } from 'lucide-react'
import { COHERE_RERANKERS, HUGGINGFACE_RERANKERS } from '../../constants/models'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Accordion from '../shared/Accordion'

export default function AdvancedSettings({ 
  formData, 
  setFormData, 
  showAdvanced, 
  setShowAdvanced,
  defaultRagPrompt,
  defaultPreciseCitationPrompt 
}) {
  return (
    <Accordion
      title="Advanced Settings"
      icon={Settings}
      isOpen={showAdvanced}
      onToggle={() => setShowAdvanced(!showAdvanced)}
    >
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
            <FormInput
              label="Top K Results"
              type="number"
              value={formData.top_k}
              onChange={(e) => setFormData({...formData, top_k: parseInt(e.target.value) || 10})}
              min="1"
              max="100"
            />

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

                <FormInput
                  label="Top N (after reranking)"
                  type="number"
                  value={formData.top_n}
                  onChange={(e) => setFormData({...formData, top_n: parseInt(e.target.value) || 5})}
                  min="1"
                  max={formData.top_k}
                />
              </>
            )}
          </div>
        </div>

        {/* Prompt Configuration Section */}
        <div className="pt-6 border-t border-white/10 space-y-4">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-300">Prompt Configuration</h3>
            {formData.precise_citation && (
              <div className="px-2 py-0.5 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300 font-medium">
                Precise Citation Mode
              </div>
            )}
          </div>

          {/* Show the appropriate prompt based on precise_citation setting */}
          {formData.precise_citation ? (
            <>
              {/* Info box explaining precise citation mode */}
              <div className="flex gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-200">
                  <p className="font-medium mb-1">Precise Citation Mode Active</p>
                  <p className="text-xs text-blue-300">
                    This prompt uses structured output to track which context chunks are used. 
                    Required placeholders: <code className="bg-blue-900/30 px-1 rounded text-blue-100">{'{context_with_indices}'}</code>, <code className="bg-blue-900/30 px-1 rounded text-blue-100">{'{question}'}</code>, <code className="bg-blue-900/30 px-1 rounded text-blue-100">{'{format_instructions}'}</code>
                  </p>
                </div>
              </div>

              <FormTextarea
                label="Precise Citation Prompt"
                value={formData.precise_citation_prompt}
                onChange={(e) => setFormData({...formData, precise_citation_prompt: e.target.value})}
                rows={10}
                className="font-mono text-sm"
              />
              
              <button
                type="button"
                onClick={() => setFormData({...formData, precise_citation_prompt: defaultPreciseCitationPrompt})}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Reset to default precise citation prompt
              </button>
            </>
          ) : (
            <>
              {/* Info box explaining standard mode */}
              <div className="flex gap-3 p-3 bg-slate-800/50 border border-white/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-slate-300">
                  <p className="font-medium mb-1">Standard RAG Mode</p>
                  <p className="text-xs text-slate-400">
                    This prompt generates answers using all retrieved context. 
                    Required placeholders: <code className="bg-slate-700/50 px-1 rounded text-slate-300">{'{context}'}</code>, <code className="bg-slate-700/50 px-1 rounded text-slate-300">{'{question}'}</code>
                  </p>
                </div>
              </div>

              <FormTextarea
                label="RAG Prompt Template"
                value={formData.rag_prompt}
                onChange={(e) => setFormData({...formData, rag_prompt: e.target.value})}
                rows={6}
                className="font-mono text-sm"
              />
              
              <button
                type="button"
                onClick={() => setFormData({...formData, rag_prompt: defaultRagPrompt})}
                className="text-xs text-slate-400 hover:text-white transition-colors"
              >
                Reset to default RAG prompt
              </button>
            </>
          )}
        </div>
      </div>
    </Accordion>
  )
}