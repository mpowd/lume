import { X } from 'lucide-react'

export default function Modal({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = 'max-w-lg'
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
      <div className={`bg-slate-900 border border-white/10 rounded-2xl ${maxWidth} w-full shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  )
}