import { AlertCircle, X } from 'lucide-react'

export default function ErrorAlert({ 
  message, 
  onClose,
  className = '' 
}) {
  if (!message) return null

  return (
    <div className={`p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 ${className}`}>
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
      <p className="text-red-400 text-sm flex-1">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="text-red-400 hover:text-red-300 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}