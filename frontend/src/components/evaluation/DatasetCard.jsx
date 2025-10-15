import { Beaker, Calendar, Hash } from 'lucide-react'
import Card from '../shared/Card'

export default function DatasetCard({ dataset, onClick }) {
  return (
    <Card onClick={onClick} className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-xl transition-all">
          <Beaker className="w-6 h-6 text-blue-400" />
        </div>
        <div className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <span className="text-sm font-bold text-blue-400">{dataset.qa_pairs?.length || 0}</span>
        </div>
      </div>

      <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
        {dataset.name}
      </h3>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Calendar className="w-3.5 h-3.5" />
          <span>{new Date(dataset.generated_at).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Hash className="w-3.5 h-3.5" />
          <span>{dataset.qa_pairs?.length || 0} questions</span>
        </div>
      </div>
    </Card>
  )
}