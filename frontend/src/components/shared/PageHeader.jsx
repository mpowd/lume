import Button from './Button'

export default function PageHeader({ 
  icon: Icon,
  title,
  subtitle,
  action,
  actionLabel,
  onAction,
  actionIcon: ActionIcon
}) {
  return (
    <div className="sticky top-0 z-10 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-xl">
                <Icon className="w-6 h-6 text-blue-400" />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white">{title}</h1>
              {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
            </div>
          </div>
          
          {(action || onAction) && (
            action || (
              <Button
                variant="primary"
                icon={ActionIcon}
                onClick={onAction}
              >
                {actionLabel}
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  )
}