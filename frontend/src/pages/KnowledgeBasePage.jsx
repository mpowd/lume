import { useState } from 'react'
import { Sparkles, Upload, Eye, Trash2, ChevronLeft, ExternalLink, FileText, Database as DatabaseIcon } from 'lucide-react'
import { useCollections } from '../hooks/useCollections'
import CollectionSidebar from '../components/knowledge/CollectionSidebar'
import CollectionForm from '../components/knowledge/CollectionForm'
import SourceTypeSelector from '../components/knowledge/SourceTypeSelector'
import CrawlWizard from '../components/knowledge/CrawlWizard'
import Button from '../components/shared/Button'
import Card from '../components/shared/Card'
import EmptyState from '../components/shared/EmptyState'

export default function KnowledgeBasePage() {
  const { collections, loading, createCollection, deleteCollection, reload } = useCollections()
  const [activeCollection, setActiveCollection] = useState(null)
  const [view, setView] = useState('menu') // 'menu', 'add', 'view', 'crawl'
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSourceType, setSelectedSourceType] = useState(null)

  const handleCreateCollection = async (formData) => {
    const result = await createCollection(formData)
    if (result.success) {
      setShowCreateModal(false)
      setActiveCollection(formData.collection_name)
      setView('menu')
      reload()
    }
  }

  const handleSelectCollection = (collection) => {
    setActiveCollection(collection)
    setView('menu')
  }

  const handleDeleteCollection = async () => {
    if (!confirm(`Delete "${activeCollection}"? This cannot be undone.`)) return
    
    const result = await deleteCollection(activeCollection)
    if (result.success) {
      setActiveCollection(null)
      setView('menu')
    }
  }

  const handleBackToMenu = () => {
    setView('menu')
    setSelectedSourceType(null)
  }

  const handleSelectSourceType = (type) => {
    setSelectedSourceType(type)
    setView('crawl')
  }

  const handleCrawlComplete = () => {
    setView('menu')
    setSelectedSourceType(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-slate-400">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <CollectionSidebar
        collections={collections}
        activeCollection={activeCollection}
        onSelect={handleSelectCollection}
        onCreate={() => setShowCreateModal(true)}
        onRefresh={reload}
      />

      <div className="flex-1 overflow-y-auto flex items-start justify-center p-8 pt-12">
        {!activeCollection ? (
          <EmptyState
            icon={Sparkles}
            title="Knowledge Base"
            description="Select or create a collection to start"
          />
        ) : view === 'menu' ? (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full mb-4">
                <DatabaseIcon className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">{activeCollection}</h1>
              </div>
              <p className="text-slate-400">What would you like to do?</p>
            </div>

            <div className="grid gap-4 mb-8">
              <Card onClick={() => setView('add')} className="p-8" hover>
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl transition-all">
                    <Upload className="w-8 h-8 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      Add Knowledge
                    </h3>
                    <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                      Import content from websites, files, or other sources
                    </p>
                  </div>
                </div>
              </Card>

              <Card onClick={() => setView('view')} className="p-8" hover>
                <div className="flex items-start gap-6">
                  <div className="p-4 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl transition-all">
                    <Eye className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      View Knowledge
                    </h3>
                    <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                      Browse and manage your stored documents and vectors
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            <Button
              variant="danger"
              onClick={handleDeleteCollection}
              icon={Trash2}
              fullWidth
            >
              Delete Collection
            </Button>
          </div>
        ) : view === 'add' ? (
          <div className="w-full">
            <Button variant="ghost" onClick={handleBackToMenu} icon={ChevronLeft} className="mb-8">
              Back to menu
            </Button>
            <SourceTypeSelector onSelect={handleSelectSourceType} />
          </div>
        ) : view === 'view' ? (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <Button variant="ghost" onClick={handleBackToMenu} icon={ChevronLeft} className="mb-8">
              Back to menu
            </Button>

            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">View Knowledge</h2>
              <p className="text-slate-400">Access your stored data through these interfaces</p>
            </div>

            <div className="space-y-4">
              <a
                href={`http://localhost:6333/dashboard#/collections/${activeCollection}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="p-8" hover>
                  <div className="flex items-center gap-6">
                    <div className="p-5 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl transition-all">
                      <DatabaseIcon className="w-10 h-10 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                        Qdrant Vector Database
                      </h3>
                      <p className="text-slate-400 group-hover:text-slate-300 transition-colors mb-3">
                        Browse and search through vector embeddings
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-purple-400 transition-colors">
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
                    <div className="p-5 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl transition-all">
                      <FileText className="w-10 h-10 text-blue-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                        MongoDB Document Store
                      </h3>
                      <p className="text-slate-400 group-hover:text-slate-300 transition-colors mb-3">
                        View original documents and metadata
                      </p>
                      <div className="flex items-center gap-2 text-sm text-slate-500 group-hover:text-blue-400 transition-colors">
                        <span className="font-mono">localhost:8081</span>
                        <ExternalLink className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </Card>
              </a>
            </div>
          </div>
        ) : view === 'crawl' && selectedSourceType === 'website' ? (
          <CrawlWizard
            collectionName={activeCollection}
            onBack={() => setView('add')}
            onComplete={handleCrawlComplete}
          />
        ) : null}
      </div>

      <CollectionForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCollection}
        loading={false}
      />
    </div>
  )
}