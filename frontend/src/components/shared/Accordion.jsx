import { ChevronDown } from 'lucide-react'

export default function Accordion({ 
  title, 
  icon: Icon,
  isOpen, 
  onToggle, 
  children,
  className = ''
}) {
  return (
    <div className={`border-t border-white/10 pt-5 ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        className="
          w-full flex items-center justify-between 
          p-4 bg-transparent border border-white/10 rounded-xl 
          transition-all duration-200
          hover:border-white/20 hover:bg-white/[0.02]
        "
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-brand-teal" />}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <ChevronDown 
          className={`
            w-5 h-5 text-text-tertiary 
            transition-transform duration-200
            ${isOpen ? 'rotate-180' : ''}
          `} 
        />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 animate-slide-in-top">
          {children}
        </div>
      )}
    </div>
  )
}