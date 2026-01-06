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
      <Loader2 className={`${sizes[size]} text-brand-teal animate-spin`} />
      {text && <span className="text-text-tertiary text-sm">{text}</span>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        {content}
      </div>
    )
  }

  return content
}