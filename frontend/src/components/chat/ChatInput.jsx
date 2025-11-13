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
    <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-background-elevated/95 backdrop-blur-xl p-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative bg-transparent border border-white/10 hover:border-brand-teal/30 rounded-3xl p-4 transition-all">
          <div className="flex items-end gap-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={disabled ? "Select an assistant to start..." : "Ask me anything..."}
              disabled={disabled || loading}
              rows={1}
              className="flex-1 bg-transparent text-white placeholder:text-text-quaternary focus:outline-none resize-none text-[15px] leading-relaxed max-h-32 disabled:cursor-not-allowed disabled:text-text-disabled"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || disabled || loading}
              className="flex-shrink-0 w-10 h-10 rounded-2xl bg-transparent border border-brand-teal/40 hover:border-brand-teal/60 hover:bg-white/5 disabled:border-white/5 disabled:bg-transparent transition-all duration-200 flex items-center justify-center disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 text-text-quaternary animate-spin" />
              ) : (
                <Send className={`w-5 h-5 ${input.trim() && !disabled ? 'text-brand-teal' : 'text-text-disabled'}`} />
              )}
            </button>
          </div>
        </div>
        <p className="text-center text-xs text-text-quaternary mt-4">
          AI can make mistakes. Verify important information.
        </p>
      </div>
    </div>
  )
}