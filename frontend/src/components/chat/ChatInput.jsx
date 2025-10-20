import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

export default function ChatInput({ onSend, disabled, loading }) {
  const [input, setInput] = useState('')
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  const handleSend = () => {
    if (!input.trim() || disabled || loading) return
    onSend(input)
    setInput('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !loading) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-slate-950/95 backdrop-blur-xl p-6">
      <style>{`
        .gradient-border {
          position: relative;
          background: linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234));
          padding: 1px;
          border-radius: 1.5rem;
        }
        .gradient-border-inner { background: rgb(10, 10, 10); border-radius: 1.5rem; }
      `}</style>

      <div className="max-w-4xl mx-auto">
        <div className="gradient-border">
          <div className="gradient-border-inner p-4">
            <div className="flex items-end gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={disabled ? "Select an assistant to start..." : "Ask me anything..."}
                disabled={disabled || loading}
                rows={1}
                className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none resize-none text-[15px] leading-relaxed max-h-32 disabled:cursor-not-allowed disabled:text-slate-600 cursor-text"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || disabled || loading}
                className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin" />
                ) : (
                  <Send className={`w-5 h-5 ${input.trim() && !disabled ? 'text-white' : 'text-slate-600'}`} />
                )}
              </button>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-slate-500 mt-4">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}