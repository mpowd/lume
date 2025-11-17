import { useState } from 'react'
import { MessageSquare, FileSearch, Bot, Image, Edit2, Trash2, X, Target } from 'lucide-react'
import Card from '../shared/Card'
import Badge from '../shared/Badge'

const TYPE_CONFIG = {
  qa: {
    icon: MessageSquare,
    label: 'Q&A',
    color: 'from-brand-teal/20 to-brand-teal-dark/20',
    hoverColor: 'from-brand-teal/30 to-brand-teal-dark/30'
  },
  retrieval: {
    icon: FileSearch,
    label: 'Retrieval',
    color: 'from-emerald-500/20 to-teal-500/20',
    hoverColor: 'from-emerald-500/30 to-teal-500/30'
  },
  assistant: {
    icon: Bot,
    label: 'Assistant',
    color: 'from-orange-500/20 to-red-500/20',
    hoverColor: 'from-orange-500/30 to-red-500/30'
  },
  image: {
    icon: Image,
    label: 'Image',
    color: 'from-pink-500/20 to-rose-500/20',
    hoverColor: 'from-pink-500/30 to-rose-500/30'
  }
}

export default function AssistantCard({ assistant, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  
  const typeConfig = TYPE_CONFIG[assistant.type] || TYPE_CONFIG.qa
  const Icon = typeConfig.icon

  // Get LLM display info
  const getLLMInfo = () => {
    const llmModel = assistant.llm
    const llmProvider = assistant.llm_provider
    
    if (!llmModel && !llmProvider) {
      return { provider: null, model: 'No LLM', hasLLM: false }
    }
    
    return {
      provider: llmProvider,
      model: llmModel || 'Unknown Model',
      hasLLM: true
    }
  }

  const llmInfo = getLLMInfo()

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(assistant.id, assistant.name)
    setConfirmDelete(false)
  }

  return (
    <Card onClick={() => onEdit(assistant)} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 bg-gradient-to-br ${typeConfig.color} rounded-xl group-hover:${typeConfig.hoverColor} transition-all`}>
            <Icon className="w-5 h-5 text-brand-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg group-hover:text-brand-teal transition-colors">
              {assistant.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="blue">
                {typeConfig.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Model</span>
          <div className="flex items-center gap-2">
            {llmInfo.hasLLM && llmInfo.provider && (
              <Badge variant={llmInfo.provider === 'ollama' ? 'orange' : 'green'}>
                {llmInfo.provider}
              </Badge>
            )}
            <span className={`font-medium ${llmInfo.hasLLM ? 'text-white' : 'text-slate-500'}`}>
              {llmInfo.model}
            </span>
          </div>
        </div>

        {assistant.collections && assistant.collections.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Sources</span>
            <span className="text-white font-medium">{assistant.collections.length}</span>
          </div>
        )}

        {assistant.reranking && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Reranker</span>
            <Badge variant={assistant.reranker_provider === 'huggingface' ? 'orange' : 'purple'}>
              {assistant.reranker_provider || 'cohere'}
            </Badge>
          </div>
        )}
      </div>

      {assistant.type === 'qa' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {assistant.hybrid_search && <Badge variant="blue">Hybrid</Badge>}
          {assistant.hyde && <Badge variant="purple">HyDE</Badge>}
          {assistant.reranking && <Badge variant="green">Rerank</Badge>}
          {assistant.precise_citation && (
            <Badge variant="orange" icon={Target}>Precise</Badge>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(assistant)
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-brand-teal hover:bg-brand-teal/10 rounded-xl transition-all font-medium"
          style={{cursor: 'pointer'}}
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        
        {confirmDelete ? (
          <>
            <button
              onClick={handleDelete}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium"
              style={{cursor: 'pointer'}}
            >
              Confirm
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(false)
              }}
              className="px-4 py-2 bg-slate-950/50 text-slate-300 border border-white/10 rounded-xl hover:bg-slate-900/50 transition-all"
              style={{cursor: 'pointer'}}
            >
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              setConfirmDelete(true)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-medium"
            style={{cursor: 'pointer'}}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </Card>
  )
}