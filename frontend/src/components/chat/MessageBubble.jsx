import { Bot } from 'lucide-react'
import SourcesList from './SourcesList'

export default function MessageBubble({ message }) {
  const { role, content, sources, contexts } = message

  return (
    <div className={`flex gap-4 ${role === 'user' ? 'flex-row-reverse' : ''} message-enter`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10 ${
        role === 'user' 
          ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
          : 'bg-slate-900/50 backdrop-blur-xl'
      }`}>
        {role === 'user' ? (
          <span className="text-sm font-bold text-white">You</span>
        ) : (
          <Bot className="w-5 h-5 text-blue-400" />
        )}
      </div>

      <div className="flex-1 max-w-[80%] space-y-3">
        <div className={`px-5 py-4 rounded-2xl ${
          role === 'user' 
            ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' 
            : 'bg-slate-900/50 backdrop-blur-xl text-slate-100 border border-white/10'
        }`}>
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>

        {sources && sources.length > 0 && (
          <SourcesList sources={sources} contexts={contexts} />
        )}
      </div>
    </div>
  )
}