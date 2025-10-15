import { Loader2 } from 'lucide-react'

const variants = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40',
  secondary: 'bg-slate-900/50 hover:bg-slate-800/50 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white',
  danger: 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400',
  success: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-600/25',
  ghost: 'bg-transparent hover:bg-white/5 text-slate-400 hover:text-white'
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
        rounded-xl font-medium transition-all
        flex items-center justify-center gap-2
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100
        cursor-pointer
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