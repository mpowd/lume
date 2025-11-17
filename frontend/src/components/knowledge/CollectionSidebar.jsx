import { Database, Plus, ChevronRight } from 'lucide-react'
import EmptyState from '../shared/EmptyState'
import Button from '../shared/Button'

export default function CollectionSidebar({ 
  collections, 
  activeCollection,
  onSelect, 
  onCreate
}) {
  return (
    <div className="w-80 border-r border-white/5 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Collections</h2>
          <button
            onClick={onCreate}
            className="p-2 bg-transparent hover:bg-white/5 border border-brand-teal/30 hover:border-brand-teal/50 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4 text-brand-teal" />
          </button>
        </div>
        <p className="text-sm text-text-tertiary">Your knowledge sources</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {collections.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No collections yet"
            description="Create your first collection"
            action={
              <Button variant="primary" size="sm" onClick={onCreate}>
                Create first collection
              </Button>
            }
          />
        ) : (
          collections.map(collection => (
            <button
              key={collection}
              onClick={() => onSelect(collection)}
              className={`w-full text-left p-4 rounded-xl transition-all group ${
                activeCollection === collection
                  ? 'bg-white/5 border border-brand-teal/50'
                  : 'bg-transparent border border-white/5 hover:border-white/10 hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all ${
                  activeCollection === collection ? 'bg-transparent border border-brand-teal/30' : 'bg-transparent border border-white/10 group-hover:border-white/20'
                }`}>
                  <Database className={`w-4 h-4 ${activeCollection === collection ? 'text-brand-teal' : 'text-text-tertiary'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${activeCollection === collection ? 'text-white' : 'text-text-secondary'}`}>
                    {collection}
                  </p>
                </div>
                {activeCollection === collection && (
                  <ChevronRight className="w-4 h-4 text-brand-teal flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}