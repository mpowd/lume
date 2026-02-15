import { useState } from 'react'
import { Database, Search, Edit3, Trash2, ArrowLeft, ChevronDown, ChevronUp, FileText, Calendar, Hash, Eye } from 'lucide-react'
import { deleteDataset } from '../../api/generated'
import Card from '../shared/Card'
import Button from '../shared/Button'
import SearchInput from '../shared/SearchInput'
import EmptyState from '../shared/EmptyState'
import ConfirmDialog from '../shared/ConfirmDialog'
import Badge from '../shared/Badge'
import DatasetDetailView from './DatasetDetailView'

export default function DatasetManager({ datasets, onEdit, onDelete, onBack }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedDatasets, setExpandedDatasets] = useState(new Set())
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, dataset: null })
  const [deleting, setDeleting] = useState(false)

  const filteredDatasets = datasets.filter(dataset => {
    const searchLower = searchQuery.toLowerCase()
    const name = (dataset.name || dataset.dataset_name || '').toLowerCase()
    const description = (dataset.description || '').toLowerCase()
    const collection = (dataset.source_collection || '').toLowerCase()
    return name.includes(searchLower) || description.includes(searchLower) || collection.includes(searchLower)
  })

  const toggleExpand = (datasetId) => {
    const newExpanded = new Set(expandedDatasets)
    if (newExpanded.has(datasetId)) newExpanded.delete(datasetId)
    else newExpanded.add(datasetId)
    setExpandedDatasets(newExpanded)
  }

  const handleDeleteClick = (dataset) => setDeleteDialog({ isOpen: true, dataset })

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.dataset) return
    setDeleting(true)
    try {
      await deleteDataset(deleteDialog.dataset._id || deleteDialog.dataset.id)
      onDelete()
      setDeleteDialog({ isOpen: false, dataset: null })
    } catch (error) {
      alert('Error deleting dataset: ' + (error.response?.data?.detail || error.message))
    } finally {
      setDeleting(false)
    }
  }

  const handleViewDetails = (dataset) => setSelectedDataset(dataset)

  if (selectedDataset) {
    return (
      <DatasetDetailView
        dataset={selectedDataset}
        onBack={() => setSelectedDataset(null)}
        onEdit={() => onEdit(selectedDataset)}
        onDelete={() => { setSelectedDataset(null); onDelete() }}
      />
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Card className="p-8">
        <div className="mb-8">
          <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4" style={{ cursor: 'pointer' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Overview
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Manage Datasets</h2>
              <p className="text-sm text-slate-400 mt-0.5">View, edit, and organize your evaluation datasets</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-6">
            <div className="flex-1">
              <SearchInput value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search datasets by name, description, or collection..." />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-950/50 border border-white/10">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-300">{filteredDatasets.length} {filteredDatasets.length === 1 ? 'dataset' : 'datasets'}</span>
            </div>
          </div>
        </div>

        {filteredDatasets.length === 0 ? (
          <EmptyState icon={Search} title={searchQuery ? "No datasets found" : "No datasets yet"} description={searchQuery ? "Try adjusting your search terms" : "Create your first dataset to get started"} />
        ) : (
          <div className="space-y-3">
            {filteredDatasets.map((dataset) => {
              const datasetId = dataset._id || dataset.id
              const isExpanded = expandedDatasets.has(datasetId)
              const qaPairs = dataset.qa_pairs || []
              return (
                <div key={datasetId} className="rounded-xl border border-white/10 bg-slate-950/30 overflow-hidden transition-all hover:border-white/20">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-white">{dataset.name || dataset.dataset_name}</h3>
                          {dataset.use_case && <Badge variant="gray">{dataset.use_case === 'qa' ? 'Q&A' : dataset.use_case}</Badge>}
                        </div>
                        {dataset.description && <p className="text-sm text-slate-400 mb-3">{dataset.description}</p>}
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5"><Hash className="w-3.5 h-3.5" /><span>{qaPairs.length} Q&A pairs</span></div>
                          {dataset.source_collection && dataset.source_collection !== 'manual' && (<><span>•</span><div className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /><span className="truncate max-w-[200px]">{dataset.source_collection}</span></div></>)}
                          {dataset.generated_at && (<><span>•</span><div className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /><span>{new Date(dataset.generated_at).toLocaleDateString()}</span></div></>)}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button onClick={() => handleViewDetails(dataset)} className="p-2 hover:bg-brand-teal/10 rounded-lg transition-colors text-slate-400 hover:text-brand-teal" style={{ cursor: 'pointer' }} title="View details"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => onEdit(dataset)} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white" style={{ cursor: 'pointer' }} title="Edit dataset"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => handleDeleteClick(dataset)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-slate-400 hover:text-red-400" style={{ cursor: 'pointer' }} title="Delete dataset"><Trash2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleExpand(datasetId)} className="p-2 hover:bg-white/5 rounded-lg transition-colors text-slate-400 hover:text-white" style={{ cursor: 'pointer' }} title={isExpanded ? "Collapse" : "Expand"}>
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && qaPairs.length > 0 && (
                    <div className="border-t border-white/10 bg-slate-950/50 p-6">
                      <h4 className="text-sm font-semibold text-slate-300 mb-4">Q&A Pairs ({qaPairs.length})</h4>
                      <div className="space-y-4">
                        {qaPairs.slice(0, 3).map((pair, idx) => (
                          <div key={idx} className="p-4 rounded-lg bg-slate-900/50 border border-white/5">
                            <div className="mb-3"><label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Question</label><p className="text-sm text-slate-300 leading-relaxed">{pair.question}</p></div>
                            <div><label className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1 block">Ground Truth</label><p className="text-sm text-slate-400 leading-relaxed line-clamp-2">{pair.ground_truth || pair.answer}</p></div>
                          </div>
                        ))}
                        {qaPairs.length > 3 && (
                          <button onClick={() => handleViewDetails(dataset)} className="w-full py-2 px-4 rounded-lg border border-white/10 bg-slate-900/30 hover:bg-slate-900/50 text-sm text-slate-400 hover:text-white transition-colors" style={{ cursor: 'pointer' }}>
                            View all {qaPairs.length} pairs
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>
      <ConfirmDialog isOpen={deleteDialog.isOpen} onClose={() => setDeleteDialog({ isOpen: false, dataset: null })} onConfirm={handleDeleteConfirm} title="Delete Dataset" message={`Are you sure you want to delete "${deleteDialog.dataset?.name || deleteDialog.dataset?.dataset_name}"? This action cannot be undone.`} confirmText="Delete" cancelText="Cancel" variant="danger" />
    </div>
  )
}
