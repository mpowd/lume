import { Brain } from 'lucide-react'

export default function MemoryToggle({ enabled, onToggle }) {
    return (
        <button
            onClick={() => onToggle(!enabled)}
            title={enabled ? 'Memory on — click to disable' : 'Memory off — click to enable'}
            className={`
        flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium
        transition-all duration-200 select-none
        ${enabled
                    ? 'bg-brand-teal/10 border-brand-teal/40 text-brand-teal hover:bg-brand-teal/20'
                    : 'bg-transparent border-border-default text-text-quaternary hover:border-border-strong hover:text-text-tertiary'
                }
      `}
        >
            {/* Animated brain icon */}
            <Brain className={`w-3.5 h-3.5 transition-colors ${enabled ? 'text-brand-teal' : 'text-text-disabled'}`} />

            {/* Toggle pill */}
            <span>{enabled ? 'Memory on' : 'Memory off'}</span>

            {/* Small LED dot */}
            <span className={`
        w-1.5 h-1.5 rounded-full transition-colors
        ${enabled ? 'bg-brand-teal shadow-[0_0_6px_theme(colors.brand-teal)]' : 'bg-text-disabled'}
      `} />
        </button>
    )
}