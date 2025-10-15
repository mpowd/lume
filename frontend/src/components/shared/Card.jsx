
export default function Card({ 
  children, 
  onClick, 
  hover = true,
  className = '' 
}) {
  return (
    <div
      onClick={onClick}
      className={`
        bg-gradient-to-br from-slate-900/50 to-slate-900/30
        backdrop-blur-xl border border-white/10 rounded-2xl
        ${hover ? 'hover:border-white/20 hover:from-slate-900/70 hover:to-slate-900/50' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        transition-all
        ${className}
      `}
    >
      {children}
    </div>
  )
}