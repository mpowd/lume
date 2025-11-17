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
      <div className="space-y-6 p-6 bg-transparent rounded-xl border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-transparent border border-white/10 rounded-xl hover:border-white/20 transition-all group cursor-pointer">
              <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">Hybrid Search</span>
              <input
                type="checkbox"
                checked={formData.hybrid_search}
                onChange={(e) => setFormData({...formData, hybrid_search: e.target.checked})}
                className="w-5 h-5 rounded-lg cursor-pointer accent-brand-teal"
              />
            </label>
            
            <label className="flex items-center justify-between p-4 bg-transparent border border-white/10 rounded-xl hover:border-white/20 transition-all group cursor-pointer">
              <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">HyDE</span>
              <input
                type="checkbox"
                checked={formData.hyde}
                onChange={(e) => setFormData({...formData, hyde: e.target.checked})}
                className="w-5 h-5 rounded-lg cursor-pointer accent-brand-teal"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-transparent border border-white/10 rounded-xl hover:border-white/20 transition-all group cursor-pointer">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-teal" />
                <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">Precise Citation</span>
              </div>
              <input
                type="checkbox"
                checked={formData.precise_citation}
                onChange={(e) => setFormData({...formData, precise_citation: e.target.checked})}
                className="w-5 h-5 rounded-lg cursor-pointer accent-brand-teal"
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

            <label className="flex items-center justify-between p-4 bg-transparent border border-white/10 rounded-xl hover:border-white/20 transition-all group cursor-pointer">
              <span className="text-sm font-medium text-text-secondary group-hover:text-white transition-colors">Enable Reranking</span>
              <input
                type="checkbox"
                checked={formData.reranking}
                onChange={(e) => setFormData({...formData, reranking: e.target.checked})}
                className="w-5 h-5 rounded-lg cursor-pointer accent-brand-teal"
              />
            </label>

            {formData.reranking && (
              <>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">Reranker Provider</label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-transparent rounded-xl border border-white/10">
                    <button
                      type="button"
                      onClick={() => !formData.local_only && setFormData({
                        ...formData, 
                        reranker_provider: 'cohere',
                        reranker_model: 'rerank-v3.5'
                      })}
                      disabled={formData.local_only}
                      className={`
                        py-2.5 rounded-lg font-medium transition-all
                        ${formData.reranker_provider === 'cohere'
                          ? 'border border-brand-teal/50 bg-white/5 text-white'
                          : formData.local_only
                          ? 'border border-transparent text-text-disabled cursor-not-allowed'
                          : 'border border-transparent text-text-tertiary hover:text-white hover:border-white/10'
                        }
                      `}
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
                      className={`
                        py-2.5 rounded-lg font-medium transition-all
                        ${formData.reranker_provider === 'huggingface'
                          ? 'border border-brand-teal/50 bg-white/5 text-white'
                          : 'border border-transparent text-text-tertiary hover:text-white hover:border-white/10'
                        }
                      `}
                    >
                      HuggingFace
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">Reranker Model</label>
                  <div className="grid grid-cols-1 gap-2">
                    {formData.reranker_provider === 'cohere' ? (
                      COHERE_RERANKERS.map(model => (
                        <button
                          key={model}
                          type="button"
                          onClick={() => setFormData({...formData, reranker_model: model})}
                          className={`
                            py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-left
                            ${formData.reranker_model === model
                              ? 'border border-brand-teal/50 bg-white/5 text-white shadow-[0_0_20px_rgb(20,184,166,0.15)]'
                              : 'bg-transparent text-text-tertiary border border-white/10 hover:border-white/20 hover:text-white'
                            }
                          `}
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
                          className={`
                            py-2.5 px-4 rounded-xl text-sm font-medium transition-all text-left
                            ${formData.reranker_model === model
                              ? 'border border-brand-teal/50 bg-white/5 text-white shadow-[0_0_20px_rgb(20,184,166,0.15)]'
                              : 'bg-transparent text-text-tertiary border border-white/10 hover:border-white/20 hover:text-white'
                            }
                          `}
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
            <h3 className="text-sm font-semibold text-text-secondary">Prompt Configuration</h3>
            {formData.precise_citation && (
              <div className="px-2 py-0.5 bg-info-bg border border-info-border rounded text-xs text-info font-medium">
                Precise Citation Mode
              </div>
            )}
          </div>

          {/* Show the appropriate prompt based on precise_citation setting */}
          {formData.precise_citation ? (
            <>
              {/* Info box explaining precise citation mode */}
              <div className="flex gap-3 p-3 bg-info-bg border border-info-border rounded-lg">
                <AlertCircle className="w-5 h-5 text-info flex-shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary">
                  <p className="font-medium mb-1 text-white">Precise Citation Mode Active</p>
                  <p className="text-xs text-text-tertiary">
                    This prompt uses structured output to track which context chunks are used. 
                    Required placeholders: <code className="bg-white/5 px-1 rounded text-text-secondary">{'{context_with_indices}'}</code>, <code className="bg-white/5 px-1 rounded text-text-secondary">{'{question}'}</code>, <code className="bg-white/5 px-1 rounded text-text-secondary">{'{format_instructions}'}</code>
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
                className="text-xs text-text-tertiary hover:text-white transition-colors"
              >
                Reset to default precise citation prompt
              </button>
            </>
          ) : (
            <>
              {/* Info box explaining standard mode */}
              <div className="flex gap-3 p-3 bg-transparent border border-white/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-text-tertiary flex-shrink-0 mt-0.5" />
                <div className="text-sm text-text-secondary">
                  <p className="font-medium mb-1 text-white">Standard RAG Mode</p>
                  <p className="text-xs text-text-tertiary">
                    This prompt generates answers using all retrieved context. 
                    Required placeholders: <code className="bg-white/5 px-1 rounded text-text-secondary">{'{context}'}</code>, <code className="bg-white/5 px-1 rounded text-text-secondary">{'{question}'}</code>
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
                className="text-xs text-text-tertiary hover:text-white transition-colors"
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