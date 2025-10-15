import { useState, useEffect } from 'react'
import { Plus, Loader2, BarChart3, FileText, PlayCircle, Trash2, RefreshCw, Edit3, Check, Zap, ChevronRight, Brain, Beaker, Database, ArrowLeft, Calendar, Hash } from 'lucide-react'
import { evaluationAPI, knowledgeBaseAPI, chatbotsAPI, chatAPI } from '../../services/api'

export default function EvaluationPage() {
  const [activeView, setActiveView] = useState('select-collection')
  const [selectedCollection, setSelectedCollection] = useState(null)
  const [loading, setLoading] = useState(false)
  
  const [collections, setCollections] = useState([])
  const [chatbots, setChatbots] = useState([])
  const [datasets, setDatasets] = useState([])
  
  const [datasetName, setDatasetName] = useState('')
  const [qaPairs, setQaPairs] = useState([{ question: '', ground_truth: '', source_doc: '' }])
  
  const [autoGenConfig, setAutoGenConfig] = useState({
    dataset_name: '',
    testset_size: 10
  })
  
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedChatbots, setSelectedChatbots] = useState([])
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)
  const [editingDataset, setEditingDataset] = useState(null)

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [collectionsData, chatbotsData, datasetsData] = await Promise.all([
        knowledgeBaseAPI.getAll(),
        chatbotsAPI.getAll(),
        evaluationAPI.getDatasets()
      ])
      setCollections(collectionsData.collection_names || [])
      setChatbots(chatbotsData)
      setDatasets(datasetsData.datasets || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleCreateManualDataset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const validPairs = qaPairs.filter(pair => 
        pair.question.trim() && pair.ground_truth.trim()
      )
      
      if (validPairs.length === 0) {
        alert('Please add at least one question-answer pair')
        return
      }

      await evaluationAPI.createDataset({
        dataset_name: datasetName,
        qa_pairs: validPairs,
        source_collection: selectedCollection
      })
      alert('Dataset created successfully!')
      setDatasetName('')
      setQaPairs([{ question: '', ground_truth: '', source_doc: '' }])
      await loadInitialData()
      setActiveView('action-menu')
    } catch (error) {
      console.error('Error creating dataset:', error)
      alert('Error creating dataset')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateDataset = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await evaluationAPI.generateDataset(
        selectedCollection,
        autoGenConfig.dataset_name,
        autoGenConfig.testset_size
      )
      alert('Dataset generated successfully!')
      setAutoGenConfig({ dataset_name: '', testset_size: 10 })
      await loadInitialData()
      setActiveView('action-menu')
    } catch (error) {
      console.error('Error generating dataset:', error)
      alert('Error generating dataset')
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateChatbots = async () => {
    if (!selectedDataset || selectedChatbots.length === 0) {
      alert('Please select at least one chatbot')
      return
    }

    setEvaluating(true)
    setEvalProgress(0)

    try {
      const qaPairs = selectedDataset.qa_pairs
      const totalEvals = selectedChatbots.length
      
      for (let chatbotIdx = 0; chatbotIdx < selectedChatbots.length; chatbotIdx++) {
        const chatbotId = selectedChatbots[chatbotIdx]
        const questions = []
        const groundTruths = []
        const answers = []
        const contexts = []

        for (let i = 0; i < qaPairs.length; i++) {
          const pair = qaPairs[i]
          const progress = ((chatbotIdx / totalEvals) + ((i / qaPairs.length) / totalEvals)) * 100
          setEvalProgress(Math.round(progress * 0.8))

          try {
            const response = await chatAPI.sendMessage(chatbotId, pair.question, [])
            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push(response.response || '')
            contexts.push(response.contexts || [])
          } catch (error) {
            console.error(`Error processing question ${i + 1}:`, error)
            questions.push(pair.question)
            groundTruths.push(pair.ground_truth || pair.answer)
            answers.push('')
            contexts.push([])
          }
        }

        setEvalProgress(Math.round(((chatbotIdx + 0.9) / totalEvals) * 80))

        await evaluationAPI.evaluateChatbot(
          selectedDataset.name,
          chatbotId,
          questions,
          groundTruths,
          answers,
          contexts
        )
      }

      setEvalProgress(100)
      alert(`Successfully evaluated ${selectedChatbots.length} chatbot(s)!`)
      setActiveView('view-datasets')
      setSelectedDataset(null)
      setSelectedChatbots([])
      
    } catch (error) {
      console.error('Error during evaluation:', error)
      alert('Error during evaluation')
    } finally {
      setEvaluating(false)
      setEvalProgress(0)
    }
  }

  const handleDeleteDataset = async (datasetId) => {
    if (!confirm('Delete this dataset? This cannot be undone.')) return
    
    try {
      await evaluationAPI.deleteDataset(datasetId)
      await loadInitialData()
      setSelectedDataset(null)
      alert('Dataset deleted successfully')
      setActiveView('view-datasets')
    } catch (error) {
      console.error('Error deleting dataset:', error)
      alert('Error deleting dataset')
    }
  }

  const handleUpdateDataset = async (e) => {
    e.preventDefault()
    if (!editingDataset) return
    
    setLoading(true)
    try {
      await evaluationAPI.updateDataset(editingDataset._id, { qa_pairs: editingDataset.qa_pairs })
      alert('Dataset updated successfully!')
      await loadInitialData()
      const updatedDataset = datasets.find(d => d._id === editingDataset._id)
      setSelectedDataset(updatedDataset || editingDataset)
      setEditingDataset(null)
      setActiveView('dataset-detail')
    } catch (error) {
      console.error('Error updating dataset:', error)
      alert('Error updating dataset')
    } finally {
      setLoading(false)
    }
  }

  const addQaPair = () => {
    setQaPairs([...qaPairs, { question: '', ground_truth: '', source_doc: '' }])
  }

  const updateQaPair = (index, field, value) => {
    const updated = [...qaPairs]
    updated[index][field] = value
    setQaPairs(updated)
  }

  const removeQaPair = (index) => {
    if (qaPairs.length > 1) {
      setQaPairs(qaPairs.filter((_, i) => i !== index))
    }
  }

  const updateEditingQaPair = (index, field, value) => {
    const updated = [...editingDataset.qa_pairs]
    updated[index][field] = value
    setEditingDataset({ ...editingDataset, qa_pairs: updated })
  }

  const addEditingQaPair = () => {
    setEditingDataset({
      ...editingDataset,
      qa_pairs: [...editingDataset.qa_pairs, { question: '', ground_truth: '', source_doc: '' }]
    })
  }

  const removeEditingQaPair = (index) => {
    if (editingDataset.qa_pairs.length > 1) {
      setEditingDataset({
        ...editingDataset,
        qa_pairs: editingDataset.qa_pairs.filter((_, i) => i !== index)
      })
    }
  }

  const toggleChatbotSelection = (chatbotId) => {
    setSelectedChatbots(prev =>
      prev.includes(chatbotId)
        ? prev.filter(id => id !== chatbotId)
        : [...prev, chatbotId]
    )
  }

  const collectionDatasets = datasets.filter(d => d.source_collection === selectedCollection)

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        input[type="text"], input[type="url"], input[type="number"], textarea {
          cursor: text !important;
        }
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          width: 100%;
          cursor: grab !important;
        }
        input[type="range"]:active {
          cursor: grabbing !important;
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
          cursor: grab;
        }
        input[type="range"]::-webkit-slider-thumb:active {
          cursor: grabbing;
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
          cursor: grab;
        }
        input[type="range"]::-moz-range-thumb:active {
          cursor: grabbing;
        }
      `}</style>

      {/* Sidebar */}
      <div className="w-80 border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Collections</h2>
            <button
              onClick={loadInitialData}
              className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/30 rounded-xl transition-all cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-blue-400" />
            </button>
          </div>
          <p className="text-sm text-slate-400">Select a collection to evaluate</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {collections.length === 0 ? (
            <div className="text-center py-12 px-4">
              <Database className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">No collections available</p>
            </div>
          ) : (
            collections.map(collection => (
              <button
                key={collection}
                onClick={() => {
                  setSelectedCollection(collection)
                  setActiveView('action-menu')
                }}
                className={`w-full text-left p-4 rounded-xl transition-all group cursor-pointer ${
                  selectedCollection === collection
                    ? 'bg-blue-500/10 border border-blue-500/30'
                    : 'bg-slate-900/30 border border-white/5 hover:border-white/10 hover:bg-slate-900/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-all ${
                    selectedCollection === collection ? 'bg-blue-500/20' : 'bg-slate-800/50 group-hover:bg-slate-800'
                  }`}>
                    <Database className={`w-4 h-4 ${selectedCollection === collection ? 'text-blue-400' : 'text-slate-400'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium truncate ${selectedCollection === collection ? 'text-white' : 'text-slate-300'}`}>
                      {collection}
                    </p>
                  </div>
                  {selectedCollection === collection && (
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
        {!selectedCollection ? (
          <div className="text-center max-w-md">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-blue-400" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-3">Evaluation Lab</h3>
            <p className="text-slate-400">Select a collection to start evaluating your AI assistants</p>
          </div>
        ) : activeView === 'action-menu' ? (
          <div className="w-full max-w-4xl">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full mb-4">
                <Database className="w-5 h-5 text-blue-400" />
                <h1 className="text-xl font-semibold text-white">{selectedCollection}</h1>
              </div>
              <p className="text-slate-400">Choose an action to continue</p>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <button
                onClick={() => setActiveView('create-manual')}
                className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-blue-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="p-4 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl inline-flex mb-4 transition-all">
                    <Edit3 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Craft Dataset
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Manually create test questions
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 absolute top-8 right-8 transition-colors" />
              </button>

              <button
                onClick={() => setActiveView('generate-auto')}
                className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-purple-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="p-4 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl inline-flex mb-4 transition-all">
                    <Zap className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    AI Generate
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Auto-create from knowledge base
                  </p>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-purple-400 absolute top-8 right-8 transition-colors" />
              </button>

              <button
                onClick={() => setActiveView('view-datasets')}
                className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-green-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                <div className="relative">
                  <div className="p-4 bg-green-500/10 group-hover:bg-green-500/20 rounded-2xl inline-flex mb-4 transition-all">
                    <FileText className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
                    View Datasets
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Browse and manage datasets
                  </p>
                  {collectionDatasets.length > 0 && (
                    <div className="mt-4 px-3 py-1 bg-green-500/10 border border-green-500/30 rounded-lg inline-block">
                      <span className="text-sm font-medium text-green-400">{collectionDatasets.length} available</span>
                    </div>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-green-400 absolute top-8 right-8 transition-colors" />
              </button>
            </div>
          </div>
        ) : activeView === 'view-datasets' ? (
          <div className="w-full max-w-7xl">
            <button
              onClick={() => setActiveView('action-menu')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Menu</span>
            </button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Datasets for {selectedCollection}</h2>
              <p className="text-slate-400">{collectionDatasets.length} datasets available</p>
            </div>

            {collectionDatasets.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-16 text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white mb-2">No Datasets Yet</h3>
                <p className="text-slate-400 mb-6">Create your first evaluation dataset</p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setActiveView('create-manual')}
                    className="px-5 py-2.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl transition-all cursor-pointer"
                  >
                    Craft Dataset
                  </button>
                  <button
                    onClick={() => setActiveView('generate-auto')}
                    className="px-5 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl transition-all cursor-pointer"
                  >
                    AI Generate
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {collectionDatasets.map(dataset => (
                  <button
                    key={dataset._id}
                    onClick={() => {
                      setSelectedDataset(dataset)
                      setActiveView('dataset-detail')
                    }}
                    className="group bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-blue-500/30 rounded-2xl p-6 text-left transition-all cursor-pointer"
                  >
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
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : activeView === 'dataset-detail' && selectedDataset ? (
          <div className="w-full max-w-6xl">
            <button
              onClick={() => {
                setSelectedDataset(null)
                setActiveView('view-datasets')
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Datasets</span>
            </button>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8">
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
                    <button
                      onClick={() => {
                        setEditingDataset(selectedDataset)
                        setActiveView('edit-dataset')
                      }}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDataset(selectedDataset._id)}
                      className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
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
              </div>

              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8">
                <h3 className="text-xl font-semibold text-white mb-6">Evaluate Assistants</h3>
                
                <div className="space-y-6">
                  <div>
                    <p className="text-sm text-slate-400 mb-4">Select assistants to evaluate with this dataset</p>
                    <div className="grid grid-cols-2 gap-3">
                      {chatbots.map(bot => (
                        <label
                          key={bot.id}
                          className="flex items-center gap-3 p-4 bg-slate-950/30 border border-white/5 hover:border-white/10 rounded-xl transition-all group cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedChatbots.includes(bot.id)}
                            onChange={() => toggleChatbotSelection(bot.id)}
                            className="w-5 h-5 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                          />
                          <Brain className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                          <div className="flex-1">
                            <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{bot.name}</div>
                            <div className="text-sm text-slate-500">{bot.llm}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {evaluating && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                          <span className="text-white font-semibold">Evaluating {selectedChatbots.length} assistant(s)...</span>
                        </div>
                        <span className="text-2xl font-bold text-blue-400">{evalProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-950/50 rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300 rounded-full"
                          style={{ width: `${evalProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleEvaluateChatbots}
                    disabled={evaluating || selectedChatbots.length === 0}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 cursor-pointer"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5" />
                        Run Evaluation ({selectedChatbots.length} assistant{selectedChatbots.length !== 1 ? 's' : ''})
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : activeView === 'create-manual' ? (
          <div className="w-full max-w-5xl">
            <button
              onClick={() => setActiveView('action-menu')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Menu</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Edit3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Craft Dataset</h2>
                  <p className="text-slate-400 mt-1">for {selectedCollection}</p>
                </div>
              </div>

              <form onSubmit={handleCreateManualDataset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                    placeholder="my-evaluation-dataset"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Question-Answer Pairs</h3>
                    <button
                      type="button"
                      onClick={addQaPair}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Pair
                    </button>
                  </div>

                  {qaPairs.map((pair, index) => (
                    <div key={index} className="p-6 bg-slate-950/30 border border-white/5 rounded-xl space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-400">Pair #{index + 1}</span>
                        {qaPairs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQaPair(index)}
                            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-slate-400 mb-2">Question</label>
                          <textarea
                            value={pair.question}
                            onChange={(e) => updateQaPair(index, 'question', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            rows={3}
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2">Ground Truth</label>
                          <textarea
                            value={pair.ground_truth}
                            onChange={(e) => updateQaPair(index, 'ground_truth', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            rows={3}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-2">Source (Optional)</label>
                        <input
                          type="text"
                          value={pair.source_doc}
                          onChange={(e) => updateQaPair(index, 'source_doc', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Create Dataset
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : activeView === 'generate-auto' ? (
          <div className="w-full max-w-4xl">
            <button
              onClick={() => setActiveView('action-menu')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Menu</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">AI Generate Dataset</h2>
                  <p className="text-slate-400 mt-1">from {selectedCollection}</p>
                </div>
              </div>

              <form onSubmit={handleGenerateDataset} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={autoGenConfig.dataset_name}
                    onChange={(e) => setAutoGenConfig({...autoGenConfig, dataset_name: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
                    placeholder="auto-generated-dataset"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Number of Questions
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={autoGenConfig.testset_size}
                      onChange={(e) => setAutoGenConfig({...autoGenConfig, testset_size: parseInt(e.target.value)})}
                      className="flex-1"
                    />
                    <span className="text-3xl font-bold text-purple-400 w-16 text-right">
                      {autoGenConfig.testset_size}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>Quick</span>
                    <span>Comprehensive</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Generate Dataset
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : activeView === 'edit-dataset' && editingDataset ? (
          <div className="w-full max-w-5xl">
            <button
              onClick={() => {
                setEditingDataset(null)
                setActiveView('dataset-detail')
              }}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Cancel Editing</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-2xl p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <Edit3 className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Edit Dataset</h2>
                  <p className="text-slate-400 mt-1">{editingDataset.name}</p>
                </div>
              </div>

              <form onSubmit={handleUpdateDataset} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">Question-Answer Pairs</h3>
                    <button
                      type="button"
                      onClick={addEditingQaPair}
                      className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      Add Pair
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {editingDataset.qa_pairs.map((pair, index) => (
                      <div key={index} className="p-6 bg-slate-950/30 border border-white/5 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-400">Pair #{index + 1}</span>
                          {editingDataset.qa_pairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeEditingQaPair(index)}
                              className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-2">Question</label>
                            <textarea
                              value={pair.question}
                              onChange={(e) => updateEditingQaPair(index, 'question', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              rows={3}
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-2">Ground Truth</label>
                            <textarea
                              value={pair.ground_truth || pair.answer || ''}
                              onChange={(e) => updateEditingQaPair(index, 'ground_truth', e.target.value)}
                              className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              rows={3}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-slate-400 mb-2">Source (Optional)</label>
                          <input
                            type="text"
                            value={pair.source_doc || ''}
                            onChange={(e) => updateEditingQaPair(index, 'source_doc', e.target.value)}
                            className="w-full px-3 py-2 bg-slate-950/50 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDataset(null)
                      setActiveView('dataset-detail')
                    }}
                    className="flex-1 px-6 py-4 bg-slate-800/50 hover:bg-slate-800 text-white rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl transition-all flex items-center justify-center gap-2 font-semibold disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}