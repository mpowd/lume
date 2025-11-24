import { Bot, User } from 'lucide-react'
import SourcesList from './SourcesList'

export default function MessageBubble({ message }) {
  const { role, content, sources, contexts } = message

  // Function to process content and wrap code blocks
  const processContent = (text) => {
    if (!text) return text
    
    // Split text by code blocks (both inline and block)
    const parts = text.split(/(```[\s\S]*?```|`[^`]*?`)/)
    
    return parts.map((part, index) => {
      // If it's a code block
      if (part.startsWith('```') && part.endsWith('```')) {
        // Extract code content, removing the language identifier (first line)
        const codeContent = part.slice(3, -3).trim()
        const lines = codeContent.split('\n')
        // Remove first line if it's a language identifier (starts with a word)
        const processedContent = lines.length > 1 && /^[a-zA-Z]/.test(lines[0]) 
          ? lines.slice(1).join('\n') 
          : codeContent
        
        return (
          <pre 
            key={index} 
            className="bg-background-elevated/50 border border-white/10 rounded-lg p-4 my-2 overflow-x-auto text-sm"
          >
            <code>{processedContent}</code>
          </pre>
        )
      }
      // If it's inline code
      else if (part.startsWith('`') && part.endsWith('`')) {
        const codeContent = part.slice(1, -1)
        return (
          <code 
            key={index} 
            className="bg-background-elevated/50 border border-white/10 rounded px-2 py-1 text-sm mx-1"
          >
            {codeContent}
          </code>
        )
      }
      // Regular text
      else {
        return part
      }
    })
  }

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
          <p className="text-[15px] leading-relaxed whitespace-pre-wrap">
            {role === 'assistant' ? processContent(content) : content}
          </p>
        </div>

        {sources && sources.length > 0 && (
          <SourcesList sources={sources} contexts={contexts} />
        )}
      </div>
    </div>
  )
}