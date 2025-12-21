import { useState } from 'react'
import { Sparkles, Upload, Eye, Trash2, ChevronLeft, ExternalLink, FileText, Database as DatabaseIcon, Plus } from 'lucide-react'
import { useCollections } from '../hooks/useCollections'
import CollectionSidebar from '../components/knowledge/CollectionSidebar'
import CollectionForm from '../components/knowledge/CollectionForm'
import SourceTypeSelector from '../components/knowledge/SourceTypeSelector'
import CrawlWizard from '../components/knowledge/CrawlWizard'
import FileWizard from '../components/knowledge/FileWizard' 
import WatchWebsiteKnowledge from '../components/knowledge/WatchWebsiteKnowledge'
import Button from '../components/shared/Button'
import Card from '../components/shared/Card'
import EmptyState from '../components/shared/EmptyState'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import ConfirmDialog from '../components/shared/ConfirmDialog'

export default function KnowledgeBasePage() {
  const { collections, loading, error, createCollection, deleteCollection, reload } = useCollections()
  const [activeCollection, setActiveCollection] = useState(null)
  const [view, setView] = useState('menu') // 'menu', 'add', 'view', 'crawl', 'watch'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSourceType, setSelectedSourceType] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    collectionName: ''
  })

  const handleCreateCollection = async (formData) => {
    setSaving(true)
    setFormError(null)
    
    const result = await createCollection(formData)
    setSaving(false)

    if (result.success) {
      setShowCreateModal(false)
      setActiveCollection(formData.collection_name)
      setView('menu')
      reload()
    } else {
      setFormError(result.error)
    }
  }

  const handleSelectCollection = (collection) => {
    setActiveCollection(collection)
    setView('menu')
  }

  const handleDeleteCollection = (collectionName) => {
    setConfirmDialog({
      isOpen: true,
      collectionName: collectionName
    })
  }

  const confirmDelete = async () => {
    if (confirmDialog.collectionName) {
      const result = await deleteCollection(confirmDialog.collectionName)
      if (result.success) {
        setActiveCollection(null)
        setView('menu')
      }
    }
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      collectionName: ''
    })
  }

  const handleBackToMenu = () => {
    setView('menu')
    setSelectedSourceType(null)
  }

  const handleSelectSourceType = (type) => {
    setSelectedSourceType(type)
    setView(type)
  }

  const handleCrawlComplete = () => {
    setView('menu')
    setSelectedSourceType(null)
  }

  const handleFileWizardComplete = () => {
    setView('menu')
    setSelectedSourceType(null)
  }

  const handleAddKnowledge = (collection) => {
    setActiveCollection(collection)
    setView('add')
  }

  const handleViewKnowledge = (collection) => {
    setActiveCollection(collection)
    setView('view')
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading collections..." />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <ErrorAlert message={error} onClose={() => {}} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {formError && <ErrorAlert message={formError} onClose={() => setFormError(null)} className="mb-6" />}

        {view === 'menu' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              className="group relative overflow-hidden bg-transparent border-2 border-dashed border-border-default hover:border-border-brand-hover rounded-2xl p-8 transition-all duration-300 hover:bg-background-elevated min-h-[200px] flex flex-col items-center justify-center"
            >
              <div className="mb-4 p-4 rounded-2xl bg-transparent border border-border-brand">
                <Plus className="w-8 h-8 text-brand-teal" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Create Collection</h3>
              <p className="text-sm text-text-tertiary text-center">
                Add a new knowledge collection to your workspace
              </p>
            </button>

            {collections.map((collection) => (
              <div 
                key={collection} 
                className="bg-background-elevated border border-border-default rounded-2xl p-6 hover:border-border-brand transition-all duration-300 min-h-[200px] flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-transparent border border-border-default">
                      <DatabaseIcon className="w-5 h-5 text-brand-teal" />
                    </div>
                    <h3 className="font-semibold text-text-primary">{collection}</h3>
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => handleAddKnowledge(collection)} 
                    className="flex-1 px-3 py-2 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                  <button 
                    onClick={() => handleViewKnowledge(collection)} 
                    className="flex-1 px-3 py-2 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={() => handleDeleteCollection(collection)}
                    className="flex-1 px-3 py-2 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-start">
            <Button variant="ghost" onClick={handleBackToMenu} icon={ChevronLeft} className="mb-8">
              Back to collections
            </Button>
            
            {!activeCollection ? (
              <EmptyState
                icon={Sparkles}
                title="Knowledge Base"
                description="Select or create a collection to start"
              />
            ) : view === 'add' ? (
              <div className="w-full">
                <SourceTypeSelector onSelect={handleSelectSourceType} />
              </div>
            ) : view === 'view' ? (
              <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="text-center mb-12">
                  <h2 className="text-3xl font-bold text-white mb-3">View Knowledge</h2>
                  <p className="text-text-tertiary">Access your stored data through these interfaces</p>
                </div>

                <div className="space-y-4">
                  <a
                    href={`http://localhost:6333/dashboard#/collections/${activeCollection}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="p-8" hover>
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-transparent border border-white/20 rounded-2xl transition-all group-hover:border-brand-teal/50">
                          <DatabaseIcon className="w-10 h-10 text-text-secondary group-hover:text-brand-teal transition-colors" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-white mb-2 transition-colors">
                            Qdrant Vector Database
                          </h3>
                          <p className="text-text-tertiary transition-colors mb-3">
                            Browse and search through vector embeddings
                          </p>
                          <div className="flex items-center gap-2 text-sm text-text-quaternary group-hover:text-brand-teal transition-colors">
                            <span className="font-mono">localhost:6333</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </a>

                  <a
                    href={`http://localhost:8081/db/lume/${activeCollection}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Card className="p-8" hover>
                      <div className="flex items-center gap-6">
                        <div className="p-5 bg-transparent border border-white/20 rounded-2xl transition-all group-hover:border-brand-teal/50">
                          <FileText className="w-10 h-10 text-text-secondary group-hover:text-brand-teal transition-colors" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-2xl font-semibold text-white mb-2 transition-colors">
                            MongoDB Document Store
                          </h3>
                          <p className="text-text-tertiary transition-colors mb-3">
                            View original documents and metadata
                          </p>
                          <div className="flex items-center gap-2 text-sm text-text-quaternary group-hover:text-brand-teal transition-colors">
                            <span className="font-mono">localhost:8081</span>
                            <ExternalLink className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </a>
                  
                  <Button 
                    onClick={() => setView('watch')}
                    className="w-full py-6 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary text-lg rounded-xl transition-colors flex items-center justify-center gap-3"
                  >
                    <Eye className="w-5 h-5" />
                    Watch Website Knowledge
                  </Button>
                </div>
              </div>
            ) : view === 'website' ? (
              <CrawlWizard
                collectionName={activeCollection}
                onBack={() => setView('add')}
                onComplete={handleCrawlComplete}
              />
            ) : view === 'filesystem' ? (
              <FileWizard
                collectionName={activeCollection}
                onBack={() => setView('add')}
                onComplete={handleCrawlComplete}
              />
            ) : view === 'watch' ? (
              <WatchWebsiteKnowledge
                collectionName={activeCollection}
                onBack={() => setView('view')}
              />
            ) : null}
          </div>
        )}
      </div>

      <CollectionForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCollection}
        loading={saving}
        error={formError}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDelete}
        title="Delete Collection"
        message={`Are you sure you want to delete "${confirmDialog.collectionName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}