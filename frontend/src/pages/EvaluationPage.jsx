// src/pages/EvaluationPage.jsx
import { useState, useEffect } from 'react'
import { Plus, Loader2, BarChart3, FileText, PlayCircle } from 'lucide-react'
import { evaluationAPI, knowledgeBaseAPI, chatbotsAPI, chatAPI } from '../services/api'

export default function EvaluationPage() {
  const [activeTab, setActiveTab] = useState('create-manual')
  const [loading, setLoading] = useState(false)
  
  // Data
  const [collections, setCollections] = useState([])
  const [chatbots, setChatbots] = useState([])
  const [datasets, setDatasets] = useState([])
  const [evaluations, setEvaluations] = useState([])
  
  // Manual dataset creation
  const [datasetName, setDatasetName] = useState('')
  const [qaPairs, setQaPairs] = useState([{ question: '', ground_truth: '', source_doc: '' }])
  
  // Auto generation
  const [autoGenConfig, setAutoGenConfig] = useState({
    collection_name: '',
    dataset_name: '',
    testset_size: 10
  })
  
  // Evaluation
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedChatbot, setSelectedChatbot] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)

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
      setDatasets(datasetsData)
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

      await evaluationAPI.createDataset(datasetName, validPairs)
      alert('Dataset created successfully!')
      setDatasetName('')
      setQaPairs([{ question: '', ground_truth: '', source_doc: '' }])
      await loadInitialData()
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
        autoGenConfig.collection_name,
        autoGenConfig.dataset_name,
        autoGenConfig.testset_size
      )
      alert('Dataset generated successfully!')
      setAutoGenConfig({
        collection_name: '',
        dataset_name: '',
        testset_size: 10
      })
      await loadInitialData()
    } catch (error) {
      console.error('Error generating dataset:', error)
      alert('Error generating dataset')
    } finally {
      setLoading(false)
    }
  }

  const handleEvaluateChatbot = async () => {
    if (!selectedDataset || !selectedChatbot) {
      alert('Please select both a dataset and a chatbot')
      return
    }

    setEvaluating(true)
    setEvalProgress(0)

    try {
      const dataset = datasets.find(d => d._id === selectedDataset)
      const qaPairs = dataset.qa_pairs

      const questions = []
      const groundTruths = []
      const answers = []
      const contexts = []

      for (let i = 0; i < qaPairs.length; i++) {
        const pair = qaPairs[i]
        setEvalProgress(Math.round((i / qaPairs.length) * 50))

        try {
          const response = await chatAPI.sendMessage(selectedChatbot, pair.question, [])
          
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

      setEvalProgress(75)

      await evaluationAPI.evaluateChatbot(
        dataset.name,
        selectedChatbot,
        questions,
        groundTruths,
        answers,
        contexts
      )

      setEvalProgress(100)
      alert('Evaluation completed successfully!')
      
      const evals = await evaluationAPI.getEvaluations()
      setEvaluations(evals)
      
    } catch (error) {
      console.error('Error during evaluation:', error)
      alert('Error during evaluation')
    } finally {
      setEvaluating(false)
      setEvalProgress(0)
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

  const tabs = [
    { id: 'create-manual', label: 'Create Dataset Manually', icon: FileText },
    { id: 'create-auto', label: 'Generate Dataset Automatically', icon: Plus },
    { id: 'view-datasets', label: 'View Datasets', icon: BarChart3 },
    { id: 'evaluate', label: 'Evaluate Chatbot', icon: PlayCircle },
    { id: 'results', label: 'View Results', icon: BarChart3 }
  ]

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Evaluation</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-600/20 text-white border border-blue-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-[#111111] border border-white/10 rounded-xl p-6">
        {/* Create Manual Dataset */}
        {activeTab === 'create-manual' && (
          <form onSubmit={handleCreateManualDataset} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Dataset Name
              </label>
              <input
                type="text"
                value={datasetName}
                onChange={(e) => setDatasetName(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Question-Answer Pairs</h3>
                <button
                  type="button"
                  onClick={addQaPair}
                  className="px-3 py-1 bg-white/5 text-white text-sm rounded-lg hover:bg-white/10 flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Pair
                </button>
              </div>

              {qaPairs.map((pair, index) => (
                <div key={index} className="grid grid-cols-3 gap-3 p-4 bg-black/20 rounded-lg">
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Question</label>
                    <textarea
                      value={pair.question}
                      onChange={(e) => updateQaPair(index, 'question', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-white/50 mb-1">Ground Truth</label>
                    <textarea
                      value={pair.ground_truth}
                      onChange={(e) => updateQaPair(index, 'ground_truth', e.target.value)}
                      className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className="block text-xs text-white/50 mb-1">Source</label>
                    <input
                      type="text"
                      value={pair.source_doc}
                      onChange={(e) => updateQaPair(index, 'source_doc', e.target.value)}
                      className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-white text-sm"
                    />
                    {qaPairs.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQaPair(index)}
                        className="mt-2 px-2 py-1 bg-red-500/10 text-red-400 text-xs rounded hover:bg-red-500/20"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Dataset'
              )}
            </button>
          </form>
        )}

        {/* Generate Dataset Automatically */}
        {activeTab === 'create-auto' && (
          <form onSubmit={handleGenerateDataset} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Collection
                </label>
                <select
                  value={autoGenConfig.collection_name}
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, collection_name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                >
                  <option value="">Select a collection</option>
                  {collections.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Dataset Name
                </label>
                <input
                  type="text"
                  value={autoGenConfig.dataset_name}
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, dataset_name: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Number of QA Pairs
                </label>
                <input
                  type="number"
                  value={autoGenConfig.testset_size}
                  onChange={(e) => setAutoGenConfig({...autoGenConfig, testset_size: parseInt(e.target.value)})}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Dataset'
              )}
            </button>
          </form>
        )}

        {/* View Datasets */}
        {activeTab === 'view-datasets' && (
          <div className="space-y-4">
            {datasets.length === 0 ? (
              <p className="text-white/40 text-center py-8">No datasets available</p>
            ) : (
              datasets.map(dataset => (
                <div key={dataset._id} className="p-4 bg-black/20 rounded-lg">
                  <h3 className="text-lg font-semibold text-white">{dataset.name}</h3>
                  <div className="mt-2 text-sm text-white/60">
                    <p>Source: {dataset.source_collection}</p>
                    <p>Questions: {dataset.qa_pairs?.length || 0}</p>
                    <p>Created: {new Date(dataset.generated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Evaluate Chatbot */}
        {activeTab === 'evaluate' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Select Dataset
                </label>
                <select
                  value={selectedDataset || ''}
                  onChange={(e) => setSelectedDataset(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Select a dataset</option>
                  {datasets.map(ds => (
                    <option key={ds._id} value={ds._id}>
                      {ds.name} ({ds.qa_pairs?.length || 0} questions)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Select Chatbot
                </label>
                <select
                  value={selectedChatbot || ''}
                  onChange={(e) => setSelectedChatbot(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                >
                  <option value="">Select a chatbot</option>
                  {chatbots.map(bot => (
                    <option key={bot.id} value={bot.id}>
                      {bot.name} ({bot.llm})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {evaluating && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-white/60">
                  <span>Evaluating...</span>
                  <span>{evalProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${evalProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleEvaluateChatbot}
              disabled={evaluating || !selectedDataset || !selectedChatbot}
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {evaluating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <PlayCircle className="w-4 h-4" />
                  Start Evaluation
                </>
              )}
            </button>
          </div>
        )}

        {/* View Results */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            <button
              onClick={async () => {
                const evals = await evaluationAPI.getEvaluations()
                setEvaluations(evals)
              }}
              className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10"
            >
              Refresh Results
            </button>

            {evaluations.length === 0 ? (
              <p className="text-white/40 text-center py-8">No evaluation results available</p>
            ) : (
              evaluations.map(evaluation => {
                const metrics = evaluation.evaluation?.metrics_summary || {}
                return (
                  <div key={evaluation._id} className="p-4 bg-black/20 rounded-lg space-y-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{evaluation.name || 'Evaluation'}</h3>
                      <div className="mt-1 text-sm text-white/60">
                        <p>Chatbot: {evaluation.chatbot?.name || 'Unknown'}</p>
                        <p>Dataset: {evaluation.dataset?.name || 'Unknown'}</p>
                        <p>Date: {new Date(evaluation.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    {Object.keys(metrics).length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(metrics).map(([key, value]) => (
                          <div key={key} className="bg-white/5 rounded-lg p-3">
                            <p className="text-xs text-white/50 mb-1 capitalize">
                              {key.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xl font-semibold text-white">
                              {typeof value === 'number' ? value.toFixed(3) : value}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}