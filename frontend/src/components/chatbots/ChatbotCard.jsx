import { useState } from 'react'
import { Bot, Edit2, Trash2, X, Zap, Lock, Target } from 'lucide-react'
import Card from '../shared/Card'
import Badge from '../shared/Badge'

export default function ChatbotCard({ chatbot, onEdit, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = (e) => {
    e.stopPropagation()
    onDelete(chatbot.id)
    setConfirmDelete(false)
  }

  return (
    <Card onClick={() => onEdit(chatbot)} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition-all">
            <Bot className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-lg group-hover:text-blue-400 transition-colors">
              {chatbot.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="blue" icon={Zap}>
                {chatbot.workflow}
              </Badge>
              {chatbot.local_only && (
                <Badge variant="green" icon={Lock}>
                  Local
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">Model</span>
          <div className="flex items-center gap-2">
            <Badge variant={chatbot.llm_provider === 'ollama' ? 'orange' : 'green'}>
              {chatbot.llm_provider || 'openai'}
            </Badge>
            <span className="text-white font-medium">{chatbot.llm}</span>
          </div>
        </div>

        {chatbot.collections && chatbot.collections.length > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Sources</span>
            <span className="text-white font-medium">{chatbot.collections.length}</span>
          </div>
        )}

        {chatbot.reranking && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Reranker</span>
            <Badge variant={chatbot.reranker_provider === 'huggingface' ? 'orange' : 'purple'}>
              {chatbot.reranker_provider || 'cohere'}
            </Badge>
          </div>
        )}
      </div>

      {chatbot.workflow === 'linear' && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chatbot.hybrid_search && <Badge variant="blue">Hybrid</Badge>}
          {chatbot.hyde && <Badge variant="purple">HyDE</Badge>}
          {chatbot.reranking && <Badge variant="green">Rerank</Badge>}
          {chatbot.precise_citation && (
            <Badge variant="orange" icon={Target}>Precise</Badge>
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit(chatbot)
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2 text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all font-medium"
        >
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        
        {confirmDelete ? (
          <>
            <button
              onClick={handleDelete}
              className="flex-1 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all font-medium"
            >
              Confirm
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(false)
              }}
              className="px-4 py-2 bg-slate-950/50 text-slate-300 border border-white/10 rounded-xl hover:bg-slate-900/50 transition-all"
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
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>
    </Card>
  )
}