import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

// Smart tooltip component that positions itself based on available space
const SmartTooltip = ({ source, context, index, getSourceUrl, getSourceScore, getSourceDomain, getSourceStyle, getDotColor }) => {
  const [showBelow, setShowBelow] = useState(false)
  const sourceRef = useRef(null)

  useEffect(() => {
    const checkPosition = () => {
      if (sourceRef.current) {
        const rect = sourceRef.current.getBoundingClientRect()
        const tooltipHeight = 400 // Approximate max height of tooltip
        const spaceAbove = rect.top
        const spaceBelow = window.innerHeight - rect.bottom
        
        // Show below if there's not enough space above (less than tooltip height)
        // or if there's significantly more space below
        setShowBelow(spaceAbove < tooltipHeight || spaceBelow > spaceAbove + 100)
      }
    }

    checkPosition()
    window.addEventListener('resize', checkPosition)
    window.addEventListener('scroll', checkPosition, true)
    
    return () => {
      window.removeEventListener('resize', checkPosition)
      window.removeEventListener('scroll', checkPosition, true)
    }
  }, [])

  const url = getSourceUrl(source)
  const score = getSourceScore(source)
  const hasScore = score !== null && score !== undefined

  return (
    <div ref={sourceRef} className="group relative">
      <a 
        href={url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="block px-3 py-1.5 rounded-xl transition-all cursor-pointer hover:opacity-90" 
        style={getSourceStyle(score)}
      >
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${getDotColor(score)}`} />
          <span className="text-xs text-white font-medium">{getSourceDomain(source)}</span>
          {hasScore && (
            <span className="text-[10px] text-white/70">
              {(score * 100).toFixed(0)}%
            </span>
          )}
          <svg className="w-3 h-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </div>
      </a>
      
      {context && (
        <div 
          className="chunk-tooltip absolute left-0 w-96 max-w-screen-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50" 
          style={{
            [showBelow ? 'top' : 'bottom']: '100%',
            [showBelow ? 'marginTop' : 'marginBottom']: '0.5rem'
          }}
        >
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-4 shadow-2xl shadow-blue-500/20 max-h-[60vh] flex flex-col">
            <div className="flex items-start gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
              <span className="text-xs font-semibold text-blue-400">Relevant chunk</span>
            </div>
            <div className="chunk-content overflow-y-auto text-sm text-slate-300 pr-2 flex-1">
              <ReactMarkdown 
                components={{
                  h1: ({node, ...props}) => <h1 className="text-lg font-bold text-slate-100 mt-4 mb-2 first:mt-0" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-base font-semibold text-slate-100 mt-3 mb-2 first:mt-0" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-slate-100 mt-2 mb-1 first:mt-0" {...props} />,
                  p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                  code: ({node, inline, ...props}) => inline 
                    ? <code className="bg-slate-800/80 text-purple-300 px-1.5 py-0.5 rounded text-xs font-mono" {...props} /> 
                    : <code className="block bg-slate-800/80 border border-slate-700/50 text-slate-300 p-3 rounded-lg overflow-x-auto text-xs font-mono" {...props} />,
                  pre: ({node, ...props}) => <pre className="mb-3" {...props} />,
                  a: ({node, ...props}) => <a className="text-blue-400 hover:underline" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-slate-100" {...props} />,
                  em: ({node, ...props}) => <em className="italic" {...props} />,
                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-slate-400 my-3" {...props} />,
                }}
              >
                {context}
              </ReactMarkdown>
            </div>
            {hasScore && (
              <div className="mt-3 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
                <span className="font-semibold">Relevance Score:</span> {(score * 100).toFixed(1)}%
              </div>
            )}
          </div>
          {/* Arrow pointing to the source */}
          <div 
            className="w-3 h-3 bg-slate-900 border-blue-500/30 transform rotate-45 absolute left-6"
            style={{
              [showBelow ? 'top' : 'bottom']: '-6px',
              borderTop: showBelow ? '1px solid' : 'none',
              borderLeft: showBelow ? '1px solid' : 'none',
              borderRight: !showBelow ? '1px solid' : 'none',
              borderBottom: !showBelow ? '1px solid' : 'none',
            }}
          />
        </div>
      )}
    </div>
  )
}

export default SmartTooltip