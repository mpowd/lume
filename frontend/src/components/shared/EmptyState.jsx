
export default function EmptyState({ 
  icon: Icon, 
  title, 
  description,
  action,
  className = ''
}) {
  return (
    <div className={`text-center py-16 ${className}`}>
      {Icon && (
        <div className="inline-flex p-4 bg-slate-900/50 rounded-2xl mb-4">
          <Icon className="w-12 h-12 text-slate-600" />
        </div>
      )}
      {title && <p className="text-slate-400 text-lg mb-2">{title}</p>}
      {description && <p className="text-slate-500 text-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}