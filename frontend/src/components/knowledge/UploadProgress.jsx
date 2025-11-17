import { CheckCircle2, AlertCircle, Loader2, FileText, Sparkles } from 'lucide-react'
import ProgressBar from '../shared/ProgressBar'
import StatDisplay from '../shared/StatDisplay'

export default function UploadProgress({ isOpen, progress, onClose }) {
  if (!isOpen || !progress) return null

  // Determine which stage we're in
  const isScraping = progress.status === 'crawling' || progress.status === 'scraping'
  const isChunking = progress.status === 'chunking'
  const isEmbedding = progress.status === 'embedding'
  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'

  // Safe number extraction
  const totalChunks = progress.total_chunks ?? 0
  const embeddedChunks = progress.embedded_chunks ?? 0

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
      <style>{`
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .progress-shimmer {
          position: relative;
          overflow: hidden;
        }
        .progress-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.1), transparent);
          animation: progress-shimmer 2s infinite;
        }
      `}</style>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900/95 border border-white/10 rounded-2xl max-w-3xl w-full shadow-2xl">
        <div className="p-8">
          {/* Header Status */}
          <div className="text-center mb-8">
            {isComplete ? (
              <div className="w-20 h-20 bg-brand-teal/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-brand-teal" />
              </div>
            ) : isError ? (
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
            ) : (
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-brand-teal/20 rounded-full animate-pulse" />
                <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-brand-teal animate-spin" />
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-2">
              {isComplete ? 'Upload Complete!' :
               isError ? 'Upload Failed' :
               isScraping ? 'Scraping Websites' :
               isChunking ? 'Chunking Documents' :
               isEmbedding ? 'Creating Embeddings' :
               'Processing Documents'}
            </h2>
            <p className="text-slate-400">{progress.message}</p>
          </div>

          {/* Two-Stage Progress */}
          {!isError && (
            <div className="space-y-6 mb-6">
              {/* Stage 1: Scraping & Chunking */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className={`w-5 h-5 ${
                      isScraping || isChunking ? 'text-white animate-pulse' : 
                      isEmbedding || isComplete ? 'text-brand-teal' : 
                      'text-slate-500'
                    }`} />
                    <span className={`font-medium ${
                      isScraping || isChunking ? 'text-white' : 
                      isEmbedding || isComplete ? 'text-brand-teal' : 
                      'text-slate-500'
                    }`}>
                      Stage 1: Scraping & Chunking
                    </span>
                  </div>
                  <span className="text-sm text-slate-400">
                    {progress.current || 0} / {progress.total || 0} pages
                  </span>
                </div>
                
                <ProgressBar
                  current={progress.current || 0}
                  total={progress.total || 0}
                  showPercentage
                  className={isScraping || isChunking ? 'progress-shimmer' : ''}
                  color={isEmbedding || isComplete ? 'teal' : 'white'}
                />

                {progress.current_url && (isScraping || isChunking) && (
                  <div className="p-3 bg-slate-800/50 rounded-lg">
                    <div className="text-xs text-slate-500 mb-1">Currently processing:</div>
                    <div className="text-sm text-slate-300 font-mono truncate">{progress.current_url}</div>
                  </div>
                )}
              </div>

              {/* Stage 2: Embedding Generation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className={`w-5 h-5 ${
                      isEmbedding ? 'text-brand-teal animate-pulse' : 
                      isComplete ? 'text-brand-teal' : 
                      'text-slate-500'
                    }`} />
                    <span className={`font-medium ${
                      isEmbedding ? 'text-white' : 
                      isComplete ? 'text-brand-teal' : 
                      'text-slate-500'
                    }`}>
                      Stage 2: Creating Embeddings
                    </span>
                  </div>
                  {(isEmbedding || isComplete) && totalChunks > 0 && (
                    <span className="text-sm text-slate-400">
                      {embeddedChunks} / {totalChunks} chunks
                    </span>
                  )}
                </div>
                
                {(isEmbedding || isComplete) && totalChunks > 0 ? (
                  <>
                    <ProgressBar
                      current={embeddedChunks}
                      total={totalChunks}
                      showPercentage={true}
                      className={isEmbedding ? 'progress-shimmer' : ''}
                      color={isComplete ? 'teal' : 'teal'}
                    />
                    
                    {isEmbedding && (
                      <div className="p-3 bg-brand-teal/10 border border-brand-teal/20 rounded-lg">
                        <div className="text-sm text-slate-300">
                          Generating vector embeddings and storing in database...
                        </div>
                      </div>
                    )}
                  </>
                ) : (isScraping || isChunking) ? (
                  <div className="h-3 bg-slate-800/50 rounded-full relative overflow-hidden">
                    <div className="h-full w-0 bg-slate-700 rounded-full" />
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Completion Stats */}
          {isComplete && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatDisplay 
                value={progress.processed?.length || progress.total_processed || 0} 
                label="Pages Scraped" 
                variant="success" 
              />
              <StatDisplay 
                value={totalChunks} 
                label="Chunks Created" 
                variant="info" 
              />
              <StatDisplay 
                value={progress.failed?.length || 0} 
                label="Failed" 
                variant="danger" 
              />
            </div>
          )}

          {/* Failed URLs */}
          {progress.failed && progress.failed.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Failed URLs ({progress.failed.length})</span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {progress.failed.map((failedItem, idx) => (
                  <div key={idx} className="text-xs text-slate-400 font-mono truncate">
                    • {failedItem.url || failedItem}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done Button - Only show when complete or error */}
          {(isComplete || isError) && onClose && (
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl"
            >
              {isComplete ? 'Done' : 'Close'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}