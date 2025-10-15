import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import ProgressBar from '../shared/ProgressBar'
import StatDisplay from '../shared/StatDisplay'

export default function UploadProgress({ isOpen, progress }) {
  if (!isOpen || !progress) return null

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
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: progress-shimmer 2s infinite;
        }
      `}</style>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900/95 border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl">
        <div className="p-8">
          <div className="text-center mb-8">
            {progress.status === 'complete' ? (
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
              </div>
            ) : progress.status === 'error' ? (
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
            ) : (
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse" />
                <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-2">
              {progress.status === 'complete' ? 'Upload Complete!' :
               progress.status === 'error' ? 'Upload Failed' :
               'Processing Documents'}
            </h2>
            <p className="text-slate-400">{progress.message}</p>
          </div>

          {progress.status !== 'error' && (
            <div className="mb-6">
              <ProgressBar
                current={progress.current}
                total={progress.total}
                label="Progress"
                showPercentage
                className="progress-shimmer"
              />
            </div>
          )}

          {progress.current_url && progress.status !== 'complete' && (
            <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
              <div className="text-xs text-slate-500 mb-1">Currently processing:</div>
              <div className="text-sm text-slate-300 font-mono truncate">{progress.current_url}</div>
            </div>
          )}

          {progress.status === 'complete' && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <StatDisplay 
                value={progress.processed?.length || 0} 
                label="Processed" 
                variant="success" 
              />
              <StatDisplay 
                value={progress.total_chunks || 0} 
                label="Chunks" 
                variant="info" 
              />
              <StatDisplay 
                value={progress.failed?.length || 0} 
                label="Failed" 
                variant="danger" 
              />
            </div>
          )}

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
        </div>
      </div>
    </div>
  )
}