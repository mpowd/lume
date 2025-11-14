import { Bot, User } from 'lucide-react'
import SourcesList from './SourcesList'

export default function MessageBubble({ message }) {
  const { role, content, sources, contexts } = message

  return (
    <div className={`flex gap-4 ${role === 'user' ? 'flex-row-reverse' : ''} message-enter`}>
      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
        role === 'user' 
          ? 'bg-brand-teal/10 border border-brand-teal/30' 
          : 'bg-background-elevated border border-white/5'
      }`}>
        {role === 'user' ? (
          <User className="w-5 h-5 text-brand-teal" />
        ) : (
          <Bot className="w-5 h-5 text-text-tertiary" />
        )}
      </div>

      <div className="flex-1 max-w-[80%] space-y-3">
        <div className={`px-5 py-4 rounded-2xl ${
          role === 'user' 
            ? 'bg-brand-teal/5 border border-brand-teal/20 text-white' 
            : 'bg-transparent border border-white/5 text-white'
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