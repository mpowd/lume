import { Database, Plus, RefreshCw, ChevronRight } from 'lucide-react'
import EmptyState from '../shared/EmptyState'
import Button from '../shared/Button'

export default function CollectionSidebar({ 
  collections, 
  activeCollection,
  onSelect, 
  onCreate,
  onRefresh 
}) {
  return (
    <div className="w-80 border-r border-white/5 flex flex-col">
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Collections</h2>
          <div className="flex gap-2">
            <button
              onClick={onRefresh}
              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={onCreate}
              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-400" />
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-400">Your knowledge sources</p>
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
              className={`w-full text-left p-4 rounded-xl transition-all group cursor-pointer ${
                activeCollection === collection
                  ? 'bg-blue-500/10 border border-blue-500/30'
                  : 'bg-slate-900/30 border border-white/5 hover:border-white/10 hover:bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-all ${
                  activeCollection === collection ? 'bg-blue-500/20' : 'bg-slate-800/50 group-hover:bg-slate-800'
                }`}>
                  <Database className={`w-4 h-4 ${activeCollection === collection ? 'text-blue-400' : 'text-slate-400'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${activeCollection === collection ? 'text-white' : 'text-slate-300'}`}>
                    {collection}
                  </p>
                </div>
                {activeCollection === collection && (
                  <ChevronRight className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}