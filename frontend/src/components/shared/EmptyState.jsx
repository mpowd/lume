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
        <div className="inline-flex p-4 bg-transparent border border-white/10 rounded-2xl mb-4">
          <Icon className="w-12 h-12 text-text-disabled" />
        </div>
      )}
      {title && <p className="text-text-tertiary text-lg mb-2">{title}</p>}
      {description && <p className="text-text-quaternary text-sm mb-6">{description}</p>}
      {action}
    </div>
  )
}