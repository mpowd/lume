import { useState } from 'react'
import { FileText, Calendar, Hash, Trash2, Play, Edit3 } from 'lucide-react'
import { evaluationAPI } from '../../services/api'
import Card from '../shared/Card'
import Button from '../shared/Button'
import EmptyState from '../shared/EmptyState'

export default function DatasetList({ datasets, onSelect, onEdit, onDelete, onRefresh }) {
  const [deleting, setDeleting] = useState(null)

  const handleDelete = async (datasetId, datasetName) => {
    if (!confirm(`Delete dataset "${datasetName}"? This cannot be undone.`)) return
    
    setDeleting(datasetId)
    try {
      await evaluationAPI.deleteDataset(datasetId)
      onDelete()
    } catch (error) {
      alert('Error deleting dataset: ' + (error.response?.data?.detail || error.message))
    } finally {
      setDeleting(null)
    }
  }

  if (datasets.length === 0) {
    return (
      <Card className="p-16">
        <EmptyState
          icon={FileText}
          title="No Evaluation Datasets"
          description="Create your first dataset to start evaluating assistants"
        />
      </Card>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Evaluation Datasets</h2>
        <Button variant="ghost" size="sm" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {datasets.map((dataset) => (
          <Card
            key={dataset._id}
            className="p-6 hover:border-white/20 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onEdit(dataset)}
                  className="p-2 hover:bg-brand-teal/10 rounded-lg transition-colors text-slate-400 hover:text-brand-teal"
                  title="Edit dataset"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dataset._id, dataset.name || dataset.dataset_name)}
                  disabled={deleting === dataset._id}
                  className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-400 hover:text-red-400"
                  title="Delete dataset"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-brand-teal transition-colors">
              {dataset.name || dataset.dataset_name}
            </h3>

            {dataset.description && (
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                {dataset.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                <span>{dataset.qa_pairs?.length || 0} pairs</span>
              </div>
              {dataset.source_collection && dataset.source_collection !== 'manual' && (
                <>
                  <span>•</span>
                  <span className="truncate">{dataset.source_collection}</span>
                </>
              )}
            </div>

            {dataset.generated_at && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(dataset.generated_at).toLocaleDateString()}</span>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/5">
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                icon={Play}
                onClick={() => onSelect(dataset)}
              >
                Run Evaluation
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}