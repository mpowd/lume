import { useState, useEffect } from 'react'
import { Plus, Loader2, BarChart3, FileText, PlayCircle, Trash2, Download, RefreshCw, Edit3, Check, X, Zap, TrendingUp, Award, Target, Sparkles, Eye, ChevronRight, Activity, Brain, Rocket, Beaker, GitCompare, Flame } from 'lucide-react'
import { evaluationAPI, knowledgeBaseAPI, chatbotsAPI, chatAPI } from '../services/api'

export default function EvaluationPage() {
  const [activeView, setActiveView] = useState('hub')
  const [loading, setLoading] = useState(false)
  
  const [collections, setCollections] = useState([])
  const [chatbots, setChatbots] = useState([])
  const [datasets, setDatasets] = useState([])
  const [evaluations, setEvaluations] = useState([])
  
  const [datasetName, setDatasetName] = useState('')
  const [qaPairs, setQaPairs] = useState([{ question: '', ground_truth: '', source_doc: '' }])
  
  const [autoGenConfig, setAutoGenConfig] = useState({
    collection_name: '',
    dataset_name: '',
    testset_size: 10
  })
  
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedChatbot, setSelectedChatbot] = useState(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalProgress, setEvalProgress] = useState(0)
  const [compareMode, setCompareMode] = useState(false)
  const [selectedEvals, setSelectedEvals] = useState([])

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    try {
      const [collectionsData, chatbotsData, datasetsData, evalsData] = await Promise.all([
        knowledgeBaseAPI.getAll(),
        chatbotsAPI.getAll(),
        evaluationAPI.getDatasets(),
        evaluationAPI.getEvaluations()
      ])
      setCollections(collectionsData.collection_names || [])
      setChatbots(chatbotsData)
      setDatasets(datasetsData)
      setEvaluations(evalsData)
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
      setActiveView('hub')
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
      setActiveView('hub')
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
      
      await loadInitialData()
      setActiveView('leaderboard')
      
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

  const getMetricColor = (value) => {
    if (value >= 0.8) return 'from-emerald-400 to-green-500'
    if (value >= 0.6) return 'from-blue-400 to-cyan-500'
    if (value >= 0.4) return 'from-amber-400 to-orange-500'
    return 'from-rose-400 to-red-500'
  }

  const toggleEvalSelection = (evalId) => {
    setSelectedEvals(prev => 
      prev.includes(evalId) 
        ? prev.filter(id => id !== evalId)
        : [...prev, evalId]
    )
  }

  const getTopPerformer = () => {
    if (evaluations.length === 0) return null
    return evaluations.reduce((best, current) => {
      const currentMetrics = current.evaluation?.metrics_summary || {}
      const bestMetrics = best.evaluation?.metrics_summary || {}
      const currentAvg = Object.values(currentMetrics).reduce((a, b) => a + b, 0) / Object.values(currentMetrics).length
      const bestAvg = Object.values(bestMetrics).reduce((a, b) => a + b, 0) / Object.values(bestMetrics).length
      return currentAvg > bestAvg ? current : best
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950/20 to-slate-950">
      <style>{`
        * { cursor: default; }
        button, a, [role="button"], input[type="checkbox"], input[type="radio"], select { cursor: pointer !important; }
        input[type="text"], input[type="url"], input[type="number"], textarea { cursor: text !important; }
        input[type="range"] { cursor: grab !important; }
        input[type="range"]:active { cursor: grabbing !important; }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        .float-animation { animation: float 3s ease-in-out infinite; }
        .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl float-animation" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl float-animation" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 p-8">
        {activeView === 'hub' && (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-full mb-6 backdrop-blur-xl">
                <Sparkles className="w-5 h-5 text-purple-400 pulse-glow" />
                <span className="text-purple-300 font-medium">AI Performance Lab</span>
              </div>
              <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Evaluation Hub
              </h1>
              <p className="text-xl text-slate-400 max-w-2xl mx-auto">
                Build datasets, run experiments, and discover insights about your AI systems
              </p>
            </div>

            <div className="grid grid-cols-4 gap-6 mb-12">
              <div className="group relative bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border border-violet-500/20 rounded-3xl p-8 hover:border-violet-500/40 transition-all hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <Beaker className="w-12 h-12 text-violet-400 mb-4 float-animation" />
                  <div className="text-4xl font-bold text-white mb-2">{datasets.length}</div>
                  <div className="text-violet-300 font-medium">Test Suites</div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-blue-500/10 via-cyan-500/5 to-transparent border border-blue-500/20 rounded-3xl p-8 hover:border-blue-500/40 transition-all hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <Rocket className="w-12 h-12 text-blue-400 mb-4 float-animation" style={{ animationDelay: '0.5s' }} />
                  <div className="text-4xl font-bold text-white mb-2">{evaluations.length}</div>
                  <div className="text-blue-300 font-medium">Experiments</div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent border border-emerald-500/20 rounded-3xl p-8 hover:border-emerald-500/40 transition-all hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <Brain className="w-12 h-12 text-emerald-400 mb-4 float-animation" style={{ animationDelay: '1s' }} />
                  <div className="text-4xl font-bold text-white mb-2">{chatbots.length}</div>
                  <div className="text-emerald-300 font-medium">AI Agents</div>
                </div>
              </div>

              <div className="group relative bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 rounded-3xl p-8 hover:border-amber-500/40 transition-all hover:scale-105">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <Flame className="w-12 h-12 text-amber-400 mb-4 float-animation" style={{ animationDelay: '1.5s' }} />
                  <div className="text-4xl font-bold text-white mb-2">
                    {evaluations.length > 0 
                      ? (evaluations.reduce((acc, e) => {
                          const metrics = e.evaluation?.metrics_summary || {}
                          const avg = Object.values(metrics).reduce((a, b) => a + b, 0) / Object.values(metrics).length || 0
                          return acc + avg
                        }, 0) / evaluations.length * 100).toFixed(0)
                      : 0}%
                  </div>
                  <div className="text-amber-300 font-medium">Peak Score</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <button
                onClick={() => setActiveView('manual')}
                className="group relative bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 hover:border-blue-500/50 rounded-3xl p-8 text-left overflow-hidden transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Edit3 className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">
                    Craft Dataset
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Hand-craft precise evaluation questions with expert ground truths
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-blue-400 group-hover:gap-4 transition-all">
                    <span className="text-sm font-medium">Start Building</span>
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveView('generate')}
                className="group relative bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 hover:border-purple-500/50 rounded-3xl p-8 text-left overflow-hidden transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <Zap className="w-8 h-8 text-purple-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors">
                    AI Generator
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Automatically synthesize test cases from your knowledge base
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-purple-400 group-hover:gap-4 transition-all">
                    <span className="text-sm font-medium">Generate Now</span>
                    <Sparkles className="w-5 h-5" />
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveView('experiment')}
                className="group relative bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 hover:border-emerald-500/50 rounded-3xl p-8 text-left overflow-hidden transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <PlayCircle className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-emerald-400 transition-colors">
                    Run Experiment
                  </h3>
                  <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                    Execute comprehensive evaluations and measure performance
                  </p>
                  <div className="mt-6 flex items-center gap-2 text-emerald-400 group-hover:gap-4 transition-all">
                    <span className="text-sm font-medium">Launch Test</span>
                    <Rocket className="w-5 h-5" />
                  </div>
                </div>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-6 mt-6">
              <button
                onClick={() => setActiveView('datasets')}
                className="group bg-gradient-to-r from-slate-900/50 to-slate-900/30 border border-white/10 hover:border-white/20 rounded-2xl p-6 flex items-center justify-between transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-4">
                  <FileText className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  <div className="text-left">
                    <div className="text-white font-semibold">Browse Datasets</div>
                    <div className="text-sm text-slate-500">{datasets.length} available</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => setActiveView('leaderboard')}
                className="group bg-gradient-to-r from-slate-900/50 to-slate-900/30 border border-white/10 hover:border-white/20 rounded-2xl p-6 flex items-center justify-between transition-all hover:scale-[1.02]"
              >
                <div className="flex items-center gap-4">
                  <TrendingUp className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                  <div className="text-left">
                    <div className="text-white font-semibold">View Leaderboard</div>
                    <div className="text-sm text-slate-500">{evaluations.length} results</div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
              </button>
            </div>
          </div>
        )}

        {activeView === 'manual' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-right-6 duration-500">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Hub</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 rounded-3xl p-10 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                  <Edit3 className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Craft Your Dataset</h2>
                  <p className="text-slate-400 mt-1">Build question-answer pairs with precision</p>
                </div>
              </div>

              <form onSubmit={handleCreateManualDataset} className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-3">
                    Dataset Name
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => setDatasetName(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-950/50 border border-white/10 focus:border-blue-500/50 rounded-2xl text-white text-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="customer-support-qa-v1"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-white">Question-Answer Pairs</h3>
                    <button
                      type="button"
                      onClick={addQaPair}
                      className="px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-400 rounded-xl font-medium transition-all flex items-center gap-2 hover:scale-105"
                    >
                      <Plus className="w-4 h-4" />
                      Add Pair
                    </button>
                  </div>

                  <div className="space-y-4">
                    {qaPairs.map((pair, index) => (
                      <div key={index} className="group bg-slate-950/30 border border-white/5 hover:border-white/10 rounded-2xl p-6 transition-all">
                        <div className="flex items-center justify-between mb-4">
                          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium rounded-lg">
                            Pair #{index + 1}
                          </span>
                          {qaPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeQaPair(index)}
                              className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all hover:scale-110"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Question</label>
                            <textarea
                              value={pair.question}
                              onChange={(e) => updateQaPair(index, 'question', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 focus:border-blue-500/50 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                              rows={2}
                              placeholder="What is the return policy?"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Ground Truth Answer</label>
                            <textarea
                              value={pair.ground_truth}
                              onChange={(e) => updateQaPair(index, 'ground_truth', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-xl text-white resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                              rows={2}
                              placeholder="We offer 30-day returns..."
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Source (Optional)</label>
                            <input
                              type="text"
                              value={pair.source_doc}
                              onChange={(e) => updateQaPair(index, 'source_doc', e.target.value)}
                              className="w-full px-4 py-3 bg-slate-950/50 border border-white/10 focus:border-slate-500/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-slate-500/20 transition-all"
                              placeholder="policy-docs.pdf"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] shadow-lg shadow-blue-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Creating Dataset...
                    </>
                  ) : (
                    <>
                      <Check className="w-6 h-6" />
                      Create Dataset
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeView === 'generate' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-6 duration-500">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Hub</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 rounded-3xl p-10 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">AI-Powered Generation</h2>
                  <p className="text-slate-400 mt-1">Synthesize test cases automatically</p>
                </div>
              </div>

              <form onSubmit={handleGenerateDataset} className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Source Collection
                    </label>
                    <select
                      value={autoGenConfig.collection_name}
                      onChange={(e) => setAutoGenConfig({...autoGenConfig, collection_name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                      required
                    >
                      <option value="">Select collection...</option>
                      {collections.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Dataset Name
                    </label>
                    <input
                      type="text"
                      value={autoGenConfig.dataset_name}
                      onChange={(e) => setAutoGenConfig({...autoGenConfig, dataset_name: e.target.value})}
                      className="w-full px-5 py-4 bg-slate-950/50 border border-white/10 focus:border-purple-500/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all"
                      placeholder="auto-generated-v1"
                      required
                    />
                  </div>
                </div>

                <div className="bg-slate-950/30 border border-white/5 rounded-2xl p-8">
                  <label className="block text-lg font-semibold text-white mb-6">
                    Number of Test Cases
                  </label>
                  <div className="flex items-center gap-8">
                    <input
                      type="range"
                      min="5"
                      max="100"
                      step="5"
                      value={autoGenConfig.testset_size}
                      onChange={(e) => setAutoGenConfig({...autoGenConfig, testset_size: parseInt(e.target.value)})}
                      className="flex-1 h-3 bg-slate-900/50 rounded-full"
                    />
                    <div className="text-right">
                      <div className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        {autoGenConfig.testset_size}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">questions</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500 mt-4">
                    <span>Quick Test (5)</span>
                    <span>Comprehensive (100)</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-8 py-5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] shadow-lg shadow-purple-500/25"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-6 h-6" />
                      Generate Dataset
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {activeView === 'datasets' && (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-right-6 duration-500">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Hub</span>
            </button>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">Dataset Library</h2>
                <p className="text-slate-400">{datasets.length} test suites ready</p>
              </div>
            </div>

            {datasets.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-3xl p-20 text-center">
                <FileText className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">No Datasets Yet</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Create your first evaluation dataset to start measuring AI performance
                </p>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => setActiveView('manual')}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-blue-500/30 text-blue-400 rounded-xl font-medium transition-all hover:scale-105"
                  >
                    Manual Creation
                  </button>
                  <button
                    onClick={() => setActiveView('generate')}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-400 rounded-xl font-medium transition-all hover:scale-105"
                  >
                    AI Generate
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-6">
                {datasets.map(dataset => (
                  <div
                    key={dataset._id}
                    className="group bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 hover:border-white/20 rounded-2xl p-6 transition-all hover:scale-105"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-3 bg-blue-500/10 rounded-xl">
                        <Beaker className="w-6 h-6 text-blue-400" />
                      </div>
                      <div className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg">
                        <span className="text-sm font-bold text-blue-400">
                          {dataset.qa_pairs?.length || 0}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-2">
                      {dataset.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      {dataset.source_collection}
                    </p>
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{new Date(dataset.generated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeView === 'experiment' && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-right-6 duration-500">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Hub</span>
            </button>

            <div className="bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border border-white/10 rounded-3xl p-10 backdrop-blur-xl">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl flex items-center justify-center">
                  <Rocket className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-white">Launch Experiment</h2>
                  <p className="text-slate-400 mt-1">Evaluate your AI agent's capabilities</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      Test Suite
                    </label>
                    <select
                      value={selectedDataset || ''}
                      onChange={(e) => setSelectedDataset(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-950/50 border border-white/10 focus:border-emerald-500/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="">Choose dataset...</option>
                      {datasets.map(ds => (
                        <option key={ds._id} value={ds._id}>
                          {ds.name} ({ds.qa_pairs?.length || 0} tests)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-300 mb-3">
                      AI Agent
                    </label>
                    <select
                      value={selectedChatbot || ''}
                      onChange={(e) => setSelectedChatbot(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-950/50 border border-white/10 focus:border-emerald-500/50 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    >
                      <option value="">Choose agent...</option>
                      {chatbots.map(bot => (
                        <option key={bot.id} value={bot.id}>
                          {bot.name} ({bot.llm})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {evaluating && (
                  <div className="bg-slate-950/50 border border-emerald-500/30 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                          <div className="absolute inset-0 blur-xl bg-emerald-400/50" />
                        </div>
                        <div>
                          <div className="text-lg font-bold text-white">Running Experiment</div>
                          <div className="text-sm text-slate-400">Processing test cases...</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-bold text-emerald-400">{evalProgress}%</div>
                      </div>
                    </div>
                    <div className="relative w-full h-4 bg-slate-900/50 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full transition-all duration-500"
                        style={{ width: `${evalProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={handleEvaluateChatbot}
                  disabled={evaluating || !selectedDataset || !selectedChatbot}
                  className="w-full px-8 py-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 disabled:opacity-50 hover:scale-[1.02] shadow-lg shadow-emerald-500/25"
                >
                  {evaluating ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Rocket className="w-6 h-6" />
                      Launch Experiment
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeView === 'leaderboard' && (
          <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-right-6 duration-500">
            <button
              onClick={() => setActiveView('hub')}
              className="flex items-center gap-2 text-slate-400 hover:text-white mb-8 transition-colors group"
            >
              <ChevronRight className="w-5 h-5 rotate-180 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Hub</span>
            </button>

            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-4xl font-bold text-white mb-2">Performance Leaderboard</h2>
                <p className="text-slate-400">{evaluations.length} experiments completed</p>
              </div>
              <button
                onClick={() => setCompareMode(!compareMode)}
                className={`px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2 ${
                  compareMode
                    ? 'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-400'
                    : 'bg-slate-900/50 border border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <GitCompare className="w-5 h-5" />
                {compareMode ? 'Exit Compare' : 'Compare Mode'}
              </button>
            </div>

            {evaluations.length === 0 ? (
              <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-white/10 rounded-3xl p-20 text-center">
                <TrendingUp className="w-20 h-20 text-slate-700 mx-auto mb-6" />
                <h3 className="text-2xl font-bold text-white mb-3">No Results Yet</h3>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Run your first experiment to see performance metrics
                </p>
                <button
                  onClick={() => setActiveView('experiment')}
                  className="px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 hover:from-emerald-500/30 hover:to-green-500/30 border border-emerald-500/30 text-emerald-400 rounded-xl font-medium transition-all hover:scale-105"
                >
                  Run Experiment
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {compareMode && selectedEvals.length > 0 && (
                  <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/30 rounded-2xl p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GitCompare className="w-6 h-6 text-purple-400" />
                        <span className="text-white font-semibold">
                          {selectedEvals.length} experiments selected
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedEvals([])}
                        className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-all"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}

                {evaluations.map((evaluation, idx) => {
                  const metrics = evaluation.evaluation?.metrics_summary || {}
                  const avgScore = Object.keys(metrics).length > 0 
                    ? Object.values(metrics).reduce((a, b) => a + b, 0) / Object.values(metrics).length 
                    : 0
                  const topPerformer = getTopPerformer()
                  const isTop = topPerformer?._id === evaluation._id
                  const isSelected = selectedEvals.includes(evaluation._id)

                  return (
                    <div
                      key={idx}
                      onClick={() => compareMode && toggleEvalSelection(evaluation._id)}
                      className={`group relative bg-gradient-to-br from-slate-900/80 via-slate-900/50 to-transparent border rounded-3xl overflow-hidden transition-all ${
                        isSelected 
                          ? 'border-purple-500/50 scale-[1.02]' 
                          : 'border-white/10 hover:border-white/20'
                      } ${compareMode ? '' : 'hover:scale-[1.01]'}`}
                    >
                      {isTop && (
                        <div className="absolute top-0 right-0 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border-l border-b border-amber-500/30 rounded-bl-2xl">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-bold text-amber-400">Top Performer</span>
                          </div>
                        </div>
                      )}

                      <div className="p-8">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex-1">
                            <div className="flex items-center gap-4 mb-3">
                              {compareMode && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-5 h-5 rounded border-white/20 bg-slate-950 text-purple-500"
                                />
                              )}
                              <h3 className="text-2xl font-bold text-white group-hover:text-blue-400 transition-colors">
                                {evaluation.chatbot?.name || 'Unknown'}
                              </h3>
                              <span className="text-slate-600">×</span>
                              <span className="text-slate-400">{evaluation.dataset?.name || 'Unknown'}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-500">
                              <span>{new Date(evaluation.timestamp).toLocaleString()}</span>
                              <span>•</span>
                              <span>{evaluation.dataset?.num_questions || 0} questions</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-6xl font-black bg-gradient-to-r ${getMetricColor(avgScore)} bg-clip-text text-transparent`}>
                              {(avgScore * 100).toFixed(0)}
                            </div>
                            <div className="text-sm text-slate-500 mt-1">Score</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-4">
                          {[
                            { key: 'faithfulness', icon: Award, label: 'Faithfulness' },
                            { key: 'answer_relevancy', icon: Target, label: 'Relevancy' },
                            { key: 'context_recall', icon: Activity, label: 'Recall' },
                            { key: 'context_precision', icon: Zap, label: 'Precision' }
                          ].map(({ key, icon: Icon, label }) => {
                            const value = metrics[key] || 0
                            return (
                              <div key={key} className="relative">
                                <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Icon className="w-4 h-4 text-slate-500" />
                                    <span className="text-xs font-medium text-slate-400">{label}</span>
                                  </div>
                                  <div className={`text-3xl font-bold bg-gradient-to-r ${getMetricColor(value)} bg-clip-text text-transparent mb-3`}>
                                    {(value * 100).toFixed(0)}
                                  </div>
                                  <div className="relative w-full h-2 bg-slate-900/50 rounded-full overflow-hidden">
                                    <div
                                      className={`absolute inset-y-0 left-0 bg-gradient-to-r ${getMetricColor(value)} rounded-full transition-all duration-1000`}
                                      style={{ width: `${value * 100}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        <div className="flex items-center gap-2 mt-6 flex-wrap">
                          <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-medium rounded-lg">
                            {evaluation.chatbot?.llm}
                          </span>
                          {evaluation.chatbot?.hyde && (
                            <span className="px-3 py-1 bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium rounded-lg">
                              HyDE
                            </span>
                          )}
                          {evaluation.chatbot?.reranking && (
                            <span className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-medium rounded-lg">
                              Reranked
                            </span>
                          )}
                          {evaluation.chatbot?.hybrid_search && (
                            <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium rounded-lg">
                              Hybrid
                            </span>
                          )}
                          <span className="px-3 py-1 bg-slate-700/30 border border-slate-600/30 text-slate-400 text-xs font-medium rounded-lg">
                            Top-{evaluation.chatbot?.top_k || 5}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}