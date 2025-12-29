import { useRef, useEffect } from 'react'
import MessageBubble from './MessageBubble'
import LoadingSpinner from '../shared/LoadingSpinner'

export default function MessageList({ messages, loading, streamingIndex }) {
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-enter { animation: slideUp 0.3s ease-out; }
        
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .streaming-cursor {
          display: inline-block;
          width: 2px;
          height: 1em;
          background-color: currentColor;
          margin-left: 2px;
          animation: blink 1s ease-in-out infinite;
        }
      `}</style>

      {messages.map((msg, idx) => (
        <MessageBubble 
          key={idx} 
          message={msg}
          isStreaming={idx === streamingIndex}
        />
      ))}

      {loading && streamingIndex === null && (
        <div className="flex gap-4 message-enter">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-transparent backdrop-blur-xl">
            <LoadingSpinner size="sm" />
          </div>
          <div className="bg-transparent backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/10">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
              <div className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}