// frontend/src/components/knowledge/UploadProgress.jsx
import { CheckCircle2, AlertCircle, Loader2, Circle, TrendingUp, FileCheck, Sparkles, Package } from 'lucide-react'

export default function UploadProgress({ isOpen, progress, onClose }) {
  if (!isOpen || !progress) return null

  const isComplete = progress.status === 'complete'
  const isError = progress.status === 'error'
  
  const stages = progress.stages || []
  const currentStageIndex = stages.findIndex(stage => stage.is_current)
  const stats = progress.stats || []

  // Debug logging
  console.log('UploadProgress render:', {
    isComplete,
    status: progress.status,
    statsLength: stats.length,
    stats: stats,
    fullProgress: progress
  })

  // Get icon for stat variant
  const getStatIcon = (variant) => {
    switch(variant) {
      case 'success': return <FileCheck className="w-5 h-5" />
      case 'info': return <Package className="w-5 h-5" />
      case 'warning': return <TrendingUp className="w-5 h-5" />
      case 'danger': return <AlertCircle className="w-5 h-5" />
      default: return <Sparkles className="w-5 h-5" />
    }
  }

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
          background: linear-gradient(90deg, transparent, rgba(20, 184, 166, 0.2), transparent);
          animation: progress-shimmer 1.5s infinite;
        }
        @keyframes pulse-ring {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
        .pulse-ring {
          animation: pulse-ring 2s ease-in-out infinite;
        }
        @keyframes count-up {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .count-up {
          animation: count-up 0.5s ease-out forwards;
        }
        @keyframes success-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .success-pulse {
          animation: success-pulse 2s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-gradient-to-br from-slate-900 to-slate-900/95 border border-white/10 rounded-2xl max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-8 overflow-y-auto flex-1">
          {/* Header Status */}
          <div className="text-center mb-8">
            {isComplete ? (
              <div className="w-20 h-20 bg-brand-teal/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-500 success-pulse">
                <CheckCircle2 className="w-10 h-10 text-brand-teal" />
              </div>
            ) : isError ? (
              <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-red-400" />
              </div>
            ) : (
              <div className="relative w-20 h-20 mx-auto mb-4">
                <div className="absolute inset-0 bg-brand-teal/20 rounded-full pulse-ring" />
                <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-brand-teal animate-spin" />
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white mb-2">
              {progress.title || 'Processing'}
            </h2>
            <p className="text-slate-400">{progress.message}</p>
          </div>

          {/* Progress Stages - Only show during processing */}
          {!isError && !isComplete && stages.length > 0 && (
            <div className="space-y-6 mb-8">
              {stages.map((stage, index) => {
                const isPast = (currentStageIndex > index)
                const isCurrent = stage.is_current
                const isFuture = (currentStageIndex !== -1 && currentStageIndex < index)
                
                const current = stage.current ?? 0
                const total = stage.total ?? 0
                const percentage = total > 0 ? Math.round((current / total) * 100) : 0

                return (
                  <div 
                    key={index} 
                    className={`space-y-3 transition-all duration-300 ${
                      isCurrent ? 'scale-105' : ''
                    }`}
                  >
                    {/* Stage Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {/* Status Icon */}
                        <div className={`flex items-center justify-center transition-all duration-300 ${
                          isPast ? 'text-brand-teal scale-110' :
                          isCurrent ? 'text-white' : 
                          'text-slate-600'
                        }`}>
                          {isPast ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : isCurrent ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </div>

                        {/* Stage Icon & Label */}
                        <div className="flex items-center gap-2">
                          {stage.icon && (
                            <span className={`text-xl transition-all duration-300 ${
                              isCurrent ? 'scale-110 animate-pulse' : ''
                            }`}>
                              {stage.icon}
                            </span>
                          )}
                          <span className={`font-semibold transition-colors duration-300 ${
                            isPast ? 'text-brand-teal' :
                            isCurrent ? 'text-white' : 
                            'text-slate-500'
                          }`}>
                            {stage.label}
                          </span>
                        </div>
                      </div>

                      {/* Progress Counter */}
                      {total > 0 && (
                        <span className={`text-sm font-mono transition-colors duration-300 ${
                          isPast ? 'text-brand-teal' :
                          isCurrent ? 'text-white' : 
                          'text-slate-500'
                        }`}>
                          {current} / {total} {stage.unit || 'items'}
                        </span>
                      )}
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="relative">
                      <div className={`w-full rounded-full h-2.5 overflow-hidden transition-all duration-300 ${
                        isCurrent ? 'bg-slate-700 ring-2 ring-brand-teal/30' : 'bg-slate-800'
                      }`}>
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            isPast ? 'bg-brand-teal shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 
                            isCurrent ? 'bg-white progress-shimmer' : 
                            'bg-slate-700'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      
                      {/* Percentage Label */}
                      {stage.show_percentage !== false && total > 0 && (
                        <div className={`text-xs font-semibold text-right mt-1.5 transition-colors duration-300 ${
                          isPast ? 'text-brand-teal' :
                          isCurrent ? 'text-white' : 
                          'text-slate-600'
                        }`}>
                          {percentage}%
                        </div>
                      )}
                    </div>

                    {/* Current Item Being Processed */}
                    {isCurrent && stage.current_item && (
                      <div className="p-3 bg-slate-800/70 rounded-lg border border-brand-teal/20 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-pulse" />
                          <div className="text-xs text-brand-teal font-semibold">Processing:</div>
                        </div>
                        <div className="text-sm text-slate-300 font-mono truncate pl-3.5">
                          {stage.current_item}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Completion Stats - Enhanced Display */}
          {isComplete && (
            <div className="space-y-6 mb-6">
              {/* Success Message */}
              <div className="text-center p-4 bg-brand-teal/10 rounded-xl border border-brand-teal/30 animate-in slide-in-from-top-2 duration-500">
                <Sparkles className="w-8 h-8 text-brand-teal mx-auto mb-2" />
                <p className="text-brand-teal font-semibold">Processing Complete!</p>
              </div>

              {/* Stats Grid */}
              {stats.length > 0 ? (
                <div className="grid gap-4" style={{
                  gridTemplateColumns: stats.length === 1 ? '1fr' : 
                                      stats.length === 2 ? 'repeat(2, 1fr)' :
                                      stats.length === 3 ? 'repeat(3, 1fr)' :
                                      stats.length === 4 ? 'repeat(2, 1fr)' :
                                      'repeat(3, 1fr)'
                }}>
                  {stats.map((stat, index) => {
                    const variantStyles = {
                      success: {
                        bg: 'bg-gradient-to-br from-green-500/20 to-green-600/10',
                        border: 'border-green-500/40',
                        text: 'text-green-400',
                        glow: 'shadow-green-500/20'
                      },
                      info: {
                        bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
                        border: 'border-blue-500/40',
                        text: 'text-blue-400',
                        glow: 'shadow-blue-500/20'
                      },
                      warning: {
                        bg: 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/10',
                        border: 'border-yellow-500/40',
                        text: 'text-yellow-400',
                        glow: 'shadow-yellow-500/20'
                      },
                      danger: {
                        bg: 'bg-gradient-to-br from-red-500/20 to-red-600/10',
                        border: 'border-red-500/40',
                        text: 'text-red-400',
                        glow: 'shadow-red-500/20'
                      }
                    }
                    
                    const style = variantStyles[stat.variant] || variantStyles.info
                    
                    return (
                      <div 
                        key={index} 
                        className={`
                          ${style.bg} ${style.border} ${style.glow}
                          p-5 rounded-xl border-2 shadow-lg
                          count-up hover:scale-105 transition-transform duration-300
                        `}
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className={`${style.text} opacity-80`}>
                            {getStatIcon(stat.variant)}
                          </div>
                          <div className={`text-sm font-medium ${style.text} opacity-90`}>
                            {stat.label}
                          </div>
                        </div>
                        <div className={`text-3xl font-bold ${style.text}`}>
                          {stat.value.toLocaleString()}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center p-6 bg-slate-800/50 rounded-xl">
                  <p className="text-slate-400 text-sm">No statistics available</p>
                </div>
              )}

              {/* Summary Message */}
              <div className="text-center p-4 bg-slate-800/50 rounded-xl">
                <p className="text-slate-300 text-sm">
                  Your files have been successfully processed and added to the knowledge base
                </p>
              </div>
            </div>
          )}

          {/* Failed Items */}
          {progress.failed && progress.failed.length > 0 && (
            <div className="mb-6 p-4 bg-red-500/10 border-2 border-red-500/30 rounded-xl animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <span className="text-sm font-semibold text-red-400">
                  Failed Items ({progress.failed.length})
                </span>
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1.5 pl-7">
                {progress.failed.map((failedItem, idx) => (
                  <div key={idx} className="text-sm text-red-300/80 font-mono">
                    • {typeof failedItem === 'string' ? failedItem : failedItem.name || failedItem.url}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Button */}
        {(isComplete || isError) && onClose && (
          <div className="p-6 border-t border-white/10 bg-slate-900/50">
            <button
              onClick={onClose}
              className="w-full py-3.5 px-4 bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-brand-teal/25"
            >
              {isComplete ? 'Done' : 'Close'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}