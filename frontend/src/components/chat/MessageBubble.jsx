import { User, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import SourcesList from './SourcesList'

export default function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 message-enter ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-transparent backdrop-blur-xl flex-shrink-0">
          <Bot className="w-5 h-5 text-brand-teal" />
        </div>
      )}

      <div className={`flex flex-col gap-3 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
        <div className={`px-5 py-4 rounded-2xl ${
          isUser 
            ? 'bg-brand-teal/10 border border-brand-teal/20 text-text-primary' 
            : 'bg-transparent backdrop-blur-xl border border-white/10 text-text-primary'
        }`}>
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="text-[15px] leading-relaxed mb-3 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="text-[15px] leading-relaxed" {...props} />,
                  code: ({node, inline, ...props}) => 
                    inline 
                      ? <code className="bg-white/5 px-1.5 py-0.5 rounded text-brand-teal text-sm" {...props} />
                      : <code className="block bg-white/5 p-3 rounded-lg text-sm overflow-x-auto" {...props} />,
                  a: ({node, ...props}) => <a className="text-brand-teal hover:underline" {...props} />,
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </div>

        {!isUser && message.sources && message.sources.length > 0 && !isStreaming && (
          <SourcesList sources={message.sources} contexts={message.contexts} />
        )}
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-transparent backdrop-blur-xl flex-shrink-0">
          <User className="w-5 h-5 text-text-secondary" />
        </div>
      )}
    </div>
  )
}