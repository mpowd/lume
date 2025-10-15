import { Sparkles } from 'lucide-react'
import { SOURCE_TYPES } from '../../constants/sourceTypes'

export default function SourceTypeSelector({ onSelect }) {
  return (
    <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-white mb-3">Choose Source Type</h2>
        <p className="text-slate-400">Select where to import your knowledge from</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {SOURCE_TYPES.map(type => {
          const Icon = type.icon
          return (
            <button
              key={type.id}
              onClick={() => type.implemented && onSelect(type.id)}
              disabled={!type.implemented}
              className={`group relative overflow-hidden p-8 rounded-2xl border transition-all text-left ${
                type.implemented
                  ? 'bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border-white/10 hover:border-blue-500/30 cursor-pointer'
                  : 'bg-slate-900/20 border-white/5 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                type.color === 'blue' ? 'from-blue-500/5 to-purple-500/5' :
                type.color === 'purple' ? 'from-purple-500/5 to-pink-500/5' :
                type.color === 'green' ? 'from-green-500/5 to-emerald-500/5' :
                'from-slate-500/5 to-slate-600/5'
              }`} />
              
              <div className="relative">
                <div className={`p-4 rounded-2xl mb-4 inline-flex ${
                  type.implemented 
                    ? `bg-${type.color}-500/10 group-hover:bg-${type.color}-500/20`
                    : 'bg-slate-800/30'
                } transition-all`}>
                  <Icon className={`w-8 h-8 ${
                    type.implemented ? `text-${type.color}-400` : 'text-slate-600'
                  }`} />
                </div>
                
                <h3 className={`text-xl font-semibold mb-2 ${
                  type.implemented ? 'text-white group-hover:text-blue-400' : 'text-slate-600'
                } transition-colors`}>
                  {type.label}
                </h3>
                
                <p className={`text-sm mb-4 ${
                  type.implemented ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600'
                } transition-colors`}>
                  {type.description}
                </p>
                
                {!type.implemented && (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-xs font-medium text-slate-500">Coming Soon</span>
                  </div>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}