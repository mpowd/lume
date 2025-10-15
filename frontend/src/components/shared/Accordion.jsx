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
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {Icon && <Icon className="w-5 h-5 text-slate-400" />}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  )
}