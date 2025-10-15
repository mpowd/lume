import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ 
  size = 'md',
  text,
  fullScreen = false 
}) {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  }

  const content = (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className={`${sizes[size]} text-blue-400 animate-spin`} />
      {text && <span className="text-slate-400 text-sm">{text}</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {content}
      </div>
    )
  }

  return content
}