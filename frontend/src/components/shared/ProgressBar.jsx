
export default function ProgressBar({ 
  current, 
  total, 
  label,
  showPercentage = true,
  className = '' 
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  return (
    <div className={className}>
      {(label || showPercentage) && (
        <div className="flex justify-between text-sm text-slate-400 mb-2">
          {label && <span>{label}</span>}
          {showPercentage && <span>{current} / {total}</span>}
        </div>
      )}
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showPercentage && total > 0 && (
        <div className="text-center mt-2 text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          {percentage}% Complete
        </div>
      )}
    </div>
  )
}