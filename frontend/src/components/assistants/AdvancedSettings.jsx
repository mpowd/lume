import { Settings, Target, Lock, AlertCircle, Info as InfoIcon } from 'lucide-react'
import { useState } from 'react'
import { COHERE_RERANKERS, HUGGINGFACE_RERANKERS } from '../../constants/models'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Accordion from '../shared/Accordion'
import ConfirmDialog from '../shared/ConfirmDialog'


export default function AdvancedSettings({ 
  formData, 
  setFormData, 
  showAdvanced, 
  setShowAdvanced,
  defaultPrompt,
  defaultPreciseCitationPrompt 
}) {
  // Check if at least one collection is selected
  const hasCollections = formData.collections && formData.collections.length > 0;

  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSubstitution, setPendingSubstitution] = useState(null);


  // Get reference count for display
  // const referenceCount = formData.references ? formData.references.length : 0;
  const references = formData.references
  
  // Function to find and replace reference placeholders
  const handlePromptChange = (e) => {
    const newPrompt = e.target.value;
    setFormData({...formData, prompt: newPrompt});
    
    // Check if any reference name is in curly brackets
    if (references && references.length > 0) {
      const referenceNames = references.map(ref => ref.name);
      const regex = new RegExp(`{(${referenceNames.join('|')})}`, 'g');
      const matches = newPrompt.match(regex);
      
      if (matches && matches.length > 0) {
        // Get the first matching reference name
        const matchedRefName = matches[0].replace(/[{}]/g, '');
        const reference = references.find(ref => ref.name === matchedRefName);
        
        if (reference) {
          setPendingSubstitution({
            placeholder: matches[0],
            referenceText: reference.text
          });
          setShowConfirmDialog(true);
        }
      }
    }
  };

  // Function to perform the substitution
  const handleSubstitution = () => {
    if (pendingSubstitution) {
      const newPrompt = formData.prompt.replace(
        pendingSubstitution.placeholder,
        pendingSubstitution.referenceText
      );
      setFormData({...formData, prompt: newPrompt});
      setShowConfirmDialog(false);
      setPendingSubstitution(null);
    }
  };

  return (
    <Accordion
      title="Advanced Settings"
      icon={Settings}
      isOpen={showAdvanced}
      onToggle={() => setShowAdvanced(!showAdvanced)}
    >
      <div className="space-y-6 p-6 bg-transparent rounded-xl border border-white/5">
        {hasCollections ? (
          <>
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
                  <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
                    <div className="flex-shrink-0">
                      <InfoIcon className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-text-quaternary mt-1">
                        Placeholders: {'{question} '} {references.length > 0 ? references.map(ref => `{${ref.name}}`).join(', ') : ''}
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
                  {/* Info box explaining prompt structure */}
                  <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
                    <div className="flex-shrink-0">
                      <InfoIcon className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-text-quaternary mt-1">
                        Placeholders: {'{question} '} {hasCollections ? '{context}' : ''} {references.length > 0 ? references.map(ref => `{${ref.name}}`).join(', ') : ''}
                      </p>
                    </div>
                  </div>

                  <FormTextarea
                    label="Prompt Template"
                    value={formData.prompt}
                    onChange={(e) => setFormData({...formData, prompt: e.target.value})}
                    rows={6}
                    className="font-mono text-sm"
                  />
                  
                  <button
                    type="button"
                    onClick={() => setFormData({...formData, prompt: defaultPrompt})}
                    className="text-xs text-text-tertiary hover:text-white transition-colors"
                  >
                    Reset to default prompt
                  </button>
                </>
              )}
            </div>

            {/* HyDE Prompt Section */}
            {formData.hyde && (
              <div className="pt-6 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-text-secondary">HyDE Prompt</h3>
                <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
                  <div className="flex-shrink-0">
                    <InfoIcon className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-text-quaternary mt-1">
                      This prompt is used to generate a hypothetical document for the HyDE technique.
                    </p>
                  </div>
                </div>
                <FormTextarea
                  label="HyDE Prompt"
                  value={formData.hyde_prompt}
                  onChange={(e) => setFormData({...formData, hyde_prompt: e.target.value})}
                  rows={6}
                  className="font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, hyde_prompt: formData.hyde_prompt})}
                  className="text-xs text-text-tertiary hover:text-white transition-colors"
                >
                  Reset to default HyDE prompt
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-4">
            
            {/* Info box for no collections case */}
            <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
              <div className="flex-shrink-0">
                <InfoIcon className="w-5 h-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-text-quaternary mt-1">
                  Placeholders: {'{question} '} {references.length > 0 ? references.map(ref => `{${ref.name}}`).join(', ') : ''}
                </p>
              </div>
            </div>
            
            <FormTextarea
              label="Assistant Prompt"
              value={formData.prompt}
              onChange={handlePromptChange}
              rows={8}
              className="font-mono text-sm"
            />
            
            <button
              type="button"
              onClick={() => setFormData({...formData, prompt: defaultPrompt})}
              className="text-xs text-text-tertiary hover:text-white transition-colors"
            >
              Reset to default prompt
            </button>
            
            {/* Confirm Dialog */}
            <ConfirmDialog
              isOpen={showConfirmDialog}
              onClose={() => setShowConfirmDialog(false)}
              onConfirm={handleSubstitution}
              title="Placeholder Detected"
              message={`A placeholder reference was detected in the prompt. Would you like to substitute it with the reference text?`}
              confirmText="Substitute"
              cancelText="Keep Placeholder"
              variant="warning"
            />
            
            {/* HyDE Prompt Section */}
            {formData.hyde && (
              <div className="pt-6 border-t border-white/10 space-y-4">
                <h3 className="text-sm font-semibold text-text-secondary">HyDE Prompt</h3>
                <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
                  <div className="flex-shrink-0">
                    <InfoIcon className="w-5 h-5 text-info" />
                  </div>
                  <div>
                    <p className="text-xs text-text-quaternary mt-1">
                      This prompt is used to generate a hypothetical document for the HyDE technique.
                    </p>
                  </div>
                </div>
                <FormTextarea
                  label="HyDE Prompt"
                  value={formData.hyde_prompt}
                  onChange={(e) => setFormData({...formData, hyde_prompt: e.target.value})}
                  rows={6}
                  className="font-mono text-sm"
                />
                <button
                  type="button"
                  onClick={() => setFormData({...formData, hyde_prompt: formData.hyde_prompt})}
                  className="text-xs text-text-tertiary hover:text-white transition-colors"
                >
                  Reset to default HyDE prompt
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </Accordion>
  )
}