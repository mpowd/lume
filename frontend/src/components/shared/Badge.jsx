
const variants = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  green: 'bg-green-500/10 text-green-400 border-green-500/30',
  orange: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  red: 'bg-red-500/10 text-red-400 border-red-500/30',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/30'
}

export default function Badge({ 
  children, 
  variant = 'blue',
  icon: Icon,
  className = '' 
}) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-xs font-medium ${variants[variant]} ${className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {children}
    </span>
  )
}