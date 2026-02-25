import { useState } from 'react'
import { User, Bot, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import SourcesList from './SourcesList'

// ─── Extract plain text from React children (for copy button) ────────────────
function extractText(children) {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

// ─── Copy button ──────────────────────────────────────────────────────────────
function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
      aria-label="Copy code"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  )
}

// ─── Markdown component overrides ────────────────────────────────────────────
// We use Tailwind's `prose prose-invert` for correct typography baseline,
// then only override the elements that need custom styling (code blocks, links).
const markdownComponents = {
  // Code — block vs inline via className presence
  pre: ({ children }) => children,
  code({ className, children, ...props }) {
    const language = className?.replace('language-', '') || ''
    const isBlock = Boolean(className)
    const code = extractText(children).trimEnd()

    if (!isBlock) {
      return (
        <code
          className="bg-white/10 px-1.5 py-0.5 rounded-md text-teal-400 text-[0.85em] font-mono not-prose"
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <div className="not-prose my-4 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117]">
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">
            {language || 'code'}
          </span>
          <CopyButton text={code} />
        </div>
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed !bg-transparent !m-0 !p-4">
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    )
  },

  // Links — open in new tab
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal-400 underline underline-offset-2 hover:text-teal-300 transition-colors"
    >
      {children}
    </a>
  ),
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MessageBubble({ message, isStreaming = false }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 message-enter ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-transparent backdrop-blur-xl flex-shrink-0">
          <Bot className="w-5 h-5 text-teal-400" />
        </div>
      )}

      <div className={`flex flex-col gap-3 max-w-[85%] ${isUser ? 'items-end' : ''}`}>
        <div className={`px-5 py-4 rounded-2xl ${isUser
          ? 'bg-teal-500/10 border border-teal-500/20'
          : 'bg-transparent backdrop-blur-xl border border-white/10'
          }`}>
          {isUser ? (
            // User messages: plain text, no markdown
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-white">
              {message.content}
            </p>
          ) : (
            // Assistant messages: full prose typography via @tailwindcss/typography
            <div className="min-w-0">
              <div
                className={`
                  prose prose-invert prose-sm max-w-none
                  prose-headings:font-semibold prose-headings:text-white prose-headings:tracking-tight
                  prose-h1:text-2xl prose-h1:font-bold prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-2 prose-h1:mb-4
                  prose-h2:text-xl prose-h2:mt-6 prose-h2:mb-3
                  prose-h3:text-base prose-h3:text-teal-400 prose-h3:mt-4 prose-h3:mb-2
                  prose-p:text-white/85 prose-p:leading-relaxed prose-p:text-[15px]
                  prose-li:text-white/85 prose-li:text-[15px]
                  prose-strong:text-white prose-strong:font-semibold
                  prose-em:text-white/70
                  prose-blockquote:border-l-teal-500 prose-blockquote:text-white/60 prose-blockquote:not-italic
                  prose-hr:border-white/10
                  prose-table:text-[14px]
                  prose-th:text-white/60 prose-th:font-medium
                  prose-td:text-white/85
                  prose-code:text-teal-400 prose-code:bg-white/10 prose-code:rounded prose-code:px-1 prose-code:py-0.5 prose-code:font-mono prose-code:text-[0.85em] prose-code:before:content-none prose-code:after:content-none
                  prose-pre:bg-[#0d1117] prose-pre:border prose-pre:border-white/10
                  prose-a:text-teal-400 prose-a:no-underline hover:prose-a:underline
                `}
              >
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSanitize]}
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
              {isStreaming && <span className="streaming-cursor" />}
            </div>
          )}
        </div>

        {!isUser && message.sources?.length > 0 && !isStreaming && (
          <SourcesList sources={message.sources} contexts={message.contexts} />
        )}
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-transparent backdrop-blur-xl flex-shrink-0">
          <User className="w-5 h-5 text-white/50" />
        </div>
      )}
    </div>
  )
}