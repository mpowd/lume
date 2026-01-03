import { Settings, Target, Lock, Info as InfoIcon, FileText } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { COHERE_RERANKERS, HUGGINGFACE_RERANKERS } from '../../constants/models'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import Accordion from '../shared/Accordion'

export default function AdvancedSettings({ 
  formData, 
  setFormData, 
  showAdvanced, 
  setShowAdvanced,
  defaultSystemPrompt,
  defaultUserPrompt,
  defaultPreciseCitationSystem,
  defaultPreciseCitationUser
}) {
  // Check if at least one collection is selected
  const hasCollections = formData.collections && formData.collections.length > 0
  const references = formData.references || []

  // Render the user prompt with styled placeholders
  const renderStyledPrompt = (promptText) => {
    const parts = []
    let lastIndex = 0
    const regex = /\{([\w_]+)\}/g
    let match

    while ((match = regex.exec(promptText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {promptText.substring(lastIndex, match.index)}
          </span>
        )
      }

      const placeholderName = match[1]
      const reference = references.find(r => r.name === placeholderName)
      
      // Style the placeholder
      const isStandardPlaceholder = ['context', 'question', 'context_with_indices', 'format_instructions'].includes(placeholderName)
      
      parts.push(
        <span
          key={`placeholder-${match.index}`}
          className={`inline-flex items-center px-2 py-0.5 rounded border font-semibold font-mono ${
            reference 
              ? reference.color 
              : isStandardPlaceholder
              ? 'bg-teal-500/20 border-teal-500/50 text-teal-300'
              : 'bg-gray-500/20 border-gray-500/50 text-gray-300'
          }`}
          title={reference ? reference.text : placeholderName}
        >
          {`{${placeholderName}}`}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < promptText.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {promptText.substring(lastIndex)}
        </span>
      )
    }

    return <pre className="whitespace-pre-wrap font-mono text-sm text-text-secondary">{parts}</pre>
  }

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

              {/* Show the appropriate prompts based on precise_citation setting */}
              {formData.precise_citation ? (
                <>
                  {/* Info box explaining precise citation mode */}
                  <div className="flex gap-3 p-3 bg-background-elevated border border-white/10 rounded-lg">
                    <div className="flex-shrink-0">
                      <InfoIcon className="w-5 h-5 text-info" />
                    </div>
                    <div>
                      <p className="text-xs text-text-secondary">Precise citation tracks which chunks are used</p>
                      <p className="text-xs text-text-quaternary mt-1">
                        User prompt placeholders: <code className="px-1 py-0.5 bg-white/5 rounded font-mono text-teal-300">{'{context_with_indices}'}</code> <code className="px-1 py-0.5 bg-white/5 rounded font-mono text-teal-300">{'{question}'}</code>
                      </p>
                    </div>
                  </div>

                  <FormTextarea
                    label="System Prompt"
                    value={formData.precise_citation_system_prompt}
                    onChange={(e) => setFormData({...formData, precise_citation_system_prompt: e.target.value})}
                    rows={8}
                    className="font-mono text-sm"
                    placeholder="Instructions for the assistant on how to behave..."
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">User Prompt (Preview)</label>
                    <div className="w-full border border-white/10 rounded-lg px-3 py-2 bg-background-elevated min-h-[120px]">
                      {renderStyledPrompt(formData.precise_citation_user_prompt)}
                    </div>
                  </div>

                  <FormTextarea
                    label="User Prompt (Editable)"
                    value={formData.precise_citation_user_prompt}
                    onChange={(e) => setFormData({...formData, precise_citation_user_prompt: e.target.value})}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Template for user messages with context..."
                  />
                  
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData, 
                      precise_citation_system_prompt: defaultPreciseCitationSystem,
                      precise_citation_user_prompt: defaultPreciseCitationUser
                    })}
                    className="text-xs text-text-tertiary hover:text-white transition-colors"
                  >
                    Reset to default precise citation prompts
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
                      <p className="text-xs text-text-secondary">Placeholders are replaced with actual content at runtime</p>
                      <p className="text-xs text-text-quaternary mt-1">
                        Available placeholders: <code className="px-1 py-0.5 bg-white/5 rounded font-mono text-teal-300">{'{context}'}</code> <code className="px-1 py-0.5 bg-white/5 rounded font-mono text-teal-300">{'{question}'}</code>
                        {references.length > 0 && references.map(ref => (
                          <code key={ref.name} className={`px-1 py-0.5 rounded font-mono ml-1 ${ref.color}`}>{` {${ref.name}}`}</code>
                        ))}
                      </p>
                    </div>
                  </div>

                  <FormTextarea
                    label="System Prompt"
                    value={formData.system_prompt}
                    onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
                    rows={4}
                    className="font-mono text-sm"
                    placeholder="Instructions for the assistant on how to behave..."
                  />

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">User Prompt (Preview)</label>
                    <div className="w-full border border-white/10 rounded-lg px-3 py-2 bg-background-elevated min-h-[120px]">
                      {renderStyledPrompt(formData.user_prompt)}
                    </div>
                    <p className="text-xs text-text-quaternary">
                      Colored badges show placeholders that will be replaced with actual content at runtime
                    </p>
                  </div>

                  <FormTextarea
                    label="User Prompt (Editable)"
                    value={formData.user_prompt}
                    onChange={(e) => setFormData({...formData, user_prompt: e.target.value})}
                    rows={6}
                    className="font-mono text-sm"
                    placeholder="Template for user messages with context..."
                  />
                  
                  <button
                    type="button"
                    onClick={() => setFormData({
                      ...formData, 
                      system_prompt: defaultSystemPrompt,
                      user_prompt: defaultUserPrompt
                    })}
                    className="text-xs text-text-tertiary hover:text-white transition-colors"
                  >
                    Reset to default prompts
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
                  onClick={() => setFormData({...formData, hyde_prompt: 'Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: '})}
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
                <p className="text-xs text-text-secondary">Placeholders are replaced with actual content at runtime</p>
                <p className="text-xs text-text-quaternary mt-1">
                  Available placeholders: <code className="px-1 py-0.5 bg-white/5 rounded font-mono text-teal-300">{'{question}'}</code>
                  {references.length > 0 && references.map(ref => (
                    <code key={ref.name} className={`px-1 py-0.5 rounded font-mono ml-1 ${ref.color}`}>{` {${ref.name}}`}</code>
                  ))}
                </p>
              </div>
            </div>
            
            <FormTextarea
              label="System Prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({...formData, system_prompt: e.target.value})}
              rows={4}
              className="font-mono text-sm"
              placeholder="Instructions for the assistant on how to behave..."
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-text-secondary">User Prompt (Preview)</label>
              <div className="w-full border border-white/10 rounded-lg px-3 py-2 bg-background-elevated min-h-[120px]">
                {renderStyledPrompt(formData.user_prompt)}
              </div>
              <p className="text-xs text-text-quaternary">
                Colored badges show placeholders that will be replaced with actual content at runtime
              </p>
            </div>

            <FormTextarea
              label="User Prompt (Editable)"
              value={formData.user_prompt}
              onChange={(e) => setFormData({...formData, user_prompt: e.target.value})}
              rows={6}
              className="font-mono text-sm"
              placeholder="Template for user messages..."
            />
            
            <button
              type="button"
              onClick={() => setFormData({
                ...formData, 
                system_prompt: defaultSystemPrompt,
                user_prompt: defaultUserPrompt
              })}
              className="text-xs text-text-tertiary hover:text-white transition-colors"
            >
              Reset to default prompts
            </button>
            
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
                  onClick={() => setFormData({...formData, hyde_prompt: 'Given a question, generate a paragraph of text that answers the question.\n\nQuestion: {question}\n\nParagraph: '})}
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