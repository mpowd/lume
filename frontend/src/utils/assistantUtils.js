// Utility function to generate consistent colors for assistants
export const getAssistantColor = (assistantId, index) => {
  const colors = [
    { 
      bg: 'from-blue-500/20 to-cyan-500/20', 
      text: 'text-blue-300', 
      border: 'border-blue-500/30', 
      ring: 'ring-blue-500/50',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/30'
    },
    { 
      bg: 'from-purple-500/20 to-pink-500/20', 
      text: 'text-purple-300', 
      border: 'border-purple-500/30', 
      ring: 'ring-purple-500/50',
      badge: 'bg-purple-500/10 text-purple-300 border-purple-500/30'
    },
    { 
      bg: 'from-emerald-500/20 to-teal-500/20', 
      text: 'text-emerald-300', 
      border: 'border-emerald-500/30', 
      ring: 'ring-emerald-500/50',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
    },
    { 
      bg: 'from-orange-500/20 to-red-500/20', 
      text: 'text-orange-300', 
      border: 'border-orange-500/30', 
      ring: 'ring-orange-500/50',
      badge: 'bg-orange-500/10 text-orange-300 border-orange-500/30'
    },
    { 
      bg: 'from-amber-500/20 to-yellow-500/20', 
      text: 'text-amber-300', 
      border: 'border-amber-500/30', 
      ring: 'ring-amber-500/50',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    },
    { 
      bg: 'from-indigo-500/20 to-violet-500/20', 
      text: 'text-indigo-300', 
      border: 'border-indigo-500/30', 
      ring: 'ring-indigo-500/50',
      badge: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30'
    },
    { 
      bg: 'from-rose-500/20 to-pink-500/20', 
      text: 'text-rose-300', 
      border: 'border-rose-500/30', 
      ring: 'ring-rose-500/50',
      badge: 'bg-rose-500/10 text-rose-300 border-rose-500/30'
    },
    { 
      bg: 'from-lime-500/20 to-green-500/20', 
      text: 'text-lime-300', 
      border: 'border-lime-500/30', 
      ring: 'ring-lime-500/50',
      badge: 'bg-lime-500/10 text-lime-300 border-lime-500/30'
    },
  ]
  
  // Use index if provided, otherwise generate from assistantId
  if (index !== undefined) {
    return colors[index % colors.length]
  }
  
  // Generate a consistent index from assistantId
  let hash = 0
  for (let i = 0; i < assistantId.length; i++) {
    hash = assistantId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Format assistant configuration for display
export const getAssistantConfigSummary = (assistant) => {
  if (!assistant) return []
  
  const summary = []
  
  // Check both config object and root level fields for backward compatibility
  const config = assistant.config || assistant
  
  // LLM Model (check both llm and llm_model)
  const llmModel = config.llm || config.llm_model
  if (llmModel) {
    summary.push({ label: 'LLM Model', value: llmModel, icon: '🤖' })
  }
  
  // LLM Provider
  if (config.llm_provider) {
    summary.push({ label: 'Provider', value: config.llm_provider, icon: '☁️' })
  }
  
  // Top K
  if (config.top_k !== undefined && config.top_k !== null) {
    summary.push({ label: 'Top K', value: String(config.top_k), icon: '📊' })
  }
  
  // Top N (for reranking)
  if (config.top_n !== undefined && config.top_n !== null) {
    summary.push({ label: 'Top N', value: String(config.top_n), icon: '🔝' })
  }
  
  // Hybrid Search
  if (config.hybrid_search !== undefined && config.hybrid_search !== null) {
    summary.push({ label: 'Hybrid Search', value: config.hybrid_search ? 'Yes' : 'No', icon: '🔍' })
  }
  
  // HyDE (check both hyde and use_hyde)
  const hydeEnabled = config.hyde !== undefined ? config.hyde : config.use_hyde
  if (hydeEnabled !== undefined && hydeEnabled !== null) {
    summary.push({ label: 'HyDE', value: hydeEnabled ? 'Enabled' : 'Disabled', icon: '✨' })
  }
  
  // Reranking
  if (config.reranking !== undefined && config.reranking !== null) {
    summary.push({ label: 'Reranking', value: config.reranking ? 'Yes' : 'No', icon: '🎯' })
  }
  
  // Reranker Model (only if reranking is enabled)
  if (config.reranking && config.reranker_model) {
    summary.push({ label: 'Reranker Model', value: config.reranker_model, icon: '⚡' })
  }
  
  // Reranker Provider
  if (config.reranking && config.reranker_provider) {
    summary.push({ label: 'Reranker Provider', value: config.reranker_provider, icon: '🔌' })
  }
  
  // Precise Citation
  if (config.precise_citation !== undefined && config.precise_citation !== null) {
    summary.push({ label: 'Precise Citation', value: config.precise_citation ? 'Yes' : 'No', icon: '📝' })
  }
  
  // Custom RAG Prompt (show which type based on precise_citation)
  if (config.precise_citation && config.precise_citation_prompt) {
    summary.push({ label: 'Precise Citation Prompt', value: 'Configured', icon: '💬' })
  } else if (config.rag_prompt) {
    summary.push({ label: 'RAG Prompt', value: 'Configured', icon: '💬' })
  }
  
  // HyDE Prompt
  if (hydeEnabled && config.hyde_prompt) {
    summary.push({ label: 'HyDE Prompt', value: 'Configured', icon: '✍️' })
  }
  
  // Knowledge Base IDs (check both collections and knowledge_base_ids)
  const kbIds = config.collections || config.knowledge_base_ids
  if (kbIds && kbIds.length > 0) {
    summary.push({ 
      label: 'Collections', 
      value: kbIds.length === 1 ? kbIds[0] : `${kbIds.length} collection(s)`, 
      icon: '📚' 
    })
  }
  
  // Workflow (if present)
  if (config.workflow) {
    summary.push({ label: 'Workflow', value: config.workflow, icon: '🔄' })
  }
  
  // Max Steps (if present)
  if (config.max_steps !== undefined && config.max_steps !== null) {
    summary.push({ label: 'Max Steps', value: String(config.max_steps), icon: '🔢' })
  }
  
  return summary
}

// Get a short config identifier for an assistant (useful for legends)
export const getAssistantConfigId = (assistant) => {
  if (!assistant) return 'No assistant'
  
  const config = assistant.config || assistant
  const parts = []
  
  // Add model (check both llm and llm_model)
  const llmModel = config.llm || config.llm_model
  if (llmModel) {
    // Shorten common model names
    let modelShort = llmModel
      .replace('gpt-4o-mini', 'GPT-4o-mini')
      .replace('gpt-4o', 'GPT-4o')
      .replace('gpt-4-turbo', 'GPT-4-turbo')
      .replace('gpt-3.5-turbo', 'GPT-3.5')
      .replace('claude-3-5-sonnet', 'Claude-3.5-Sonnet')
      .replace('claude-3-sonnet', 'Claude-3-Sonnet')
      .replace('claude-3-opus', 'Claude-3-Opus')
    parts.push(modelShort)
  }
  
  // Add top_k
  if (config.top_k !== undefined && config.top_k !== null) {
    parts.push(`k${config.top_k}`)
  }
  
  // Add reranking indicator
  if (config.reranking) {
    if (config.top_n !== undefined && config.top_n !== null) {
      parts.push(`R${config.top_n}`)
    } else {
      parts.push('R')
    }
  }
  
  // Add HyDE indicator (check both hyde and use_hyde)
  const hydeEnabled = config.hyde !== undefined ? config.hyde : config.use_hyde
  if (hydeEnabled) {
    parts.push('HyDE')
  }
  
  // Add hybrid search indicator
  if (config.hybrid_search) {
    parts.push('Hybrid')
  }
  
  // If no specific config found, return something meaningful
  if (parts.length === 0) {
    return 'Default config'
  }
  
  return parts.join(' • ')
}

// Get a detailed config string for tooltips or expanded views
export const getAssistantConfigDetails = (assistant) => {
  if (!assistant) return 'No configuration available'
  
  const summary = getAssistantConfigSummary(assistant)
  if (summary.length === 0) return 'No configuration details'
  
  return summary.map(item => `${item.label}: ${item.value}`).join('\n')
}