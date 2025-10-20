import { Settings, Target, Lock } from 'lucide-react'
import { COHERE_RERANKERS, HUGGINGFACE_RERANKERS } from '../../constants/models'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Accordion from '../shared/Accordion'

export default function AdvancedSettings({ formData, setFormData, showAdvanced, setShowAdvanced }) {
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

        <FormTextarea
          label="RAG Prompt Template"
          value={formData.rag_prompt}
          onChange={(e) => setFormData({...formData, rag_prompt: e.target.value})}
          rows={6}
          className="font-mono text-sm"
        />
      </div>
    </Accordion>
  )
}