import { useState, useEffect } from 'react'
import { BarChart3, ArrowLeft, Edit3, Trash2, Calendar, Hash } from 'lucide-react'
import { useCollections } from '../hooks/useCollections'
import { useDatasets } from '../hooks/useDatasets'
import { useAssistants } from '../hooks/useAssistants'
import CollectionSidebar from '../components/knowledge/CollectionSidebar'
import ActionMenu from '../components/evaluation/ActionMenu'
import DatasetCard from '../components/evaluation/DatasetCard'
import DatasetForm from '../components/evaluation/DatasetForm'
import DatasetEditor from '../components/evaluation/DatasetEditor'
import EvaluationRunner from '../components/evaluation/EvaluationRunner'
import Button from '../components/shared/Button'
import Card from '../components/shared/Card'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'

export default function EvaluationPage() {
  const { collections, reload: reloadCollections } = useCollections()
  const { datasets, createDataset, generateDataset, updateDataset, deleteDataset, reload: reloadDatasets } = useDatasets()
  const { assistants } = useAssistants()
  
  const [activeCollection, setActiveCollection] = useState(null)
  const [view, setView] = useState('select-collection')
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [editingDataset, setEditingDataset] = useState(null)
  const [selectedAssistants, setSelectedAssistants] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (collections.length > 0 && !activeCollection) {
      setActiveCollection(collections[0])
    }
  }, [collections])

  const collectionDatasets = datasets.filter(d => d.source_collection === activeCollection)

  const handleCreateManualDataset = async (data) => {
    setLoading(true)
    const result = await createDataset(data)
    setLoading(false)
    
    if (result.success) {
      alert('Dataset created successfully!')
      setView('action-menu')
    } else {
      alert(result.error)
    }
  }

  const handleGenerateDataset = async (collection, name, size) => {
    setLoading(true)
    const result = await generateDataset(collection, name, size)
    setLoading(false)
    
    if (result.success) {
      alert('Dataset generated successfully!')
      setView('action-menu')
    } else {
      alert(result.error)
    }
  }

  const handleUpdateDataset = async (data) => {
    setLoading(true)
    const result = await updateDataset(editingDataset._id, data)
    setLoading(false)
    
    if (result.success) {
      alert('Dataset updated successfully!')
      const updatedDataset = datasets.find(d => d._id === editingDataset._id)
      setSelectedDataset(updatedDataset)
      setEditingDataset(null)
      setView('dataset-detail')
    } else {
      alert(result.error)
    }
  }

  const handleDeleteDataset = async (id) => {
    if (!confirm('Delete this dataset? This cannot be undone.')) return
    
    const result = await deleteDataset(id)
    if (result.success) {
      alert('Dataset deleted successfully')
      setSelectedDataset(null)
      setView('view-datasets')
    } else {
      alert(result.error)
    }
  }

  const toggleAssistantSelection = (assistantId) => {
    setSelectedAssistants(prev =>
      prev.includes(assistantId)
        ? prev.filter(id => id !== assistantId)
        : [...prev, assistantId]
    )
  }

  const handleEvaluationComplete = () => {
    setView('view-datasets')
    setSelectedDataset(null)
    setSelectedAssistants([])
  }

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <CollectionSidebar
        collections={collections}
        activeCollection={activeCollection}
        onSelect={(col) => {
          setActiveCollection(col)
          setView('action-menu')
        }}
        onCreate={() => {}}
        onRefresh={reloadCollections}
      />

      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        {!activeCollection ? (
          <EmptyState
            icon={BarChart3}
            title="Evaluation Lab"
            description="Select a collection to start evaluating your AI assistants"
          />
        ) : view === 'action-menu' ? (
          <ActionMenu
            collectionName={activeCollection}
            datasetCount={collectionDatasets.length}
            onCreateManual={() => setView('create-manual')}
            onGenerateAuto={() => setView('generate-auto')}
            onViewDatasets={() => setView('view-datasets')}
          />
        ) : view === 'view-datasets' ? (
          <div className="w-full max-w-7xl">
            <Button variant="ghost" onClick={() => setView('action-menu')} icon={ArrowLeft} className="mb-8">
              Back to Menu
            </Button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Datasets for {activeCollection}</h2>
              <p className="text-slate-400">{collectionDatasets.length} datasets available</p>
            </div>

            {collectionDatasets.length === 0 ? (
              <Card className="p-16 text-center">
                <EmptyState
                  icon={BarChart3}
                  title="No Datasets Yet"
                  description="Create your first evaluation dataset"
                  action={
                    <div className="flex items-center justify-center gap-4 mt-6">
                      <Button variant="primary" onClick={() => setView('create-manual')}>
                        Craft Dataset
                      </Button>
                      <Button variant="secondary" onClick={() => setView('generate-auto')}>
                        AI Generate
                      </Button>
                    </div>
                  }
                />
              </Card>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {collectionDatasets.map(dataset => (
                  <DatasetCard
                    key={dataset._id}
                    dataset={dataset}
                    onClick={() => {
                      setSelectedDataset(dataset)
                      setView('dataset-detail')
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : view === 'dataset-detail' && selectedDataset ? (
          <div className="w-full max-w-6xl">
            <Button variant="ghost" onClick={() => setView('view-datasets')} icon={ArrowLeft} className="mb-8">
              Back to Datasets
            </Button>

            <div className="space-y-6">
              <Card className="p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-white mb-3">{selectedDataset.name}</h2>
                    <div className="flex items-center gap-4 text-sm text-slate-400">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(selectedDataset.generated_at).toLocaleDateString()}</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        <span>{selectedDataset.qa_pairs?.length || 0} questions</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      variant="secondary"
                      icon={Edit3}
                      onClick={() => {
                        setEditingDataset(selectedDataset)
                        setView('edit-dataset')
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      icon={Trash2}
                      onClick={() => handleDeleteDataset(selectedDataset._id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-white">Questions Preview</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {selectedDataset.qa_pairs?.slice(0, 5).map((pair, idx) => (
                      <div key={idx} className="p-4 bg-slate-950/30 border border-white/5 rounded-lg">
                        <p className="text-sm font-medium text-blue-400 mb-1">Q{idx + 1}: {pair.question}</p>
                        <p className="text-sm text-slate-400">A: {pair.ground_truth || pair.answer}</p>
                      </div>
                    ))}
                    {selectedDataset.qa_pairs?.length > 5 && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        ... and {selectedDataset.qa_pairs.length - 5} more questions
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              <EvaluationRunner
                dataset={selectedDataset}
                assistants={assistants}
                selectedAssistants={selectedAssistants}
                onToggle={toggleAssistantSelection}
                onComplete={handleEvaluationComplete}
              />
            </div>
          </div>
        ) : view === 'create-manual' ? (
          <DatasetForm
            collectionName={activeCollection}
            type="manual"
            onSubmit={handleCreateManualDataset}
            onBack={() => setView('action-menu')}
            loading={loading}
          />
        ) : view === 'generate-auto' ? (
          <DatasetForm
            collectionName={activeCollection}
            type="auto"
            onSubmit={handleGenerateDataset}
            onBack={() => setView('action-menu')}
            loading={loading}
          />
        ) : view === 'edit-dataset' && editingDataset ? (
          <DatasetEditor
            dataset={editingDataset}
            onSave={handleUpdateDataset}
            onCancel={() => {
              setEditingDataset(null)
              setView('dataset-detail')
            }}
            loading={loading}
          />
        ) : null}
      </div>
    </div>
  )
}