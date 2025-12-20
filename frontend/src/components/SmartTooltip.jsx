import { useState, useEffect, useRef } from 'react'
import { Sparkles } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { isFileUrl, getFileName, getFileIcon } from '../utils/formatters'
import DocumentViewer from './knowledge/DocumentViewer'

const SmartTooltip = ({ source, context, index, getSourceUrl, getSourceScore, getSourceDomain, getSourceStyle, getDotColor, collectionName }) => {
  const [showBelow, setShowBelow] = useState(false)
  const [showDocViewer, setShowDocViewer] = useState(false)
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

  const isFile = isFileUrl(url)
  const displayText = isFile ? getFileName(url) : getSourceDomain(source)
  const fileIcon = isFile ? getFileIcon(displayText) : null

  let finalCollectionName = collectionName
  if (typeof source === 'object' && source.metadata && source.metadata.collection_name) {
    finalCollectionName = source.metadata.collection_name
  }

  let linkUrl = url
  
  if (isFile) {
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    
    const hasCollectionInPath = url.includes('/')
    
    if (hasCollectionInPath) {
      linkUrl = `${API_BASE}/file/files/${url}`
    } else if (finalCollectionName) {
      linkUrl = `${API_BASE}/file/files/${finalCollectionName}/${url}`
    } else {
      console.error('❌ Cannot build file URL: collection_name missing!', {
        url,
        source,
        collectionNameProp: collectionName
      })
      linkUrl = '#'
    }
  }

  const handleClick = (e) => {
    if (isFile) {
      e.preventDefault()
      if (linkUrl === '#') {
        alert('Collection name missing - cannot open file')
      } else {
        setShowDocViewer(true)
      }
    }
  }

  return (
    <>
      <div ref={sourceRef} className="group relative">
        <a 
          href={linkUrl}
          target="_blank" 
          rel="noopener noreferrer" 
          className="block px-2.5 py-1 bg-transparent border border-white/5 hover:border-brand-teal/30 rounded-lg transition-all cursor-pointer" 
          onClick={handleClick}
        >
          <div className="flex items-center gap-1.5">
            {fileIcon && <span className="text-sm">{fileIcon}</span>}
            <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(score)}`} />
            <span className="text-[11px] text-text-tertiary font-medium">{displayText}</span>
            {hasScore && (
              <span className="text-[10px] text-text-quaternary">
                {(score * 100).toFixed(0)}%
              </span>
            )}
            <svg className="w-2.5 h-2.5 text-text-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div className="bg-background-elevated border border-brand-teal/30 rounded-2xl p-4 shadow-2xl shadow-brand-teal/20 max-h-[60vh] flex flex-col">
              <div className="flex items-start gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-brand-teal flex-shrink-0 mt-0.5" />
                <span className="text-xs font-semibold text-brand-teal">Relevant chunk</span>
              </div>
              <div className="chunk-content overflow-y-auto text-sm text-text-secondary pr-2 flex-1">
                <ReactMarkdown 
                  components={{
                    h1: ({node, ...props}) => <h1 className="text-lg font-bold text-white mt-4 mb-2 first:mt-0" {...props} />,
                    h2: ({node, ...props}) => <h2 className="text-base font-semibold text-white mt-3 mb-2 first:mt-0" {...props} />,
                    h3: ({node, ...props}) => <h3 className="text-sm font-semibold text-white mt-2 mb-1 first:mt-0" {...props} />,
                    p: ({node, ...props}) => <p className="mb-3 leading-relaxed" {...props} />,
                    ul: ({node, ...props}) => <ul className="list-disc ml-5 mb-3 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal ml-5 mb-3 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                    code: ({node, inline, ...props}) => inline 
                      ? <code className="bg-white/5 text-brand-teal px-1.5 py-0.5 rounded text-xs font-mono" {...props} /> 
                      : <code className="block bg-white/5 border border-white/10 text-text-secondary p-3 rounded-lg overflow-x-auto text-xs font-mono" {...props} />,
                    pre: ({node, ...props}) => <pre className="mb-3" {...props} />,
                    a: ({node, ...props}) => <a className="text-brand-teal hover:underline" {...props} />,
                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                    em: ({node, ...props}) => <em className="italic" {...props} />,
                    blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-brand-teal pl-4 italic text-text-tertiary my-3" {...props} />,
                  }}
                >
                  {context}
                </ReactMarkdown>
              </div>
              {hasScore && (
                <div className="mt-3 pt-2 border-t border-white/10 text-xs text-text-tertiary">
                  <span className="font-semibold">Relevance Score:</span> {(score * 100).toFixed(1)}%
                </div>
              )}
            </div>
            {/* Arrow pointing to the source */}
            <div 
              className="w-3 h-3 bg-background-elevated border-brand-teal/30 transform rotate-45 absolute left-6"
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

      {/* Document Viewer Modal */}
      {showDocViewer && (
        <DocumentViewer
          url={linkUrl}
          filename={displayText}
          onClose={() => setShowDocViewer(false)}
        />
      )}
    </>
  )
}

export default SmartTooltip