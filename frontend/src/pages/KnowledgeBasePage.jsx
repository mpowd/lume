import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Loader2, Globe, Database, ExternalLink, Check, X, ChevronRight, Sparkles, FileText, Mail, FolderOpen, StickyNote, ArrowRight, Settings, Eye, Upload, ChevronLeft } from 'lucide-react'
import { knowledgeBaseAPI } from '../services/api'

const SOURCE_TYPES = [
  { 
    id: 'website', 
    label: 'Website', 
    icon: Globe, 
    description: 'Crawl web pages',
    implemented: true,
    color: 'blue'
  },
  { 
    id: 'filesystem', 
    label: 'Files', 
    icon: FolderOpen, 
    description: 'Upload documents',
    implemented: false,
    color: 'purple'
  },
  { 
    id: 'notion', 
    label: 'Notion', 
    icon: StickyNote, 
    description: 'Import workspace',
    implemented: false,
    color: 'slate'
  },
  { 
    id: 'email', 
    label: 'Email', 
    icon: Mail, 
    description: 'Connect inbox',
    implemented: false,
    color: 'green'
  }
]

export default function KnowledgeBasePage() {
  const [collections, setCollections] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeCollection, setActiveCollection] = useState(null)
  const [view, setView] = useState('menu') // 'menu', 'add', 'view', 'crawl'
  const [selectedSourceType, setSelectedSourceType] = useState(null)
  const [step, setStep] = useState(1)
  
  const [newCollection, setNewCollection] = useState({
    collection_name: '',
    source_type: 'website',
    embedding_model: 'jina/jina-embeddings-v2-base-de',
    chunk_size: 1000,
    chunk_overlap: 100,
    distance_metric: 'Cosine similarity'
  })

  const [crawlData, setCrawlData] = useState({})
  const [crawling, setCrawling] = useState({})
  const [crawlProgress, setCrawlProgress] = useState({})
  const [discoveredUrls, setDiscoveredUrls] = useState({})
  const [selectedUrls, setSelectedUrls] = useState({})
  const [crawlSessionId, setCrawlSessionId] = useState(null)

  useEffect(() => {
    if (activeCollection && !crawlData[activeCollection]) {
      setCrawlData(prev => ({
        ...prev,
        [activeCollection]: { base_url: '', depth: 2, max_pages: 50 }
      }))
    }
  }, [activeCollection])

  const eventSourceRef = useRef(null)

  useEffect(() => {
    loadCollections()
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [])

  const loadCollections = async () => {
    setLoading(true)
    try {
      const data = await knowledgeBaseAPI.getAll()
      setCollections(data.collection_names || [])
      if (data.collection_names && data.collection_names.length > 0 && !activeCollection) {
        setActiveCollection(data.collection_names[0])
      }
    } catch (error) {
      console.error('Error loading collections:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCollection = async (e) => {
    e.preventDefault()
    try {
      await knowledgeBaseAPI.create(newCollection)
      await loadCollections()
      setShowCreateModal(false)
      setActiveCollection(newCollection.collection_name)
      setView('menu')
      setNewCollection({
        collection_name: '',
        source_type: 'website',
        embedding_model: 'jina/jina-embeddings-v2-base-de',
        chunk_size: 1000,
        chunk_overlap: 100,
        distance_metric: 'Cosine similarity'
      })
    } catch (error) {
      console.error('Error creating collection:', error)
    }
  }

  const handleCrawl = async (collectionName) => {
    const crawlSettings = crawlData[collectionName]
    
    if (!crawlSettings || !crawlSettings.base_url) {
      alert('Please enter a URL')
      return
    }

    const depth = crawlSettings.depth ?? 2
    const max_pages = crawlSettings.max_pages ?? 50

    setDiscoveredUrls(prev => ({ ...prev, [collectionName]: [] }))
    setSelectedUrls(prev => ({ ...prev, [collectionName]: {} }))
    setCrawling(prev => ({ ...prev, [collectionName]: true }))
    setStep(2)

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    const params = new URLSearchParams({
      base_url: crawlSettings.base_url,
      depth: depth.toString(),
      max_pages: max_pages.toString(),
      include_external_domains: 'false'
    })

    const eventSource = new EventSource(`http://localhost:8000/crawl?${params}`)
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        
        if (data.type === 'init') {
          setCrawlSessionId(data.session_id)
          setCrawlProgress(prev => ({
            ...prev,
            [collectionName]: {
              current: 0,
              total: data.max_pages,
              status: 'Starting crawl...'
            }
          }))
        }
        
        else if (data.type === 'url') {
          setDiscoveredUrls(prev => {
            const current = prev[collectionName] || []
            return {
              ...prev,
              [collectionName]: [...current, { url: data.url, title: data.title }]
            }
          })
          
          setSelectedUrls(prev => ({
            ...prev,
            [collectionName]: {
              ...(prev[collectionName] || {}),
              [data.url]: true
            }
          }))
          
          setCrawlProgress(prev => ({
            ...prev,
            [collectionName]: {
              current: data.index + 1,
              total: data.total,
              status: `Discovered ${data.index + 1} pages...`
            }
          }))
        }
        
        else if (data.type === 'complete') {
          setCrawling(prev => ({ ...prev, [collectionName]: false }))
          setCrawlProgress(prev => ({
            ...prev,
            [collectionName]: {
              current: data.total,
              total: data.total,
              status: 'Crawl complete!'
            }
          }))
          setStep(3)
          eventSource.close()
        }
        
        else if (data.type === 'error') {
          alert('Crawl error: ' + data.message)
          setCrawling(prev => ({ ...prev, [collectionName]: false }))
          setStep(1)
          eventSource.close()
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      setCrawling(prev => ({ ...prev, [collectionName]: false }))
      setStep(1)
      eventSource.close()
    }
  }

  const handleUploadDocuments = async (collectionName) => {
    const selected = selectedUrls[collectionName] || {}
    const urlsToUpload = Object.keys(selected).filter(url => selected[url])

    if (urlsToUpload.length === 0) {
      alert('Please select at least one URL to upload')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/crawl/upload-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_name: collectionName,
          urls: urlsToUpload,
          crawl_session_id: crawlSessionId
        })
      })

      if (!response.ok) throw new Error('Upload failed')
      
      const result = await response.json()
      alert(`Successfully uploaded ${result.uploaded_count} documents`)
      
      setDiscoveredUrls(prev => ({ ...prev, [collectionName]: [] }))
      setSelectedUrls(prev => ({ ...prev, [collectionName]: {} }))
      setStep(1)
      setView('menu')
    } catch (error) {
      console.error('Error uploading documents:', error)
      alert('Error uploading documents')
    }
  }

  const handleDeleteCollection = async (collectionName) => {
    if (!confirm(`Delete "${collectionName}"? This cannot be undone.`)) {
      return
    }

    try {
      await knowledgeBaseAPI.delete(collectionName)
      setActiveCollection(null)
      setView('menu')
      await loadCollections()
    } catch (error) {
      console.error('Error deleting collection:', error)
    }
  }

  const toggleUrlSelection = (collectionName, url) => {
    setSelectedUrls(prev => ({
      ...prev,
      [collectionName]: {
        ...(prev[collectionName] || {}),
        [url]: !(prev[collectionName]?.[url])
      }
    }))
  }

  const selectAllUrls = (collectionName, select) => {
    const urls = discoveredUrls[collectionName] || []
    setSelectedUrls(prev => ({
      ...prev,
      [collectionName]: urls.reduce((acc, item) => ({ ...acc, [item.url]: select }), {})
    }))
  }

  const resetWizard = () => {
    setStep(1)
    setView('add')
    setDiscoveredUrls(prev => ({ ...prev, [activeCollection]: [] }))
    setSelectedUrls(prev => ({ ...prev, [activeCollection]: {} }))
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }
  }

  const handleCollectionClick = (collection) => {
    setActiveCollection(collection)
    setView('menu')
    setStep(1)
  }

  const handleBackToMenu = () => {
    setView('menu')
    setStep(1)
    setSelectedSourceType(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
    )
  }

  const currentCrawlData = crawlData[activeCollection] || { base_url: '', depth: 2, max_pages: 50 }
  
  if (activeCollection && !crawlData[activeCollection]) {
    setCrawlData(prev => ({
      ...prev,
      [activeCollection]: { base_url: '', depth: 2, max_pages: 50 }
    }))
  }

  const currentProgress = crawlProgress[activeCollection] || { current: 0, total: 100, status: '' }
  const progressPercent = currentProgress.total > 0 ? (currentProgress.current / currentProgress.total) * 100 : 0

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          cursor: pointer;
          width: 100%;
        }
        input[type="range"]::-webkit-slider-track {
          background: rgba(255, 255, 255, 0.1);
          height: 8px;
          border-radius: 4px;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          background: linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234));
          height: 20px;
          width: 20px;
          border-radius: 50%;
          margin-top: -6px;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
        input[type="range"]::-moz-range-track {
          background: rgba(255, 255, 255, 0.1);
          height: 8px;
          border-radius: 4px;
        }
        input[type="range"]::-moz-range-thumb {
          background: linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234));
          height: 20px;
          width: 20px;
          border-radius: 50%;
          border: none;
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.5);
        }
      `}</style>

      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Collections</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-400" />
            </button>
          </div>
          <p className="text-sm text-slate-400">Your knowledge sources</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {collections.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500 mb-4">No collections yet</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-500/40 text-blue-400 rounded-xl text-sm transition-all cursor-pointer"
              >
                Create first collection
              </button>
            </div>
          ) : (
            collections.map(collection => (
              <button
                key={collection}
                onClick={() => handleCollectionClick(collection)}
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

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto flex items-center justify-center p-8">
        {!activeCollection ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Knowledge Base</h3>
            <p className="text-slate-400">Select or create a collection to start</p>
          </div>
        ) : view === 'menu' ? (
          /* Main Menu View */
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">{activeCollection}</h1>
              </div>
              <p className="text-slate-400">What would you like to do?</p>
            </div>

            <div className="grid gap-4 mb-8">
              {/* Add Knowledge Card */}
              <button
                onClick={() => setView('add')}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-blue-500/30 rounded-2xl p-8 transition-all cursor-pointer text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-6">
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
                  <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 transition-colors self-center" />
                </div>
              </button>

              {/* View Knowledge Card */}
              <button
                onClick={() => setView('view')}
                className="group relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-purple-500/30 rounded-2xl p-8 transition-all cursor-pointer text-left"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-start gap-6">
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
                  <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-purple-400 transition-colors self-center" />
                </div>
              </button>
            </div>

            {/* Delete Collection Button */}
            <button
              onClick={() => handleDeleteCollection(activeCollection)}
              className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Collection
            </button>
          </div>
        ) : view === 'add' ? (
          /* Add Knowledge - Source Type Selection */
          <div className="w-full max-w-3xl animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors cursor-pointer group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to menu</span>
            </button>

            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">Choose Source Type</h2>
              <p className="text-slate-400">Select where to import your knowledge from</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {SOURCE_TYPES.map(type => {
                const Icon = type.icon
                return (
                  <button
                    key={type.id}
                    onClick={() => {
                      if (type.implemented) {
                        setSelectedSourceType(type.id)
                        setView('crawl')
                      }
                    }}
                    disabled={!type.implemented}
                    className={`group relative overflow-hidden p-8 rounded-2xl border transition-all text-left ${
                      type.implemented
                        ? 'bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border-white/10 hover:border-blue-500/30 cursor-pointer'
                        : 'bg-slate-900/20 border-white/5 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity ${
                      type.color === 'blue' ? 'from-blue-500/5 to-purple-500/5' :
                      type.color === 'purple' ? 'from-purple-500/5 to-pink-500/5' :
                      type.color === 'green' ? 'from-green-500/5 to-emerald-500/5' :
                      'from-slate-500/5 to-slate-600/5'
                    }`} />
                    
                    <div className="relative">
                      <div className={`p-4 rounded-2xl mb-4 inline-flex ${
                        type.implemented 
                          ? `bg-${type.color}-500/10 group-hover:bg-${type.color}-500/20`
                          : 'bg-slate-800/30'
                      } transition-all`}>
                        <Icon className={`w-8 h-8 ${
                          type.implemented ? `text-${type.color}-400` : 'text-slate-600'
                        }`} />
                      </div>
                      
                      <h3 className={`text-xl font-semibold mb-2 ${
                        type.implemented ? 'text-white group-hover:text-blue-400' : 'text-slate-600'
                      } transition-colors`}>
                        {type.label}
                      </h3>
                      
                      <p className={`text-sm mb-4 ${
                        type.implemented ? 'text-slate-400 group-hover:text-slate-300' : 'text-slate-600'
                      } transition-colors`}>
                        {type.description}
                      </p>
                      
                      {!type.implemented && (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
                          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-xs font-medium text-slate-500">Coming Soon</span>
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        ) : view === 'view' ? (
          /* View Knowledge - Database Links */
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={handleBackToMenu}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors cursor-pointer group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to menu</span>
            </button>

            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-white mb-3">View Knowledge</h2>
              <p className="text-slate-400">Access your stored data through these interfaces</p>
            </div>

            <div className="space-y-4">
              {/* Vector Database Card */}
              <a
                href={`http://localhost:6333/dashboard#/collections/${activeCollection}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-purple-500/30 rounded-2xl p-8 transition-all cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-6">
                  <div className="p-5 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl transition-all">
                    <Database className="w-10 h-10 text-purple-400" />
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
                  <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-purple-400 transition-colors" />
                </div>
              </a>

              {/* Document Database Card */}
              <a
                href={`http://localhost:8081/db/rag_chatbot/${activeCollection}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative overflow-hidden bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-blue-500/30 rounded-2xl p-8 transition-all cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex items-center gap-6">
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
                  <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 transition-colors" />
                </div>
              </a>
            </div>

            <div className="mt-8 p-6 bg-slate-900/30 border border-white/5 rounded-xl">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sparkles className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white mb-1">Pro Tip</h4>
                  <p className="text-sm text-slate-400">
                    Use the Vector DB to explore embeddings and similarity scores, or the Document Store to view the original content and metadata.
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'crawl' && step === 1 ? (
          /* Crawl Step 1: URL Input */
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
            <button
              onClick={() => setView('add')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors cursor-pointer group"
            >
              <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to sources</span>
            </button>

            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Website Crawler</h1>
              <p className="text-slate-400">Configure your web scraping settings</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-12 bg-blue-500' : s < step ? 'w-8 bg-blue-500/50' : 'w-8 bg-white/10'
                }`} />
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Globe className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">Enter Website URL</h3>
                </div>

                <div className="space-y-6">
                  <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity blur" />
                    <input
                      type="url"
                      value={currentCrawlData.base_url}
                      onChange={(e) => setCrawlData(prev => ({
                        ...prev,
                        [activeCollection]: { ...prev[activeCollection], base_url: e.target.value }
                      }))}
                      className="relative w-full px-6 py-5 bg-slate-950/80 border border-white/10 rounded-2xl text-white text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">Crawl Depth</label>
                      <span className="text-2xl font-bold text-blue-400">{currentCrawlData.depth}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="4"
                      value={currentCrawlData.depth}
                      onChange={(e) => setCrawlData(prev => ({
                        ...prev,
                        [activeCollection]: { ...prev[activeCollection], depth: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Surface</span>
                      <span>Deep</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-slate-300">Page Limit</label>
                      <span className="text-2xl font-bold text-purple-400">{currentCrawlData.max_pages}</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={currentCrawlData.max_pages}
                      onChange={(e) => setCrawlData(prev => ({
                        ...prev,
                        [activeCollection]: { ...prev[activeCollection], max_pages: parseInt(e.target.value) }
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>10 pages</span>
                      <span>500 pages</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleCrawl(activeCollection)}
                    disabled={!currentCrawlData.base_url}
                    className="w-full px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-3 font-semibold text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    Start Crawling
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : view === 'crawl' && step === 2 ? (
          /* Step 2: Real-time Progress with URL List */
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Crawling Website</h1>
              <p className="text-slate-400">Discovering and indexing pages</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-12 bg-blue-500' : s < step ? 'w-8 bg-blue-500/50' : 'w-8 bg-white/10'
                }`} />
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-white mb-2">{currentProgress.status}</h3>
                  <p className="text-slate-400">
                    {currentProgress.current} / {currentProgress.total} pages
                  </p>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="w-full bg-slate-950/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <p className="text-sm text-slate-500 text-center">{Math.round(progressPercent)}% complete</p>
                </div>

                {/* Live URL List */}
                {discoveredUrls[activeCollection]?.length > 0 && (
                  <div className="border-t border-white/10 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-slate-300">
                        Discovered URLs ({discoveredUrls[activeCollection].length})
                      </h4>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectAllUrls(activeCollection, true)}
                          className="px-2 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          All
                        </button>
                        <button
                          onClick={() => selectAllUrls(activeCollection, false)}
                          className="px-2 py-1 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded transition-all cursor-pointer"
                        >
                          None
                        </button>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto bg-slate-950/50 rounded-xl border border-white/5">
                      {discoveredUrls[activeCollection].map((item, idx) => (
                        <label 
                          key={idx} 
                          className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer group transition-all"
                        >
                          <input
                            type="checkbox"
                            checked={selectedUrls[activeCollection]?.[item.url] || false}
                            onChange={() => toggleUrlSelection(activeCollection, item.url)}
                            className="w-4 h-4 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                          />
                          <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-slate-300 group-hover:text-white truncate block transition-colors">
                              {item.url}
                            </span>
                            {item.title && (
                              <span className="text-xs text-slate-500 truncate block">
                                {item.title}
                              </span>
                            )}
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : view === 'crawl' && step === 3 ? (
          /* Step 3: Review & Upload */
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Review & Upload</h1>
              <p className="text-slate-400">Select pages to add to your knowledge base</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-12 bg-blue-500' : s < step ? 'w-8 bg-blue-500/50' : 'w-8 bg-white/10'
                }`} />
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-white">Found {discoveredUrls[activeCollection]?.length || 0} pages</h3>
                    <p className="text-sm text-slate-400 mt-1">
                      {Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length} selected
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => selectAllUrls(activeCollection, true)}
                      className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer"
                    >
                      All
                    </button>
                    <button
                      onClick={() => selectAllUrls(activeCollection, false)}
                      className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-medium rounded-lg transition-all cursor-pointer"
                    >
                      None
                    </button>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto bg-slate-950/50 rounded-xl border border-white/5 mb-6">
                  {(discoveredUrls[activeCollection] || []).map((item, idx) => (
                    <label 
                      key={idx} 
                      className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 border-b border-white/5 last:border-0 cursor-pointer group transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUrls[activeCollection]?.[item.url] || false}
                        onChange={() => toggleUrlSelection(activeCollection, item.url)}
                        className="w-4 h-4 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                      />
                      <FileText className="w-4 h-4 text-slate-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-slate-300 group-hover:text-white truncate block transition-colors">
                          {item.url}
                        </span>
                        {item.title && (
                          <span className="text-xs text-slate-500 truncate block mt-0.5">
                            {item.title}
                          </span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={resetWizard}
                    className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                  >
                    Start Over
                  </button>
                  <button
                    onClick={() => handleUploadDocuments(activeCollection)}
                    disabled={Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length === 0}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100"
                  >
                    <Database className="w-5 h-5" />
                    Upload {Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length} Pages
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">New Collection</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreateCollection} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Collection Name</label>
                <input
                  type="text"
                  value={newCollection.collection_name}
                  onChange={(e) => setNewCollection({...newCollection, collection_name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20"
                  placeholder="my-knowledge-base"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Source Type</label>
                <div className="grid grid-cols-2 gap-3">
                  {SOURCE_TYPES.map(type => {
                    const Icon = type.icon
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => type.implemented && setNewCollection({...newCollection, source_type: type.id})}
                        disabled={!type.implemented}
                        className={`p-4 rounded-xl border transition-all text-left ${
                          newCollection.source_type === type.id
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : type.implemented
                            ? 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50 cursor-pointer'
                            : 'bg-slate-800/20 border-white/5 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-5 h-5 ${
                            newCollection.source_type === type.id ? 'text-blue-400' : 'text-slate-400'
                          }`} />
                          <span className={`text-sm font-medium ${
                            newCollection.source_type === type.id ? 'text-white' : 'text-slate-300'
                          }`}>
                            {type.label}
                          </span>
                        </div>
                        {!type.implemented && (
                          <span className="text-xs text-slate-500">Coming Soon</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}