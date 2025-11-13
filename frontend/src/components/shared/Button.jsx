import { Loader2 } from 'lucide-react'

const variants = {
  primary: `
    border border-white/20 bg-transparent text-white
    hover:border-brand-teal/50 hover:bg-white/5
  `,
  standout: `
    border border-brand-teal/40 bg-[rgb(20,184,166,0.08)] text-white
    hover:border-brand-teal/60 hover:bg-[rgb(20,184,166,0.12)]
    shadow-[0_0_20px_rgb(20,184,166,0.15)]
    hover:shadow-[0_0_25px_rgb(20,184,166,0.25)]
    hover:-translate-y-0.5
  `,
  secondary: `
    border border-white/10 bg-transparent text-text-tertiary
    hover:border-brand-teal/30 hover:bg-white/5 hover:text-white
  `,
  ghost: `
    border border-transparent bg-transparent text-text-tertiary
    hover:bg-white/5 hover:border-brand-teal/20 hover:text-white
  `,
  danger: `
    border border-danger-border bg-transparent text-danger
    hover:border-[rgb(239,68,68,0.5)] hover:bg-danger-bg
  `,
  success: `
    border border-success-border bg-transparent text-white
    hover:border-[rgb(52,211,153,0.5)] hover:bg-success-bg
  `
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-base',
  xl: 'px-8 py-4 text-lg'
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  loading = false,
  disabled = false,
  icon: Icon,
  fullWidth = false,
  onClick,
  type = 'button',
  className = ''
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        rounded-xl font-medium
        flex items-center justify-center gap-2
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        active:scale-[0.98] disabled:active:scale-100
        disabled:hover:translate-y-0
        ${className}
      `}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  )
}