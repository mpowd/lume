import { useState } from 'react'
import { User, Bot, Copy, Check } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeSanitize from 'rehype-sanitize'
import SourcesList from './SourcesList'

// ─── Extract plain text from React children ──────────────────────────────────
function extractText(children) {
  if (typeof children === 'string') return children
  if (typeof children === 'number') return String(children)
  if (Array.isArray(children)) return children.map(extractText).join('')
  if (children?.props?.children) return extractText(children.props.children)
  return ''
}

// ─── Copy button for code blocks ────────────────────────────────────────────
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
      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-text-quaternary hover:text-text-secondary transition-colors"
      aria-label="Copy code"
    >
      {copied
        ? <Check className="w-3.5 h-3.5 text-green-400" />
        : <Copy className="w-3.5 h-3.5" />
      }
    </button>
  )
}

// ─── Markdown components ─────────────────────────────────────────────────────
const markdownComponents = {
  // Paragraphs
  p: ({ children }) => (
    <p className="text-[15px] leading-relaxed mb-3 last:mb-0 text-text-primary">
      {children}
    </p>
  ),

  // Headings
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold text-text-primary mt-5 mb-2 first:mt-0">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold text-text-primary mt-4 mb-2 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold text-text-primary mt-3 mb-1.5 first:mt-0">{children}</h3>
  ),

  // Lists
  ul: ({ children }) => (
    <ul className="my-3 pl-5 space-y-1.5 list-disc marker:text-text-quaternary">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-5 space-y-1.5 list-decimal marker:text-text-quaternary">{children}</ol>
  ),
  li: ({ children }) => (
    <li className="text-[15px] leading-relaxed text-text-primary">{children}</li>
  ),

  // Code — block vs inline distinguished by presence of a language className
  pre: ({ children }) => children, // let the code component handle the wrapper
  code: ({ className, children, ...props }) => {
    const language = className?.replace('language-', '') || ''
    const isBlock = Boolean(className)
    const code = extractText(children).trimEnd()

    if (!isBlock) {
      return (
        <code
          className="bg-white/5 px-1.5 py-0.5 rounded-md text-brand-teal text-[13px] font-mono"
          {...props}
        >
          {children}
        </code>
      )
    }

    return (
      <div className="relative group my-3 rounded-xl overflow-hidden border border-white/10 bg-[#0d1117]">
        {/* header */}
        <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
          <span className="text-[11px] font-mono text-text-quaternary uppercase tracking-wider">
            {language || 'code'}
          </span>
          <CopyButton text={code} />
        </div>
        {/* highlighted code */}
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code className={className} {...props}>{children}</code>
        </pre>
      </div>
    )
  },

  // Blockquote
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-4 border-l-2 border-brand-teal/50 text-text-secondary italic">
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="my-4 border-white/10" />,

  // Links
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-brand-teal underline underline-offset-2 hover:opacity-80 transition-opacity"
    >
      {children}
    </a>
  ),

  // Strong / em
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-text-secondary">{children}</em>
  ),

  // Tables (GFM)
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-white/5 text-text-secondary font-medium border-b border-white/10">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-white/5">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-white/5 transition-colors">{children}</tr>
  ),
  th: ({ children }) => <th className="px-4 py-2.5">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 text-text-primary">{children}</td>,
}

// ─── Main component ───────────────────────────────────────────────────────────
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
        <div className={`px-5 py-4 rounded-2xl ${isUser
          ? 'bg-brand-teal/10 border border-brand-teal/20 text-text-primary'
          : 'bg-transparent backdrop-blur-xl border border-white/10 text-text-primary'
          }`}>
          {isUser ? (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="min-w-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeSanitize]}
                components={markdownComponents}
              >
                {message.content}
              </ReactMarkdown>
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
          <User className="w-5 h-5 text-text-secondary" />
        </div>
      )}
    </div>
  )
}