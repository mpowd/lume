import { useState, useEffect } from 'react'
import { Plus, Trash2, Loader2, Globe, Database, ExternalLink, Check, X, ChevronRight, Sparkles, FileText, Mail, FolderOpen, StickyNote, ArrowRight, Eye, Upload, ChevronLeft, Settings, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react'
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
  const [view, setView] = useState('menu')
  const [selectedSourceType, setSelectedSourceType] = useState(null)
  const [step, setStep] = useState(1)
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  
  const [newCollection, setNewCollection] = useState({
    collection_name: '',
    description: '',
    source_type: 'website',
    embedding_model: 'jina/jina-embeddings-v2-base-de',
    chunk_size: 1000,
    chunk_overlap: 100,
    distance_metric: 'Cosine similarity'
  })

  const [crawlData, setCrawlData] = useState({})
  const [crawling, setCrawling] = useState({})
  const [discoveredUrls, setDiscoveredUrls] = useState({})
  const [selectedUrls, setSelectedUrls] = useState({})
  const [searchQuery, setSearchQuery] = useState('')
  
  // Progress tracking state
  const [uploadProgress, setUploadProgress] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (activeCollection && !crawlData[activeCollection]) {
      setCrawlData(prev => ({
        ...prev,
        [activeCollection]: { base_url: '', depth: 2, max_pages: 50 }
      }))
    }
  }, [activeCollection])

  useEffect(() => {
    loadCollections()
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

  const handleCreateCollection = async () => {
    if (!newCollection.collection_name) {
      alert('Please enter a collection name')
      return
    }

    try {
      await knowledgeBaseAPI.create(newCollection)
      await loadCollections()
      setShowCreateModal(false)
      setActiveCollection(newCollection.collection_name)
      setView('menu')
      setNewCollection({
        collection_name: '',
        description: '',
        source_type: 'website',
        embedding_model: 'jina/jina-embeddings-v2-base-de',
        chunk_size: 1000,
        chunk_overlap: 100,
        distance_metric: 'Cosine similarity'
      })
      setShowAdvancedSettings(false)
    } catch (error) {
      console.error('Error creating collection:', error)
      alert('Error creating collection')
    }
  }

  const handleCrawl = async (collectionName) => {
    const crawlSettings = crawlData[collectionName]
    
    if (!crawlSettings || !crawlSettings.base_url) {
      alert('Please enter a URL')
      return
    }

    const include_external = crawlSettings.include_external ?? false

    setDiscoveredUrls(prev => ({ ...prev, [collectionName]: [] }))
    setSelectedUrls(prev => ({ ...prev, [collectionName]: {} }))
    setCrawling(prev => ({ ...prev, [collectionName]: true }))
    setStep(2)

    try {
      const params = new URLSearchParams({
        base_url: crawlSettings.base_url,
        include_external_domains: include_external.toString(),
      })

      const response = await fetch(`http://localhost:8000/website/links?${params}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch links')
      }

      const links = await response.json()
      
      const transformedLinks = links.map(link => ({
        url: link.href || link.url,
        title: link.text || link.title || 'Untitled',
        score: link.total_score || link.score || 0,
        base_domain: link.base_domain || ''
      }))

      setDiscoveredUrls(prev => ({
        ...prev,
        [collectionName]: transformedLinks
      }))
      
      setSelectedUrls(prev => ({
        ...prev,
        [collectionName]: transformedLinks.reduce((acc, link) => ({ 
          ...acc, 
          [link.url]: true 
        }), {})
      }))

      setCrawling(prev => ({ ...prev, [collectionName]: false }))
      setStep(3)
      
    } catch (error) {
      console.error('Error fetching links:', error)
      alert('Error fetching links: ' + error.message)
      setCrawling(prev => ({ ...prev, [collectionName]: false }))
      setStep(1)
    }
  }

  const handleUploadDocuments = async (collectionName) => {
    const selected = selectedUrls[collectionName] || {}
    const urlsToUpload = Object.keys(selected).filter(url => selected[url])

    if (urlsToUpload.length === 0) {
      alert('Please select at least one URL to upload')
      return
    }

    setIsUploading(true)
    setUploadProgress({
      status: 'starting',
      message: 'Initializing upload...',
      current: 0,
      total: urlsToUpload.length,
      processed: [],
      failed: []
    })

    try {
      // Use EventSource for Server-Sent Events
      const eventSource = new EventSource(
        `http://localhost:8000/website/upload-documents-stream?collection_name=${encodeURIComponent(collectionName)}&urls=${encodeURIComponent(JSON.stringify(urlsToUpload))}`
      )

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.status === 'complete') {
          setUploadProgress({
            status: 'complete',
            message: 'Upload complete!',
            current: data.total_processed,
            total: data.total_processed,
            processed: data.processed_urls,
            failed: data.failed_urls,
            total_chunks: data.total_chunks
          })
          eventSource.close()
          
          setTimeout(() => {
            setIsUploading(false)
            setDiscoveredUrls(prev => ({ ...prev, [collectionName]: [] }))
            setSelectedUrls(prev => ({ ...prev, [collectionName]: {} }))
            setStep(1)
            setView('menu')
          }, 3000)
        } else if (data.status === 'error') {
          setUploadProgress({
            status: 'error',
            message: data.message || 'An error occurred',
            current: data.current || 0,
            total: urlsToUpload.length,
            processed: data.processed || [],
            failed: data.failed || []
          })
          eventSource.close()
        } else {
          setUploadProgress({
            status: data.status,
            message: data.message,
            current: data.current,
            total: data.total,
            processed: data.processed || [],
            failed: data.failed || [],
            current_url: data.current_url
          })
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        eventSource.close()
        setUploadProgress({
          status: 'error',
          message: 'Connection error. Please try again.',
          current: 0,
          total: urlsToUpload.length,
          processed: [],
          failed: []
        })
        
        setTimeout(() => {
          setIsUploading(false)
        }, 3000)
      }

    } catch (error) {
      console.error('Error uploading documents:', error)
      setUploadProgress({
        status: 'error',
        message: error.message || 'Upload failed',
        current: 0,
        total: urlsToUpload.length,
        processed: [],
        failed: []
      })
      
      setTimeout(() => {
        setIsUploading(false)
      }, 3000)
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
    setSearchQuery('')
    setDiscoveredUrls(prev => ({ ...prev, [activeCollection]: [] }))
    setSelectedUrls(prev => ({ ...prev, [activeCollection]: {} }))
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

  const filteredUrls = (discoveredUrls[activeCollection] || []).filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.url?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.base_domain?.toLowerCase().includes(query)
    )
  })

  return (
    <div className="min-h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
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
        
        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234));
          border-radius: 4px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, rgb(79, 150, 255), rgb(167, 71, 254));
        }
        
        @keyframes progress-shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        .progress-shimmer {
          position: relative;
          overflow: hidden;
        }
        
        .progress-shimmer::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: progress-shimmer 2s infinite;
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
      <div className="flex-1 overflow-y-auto flex items-start justify-center p-8 pt-12">
        {!activeCollection ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Knowledge Base</h3>
            <p className="text-slate-400">Select or create a collection to start</p>
          </div>
        ) : view === 'menu' ? (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">{activeCollection}</h1>
              </div>
              <p className="text-slate-400">What would you like to do?</p>
            </div>

            <div className="grid gap-4 mb-8">
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

            <button
              onClick={() => handleDeleteCollection(activeCollection)}
              className="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/30 text-red-400 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Delete Collection
            </button>
          </div>
        ) : view === 'add' ? (
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

              <a
                href={`http://localhost:8081/db/lume/${activeCollection}`}
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
              <p className="text-slate-400">Enter a URL to discover links</p>
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
                  <h3 className="text-xl font-semibold text-white">Crawl Settings</h3>
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

                  <label className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-xl cursor-pointer hover:bg-slate-950/50 transition-colors">
                    <input
                      type="checkbox"
                      checked={currentCrawlData.include_external ?? false}
                      onChange={(e) => setCrawlData(prev => ({
                        ...prev,
                        [activeCollection]: { ...prev[activeCollection], include_external: e.target.checked }
                      }))}
                      className="w-5 h-5 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white">Include External Links</div>
                      <div className="text-xs text-slate-400">Also discover links from other domains</div>
                    </div>
                  </label>
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
        ) : view === 'crawl' && step === 2 ? (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Discovering Links</h1>
              <p className="text-slate-400">Analyzing website structure</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-12 bg-blue-500' : s < step ? 'w-8 bg-blue-500/50' : 'w-8 bg-white/10'
                }`} />
              ))}
            </div>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-12 backdrop-blur-xl">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse" />
                  <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                  </div>
                </div>
                
                <h3 className="text-xl font-semibold text-white mb-2">Fetching Links...</h3>
                <p className="text-slate-400">
                  This may take a few moments
                </p>
              </div>
            </div>
          </div>
        ) : view === 'crawl' && step === 3 ? (
          <div className="w-full max-w-5xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Review & Select Links</h1>
              <p className="text-slate-400">Choose which pages to add to your knowledge base</p>
            </div>

            <div className="flex items-center justify-center gap-2 mb-8">
              {[1, 2, 3].map(s => (
                <div key={s} className={`h-1.5 rounded-full transition-all ${
                  s === step ? 'w-12 bg-blue-500' : s < step ? 'w-8 bg-blue-500/50' : 'w-8 bg-white/10'
                }`} />
              ))}
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-6">
                    <div>
                      <div className="text-3xl font-bold text-white">
                        {discoveredUrls[activeCollection]?.length || 0}
                      </div>
                      <div className="text-sm text-slate-400">Total Links</div>
                    </div>
                    <div className="h-12 w-px bg-white/10" />
                    <div>
                      <div className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                        {Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length}
                      </div>
                      <div className="text-sm text-slate-400">Selected</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => selectAllUrls(activeCollection, true)}
                      className="px-4 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 text-blue-400 rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Select All
                    </button>
                    <button
                      onClick={() => selectAllUrls(activeCollection, false)}
                      className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all cursor-pointer flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search links by URL, title, or domain..."
                    className="w-full pl-12 pr-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-all"
                    >
                      <X className="w-4 h-4 text-slate-400" />
                    </button>
                  )}
                </div>

                {searchQuery && (
                  <p className="text-sm text-slate-400 mt-2">
                    Showing {filteredUrls.length} of {discoveredUrls[activeCollection]?.length || 0} links
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
                {filteredUrls.length === 0 ? (
                  <div className="text-center py-12">
                    <Globe className="w-12 h-12 text-slate-700 mx-auto mb-3" />
                    <p className="text-slate-400">
                      {searchQuery ? 'No links match your search' : 'No links discovered'}
                    </p>
                  </div>
                ) : (
                  filteredUrls.map((item, idx) => {
                    const isSelected = selectedUrls[activeCollection]?.[item.url] || false
                    return (
                      <div
                        key={idx}
                        className={`group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 border rounded-2xl p-5 transition-all ${
                          isSelected 
                            ? 'border-blue-500/40 bg-blue-500/5' 
                            : 'border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="pt-1">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleUrlSelection(activeCollection, item.url)}
                              className="w-5 h-5 rounded-lg border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all"
                            />
                          </div>

                          <div className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                            isSelected ? 'bg-blue-500/20' : 'bg-slate-800/50 group-hover:bg-slate-800'
                          }`}>
                            <Globe className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <h4 className={`font-semibold transition-colors ${
                                isSelected ? 'text-white' : 'text-slate-300 group-hover:text-white'
                              }`}>
                                {item.title || 'Untitled Page'}
                              </h4>
                              {item.score !== undefined && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-lg flex-shrink-0">
                                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                  <span className="text-xs font-semibold text-purple-300">
                                    {(item.score * 100).toFixed(0)}%
                                  </span>
                                </div>
                              )}
                            </div>

                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="group/link flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-3"
                            >
                              <span className="truncate font-mono">{item.url}</span>
                              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                            </a>

                            {item.base_domain && (
                              <div className="flex items-center gap-2 text-xs">
                                <div className="px-2 py-1 bg-slate-800/50 rounded-md">
                                  <span className="text-slate-400">{item.base_domain}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                              isSelected 
                                ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' 
                                : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                            title="Open in new tab"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>

                        {isSelected && (
                          <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 rounded-l-2xl" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetWizard}
                  className="flex-1 px-6 py-4 bg-slate-800/50 hover:bg-slate-800 border border-white/10 hover:border-white/20 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 font-medium"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Start Over
                </button>
                <button
                  onClick={() => handleUploadDocuments(activeCollection)}
                  disabled={Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length === 0}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-600 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold text-lg disabled:cursor-not-allowed cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:hover:scale-100 shadow-lg shadow-green-600/25"
                >
                  <Database className="w-5 h-5" />
                  Add {Object.values(selectedUrls[activeCollection] || {}).filter(Boolean).length} Links
                </button>
              </div>

              <div className="bg-gradient-to-br from-blue-500/5 to-purple-500/5 border border-blue-500/20 rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Sparkles className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white mb-1">Smart Link Discovery</h4>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Links are automatically scored based on relevance and quality. Click any link to preview it in your browser before adding to your knowledge base.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-white/10 flex items-center justify-between sticky top-0 bg-slate-900 z-10">
              <h2 className="text-xl font-semibold text-white">New Collection</h2>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setShowAdvancedSettings(false)
                }}
                className="p-2 hover:bg-white/5 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Collection Name *</label>
                <input
                  type="text"
                  value={newCollection.collection_name}
                  onChange={(e) => setNewCollection({...newCollection, collection_name: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20"
                  placeholder="my-knowledge-base"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                <textarea
                  value={newCollection.description}
                  onChange={(e) => setNewCollection({...newCollection, description: e.target.value})}
                  className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20 resize-none"
                  placeholder="Describe what this collection contains..."
                  rows={3}
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

              {/* Advanced Settings Accordion */}
              <div className="border-t border-white/10 pt-5">
                <button
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="w-full flex items-center justify-between p-4 bg-slate-800/30 hover:bg-slate-800/50 rounded-xl transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-5 h-5 text-slate-400" />
                    <span className="text-sm font-medium text-white">Advanced Settings</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`} />
                </button>

                {showAdvancedSettings && (
                  <div className="mt-4 space-y-4 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Embedding Model</label>
                      <select
                        value={newCollection.embedding_model}
                        onChange={(e) => setNewCollection({...newCollection, embedding_model: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20 cursor-pointer"
                      >
                        <option value="jina/jina-embeddings-v2-base-de">Jina Embeddings v2 Base (768d)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Chunk Size: {newCollection.chunk_size} characters
                      </label>
                      <input
                        type="range"
                        min="500"
                        max="2000"
                        step="100"
                        value={newCollection.chunk_size}
                        onChange={(e) => setNewCollection({...newCollection, chunk_size: parseInt(e.target.value)})}
                        className="w-full cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>500</span>
                        <span>2000</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Chunk Overlap: {newCollection.chunk_overlap} characters
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="50"
                        value={newCollection.chunk_overlap}
                        onChange={(e) => setNewCollection({...newCollection, chunk_overlap: parseInt(e.target.value)})}
                        className="w-full cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-500 mt-1">
                        <span>0</span>
                        <span>500</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Distance Metric</label>
                      <select
                        value={newCollection.distance_metric}
                        onChange={(e) => setNewCollection({...newCollection, distance_metric: e.target.value})}
                        className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all hover:border-white/20 cursor-pointer"
                      >
                        <option value="Cosine similarity">Cosine Similarity</option>
                        <option value="Dot product">Dot Product</option>
                        <option value="Euclidean distance">Euclidean Distance</option>
                        <option value="Manhattan distance">Manhattan Distance</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setShowAdvancedSettings(false)
                  }}
                  className="flex-1 px-6 py-3 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateCollection}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Check className="w-4 h-4" />
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Progress Modal */}
      {isUploading && uploadProgress && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-in fade-in duration-200">
          <div className="bg-gradient-to-br from-slate-900 to-slate-900/95 border border-white/10 rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="p-8">
              <div className="text-center mb-8">
                {uploadProgress.status === 'complete' ? (
                  <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                ) : uploadProgress.status === 'error' ? (
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-400" />
                  </div>
                ) : (
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse" />
                    <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
                    </div>
                  </div>
                )}

                <h2 className="text-2xl font-bold text-white mb-2">
                  {uploadProgress.status === 'complete' ? 'Upload Complete!' :
                   uploadProgress.status === 'error' ? 'Upload Failed' :
                   'Processing Documents'}
                </h2>
                <p className="text-slate-400">{uploadProgress.message}</p>
              </div>

              {/* Progress Bar */}
              {uploadProgress.status !== 'error' && (
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>Progress</span>
                    <span>{uploadProgress.current} / {uploadProgress.total}</span>
                  </div>
                  <div className="h-3 bg-slate-800 rounded-full overflow-hidden progress-shimmer">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  {uploadProgress.total > 0 && (
                    <div className="text-center mt-2 text-sm font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}% Complete
                    </div>
                  )}
                </div>
              )}

              {/* Current URL */}
              {uploadProgress.current_url && uploadProgress.status !== 'complete' && (
                <div className="mb-6 p-4 bg-slate-800/50 rounded-xl">
                  <div className="text-xs text-slate-500 mb-1">Currently processing:</div>
                  <div className="text-sm text-slate-300 font-mono truncate">{uploadProgress.current_url}</div>
                </div>
              )}

              {/* Stats Grid */}
              {uploadProgress.status === 'complete' && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-center">
                    <div className="text-2xl font-bold text-green-400">{uploadProgress.processed.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Processed</div>
                  </div>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-400">{uploadProgress.total_chunks || 0}</div>
                    <div className="text-xs text-slate-400 mt-1">Chunks</div>
                  </div>
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-center">
                    <div className="text-2xl font-bold text-red-400">{uploadProgress.failed.length}</div>
                    <div className="text-xs text-slate-400 mt-1">Failed</div>
                  </div>
                </div>
              )}

              {/* Failed URLs */}
              {uploadProgress.failed && uploadProgress.failed.length > 0 && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-sm font-semibold text-red-400">Failed URLs ({uploadProgress.failed.length})</span>
                  </div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uploadProgress.failed.map((failedItem, idx) => (
                      <div key={idx} className="text-xs text-slate-400 font-mono truncate">
                        • {failedItem.url || failedItem}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Close Button */}
              {(uploadProgress.status === 'complete' || uploadProgress.status === 'error') && (
                <button
                  onClick={() => {
                    setIsUploading(false)
                    if (uploadProgress.status === 'complete') {
                      setDiscoveredUrls(prev => ({ ...prev, [activeCollection]: [] }))
                      setSelectedUrls(prev => ({ ...prev, [activeCollection]: {} }))
                      setStep(1)
                      setView('menu')
                    }
                  }}
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-medium cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}