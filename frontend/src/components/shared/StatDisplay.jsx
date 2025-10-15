
export default function StatDisplay({ 
  value, 
  label, 
  variant = 'default',
  className = '' 
}) {
  const variants = {
    default: 'bg-slate-900/30 border-white/10',
    success: 'bg-green-500/10 border-green-500/20',
    warning: 'bg-orange-500/10 border-orange-500/20',
    danger: 'bg-red-500/10 border-red-500/20',
    info: 'bg-blue-500/10 border-blue-500/20'
  }

  const textColors = {
    default: 'text-white',
    success: 'text-green-400',
    warning: 'text-orange-400',
    danger: 'text-red-400',
    info: 'text-blue-400'
  }

  return (
    <div className={`p-4 ${variants[variant]} border rounded-xl text-center ${className}`}>
      <div className={`text-2xl font-bold ${textColors[variant]}`}>{value}</div>
      <div className="text-xs text-slate-400 mt-1">{label}</div>
    </div>
  )
}