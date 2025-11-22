import { useState, useEffect, useRef } from 'react'
import { Send, Bot, AlertCircle, Loader2, ExternalLink, Sparkles, MessageSquare, RefreshCw, ChevronLeft, ChevronRight, Database, Cpu } from 'lucide-react'
import { chatAPI, assistantsAPI } from '../../services/api'
import ReactMarkdown from 'react-markdown'
import SmartTooltip from '../../components/SmartTooltip'

export default function ChatPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! Ask me anything.' }
  ])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)
  const carouselRef = useRef(null)
  
  // API State
  const [assistants, setAssistants] = useState([])
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingAssistants, setLoadingAssistants] = useState(true)
  const [error, setError] = useState(null)
  const [carouselScroll, setCarouselScroll] = useState(0)

  useEffect(() => {
    loadAssistants()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [input])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadAssistants = async () => {
    setLoadingAssistants(true)
    setError(null)
    try {
      const data = await assistantsAPI.getAll()
      
      const mappedAssistants = data.map(bot => ({
        id: bot.id || bot._id,
        name: bot.assistant_name || bot.name,
        workflow: bot.workflow,
        llm: bot.llm,
        collections: bot.collections || [],
        hybrid_search: bot.hybrid_search,
        hyde: bot.hyde,
        reranking: bot.reranking,
        created_at: bot.created_at
      }))
      
      setAssistants(mappedAssistants)
      if (mappedAssistants.length > 0) {
        setSelectedAssistant(mappedAssistants[0])
        setMessages([{ 
          role: 'assistant', 
          content: `Hi! I'm ${mappedAssistants[0].name}. How can I help you today?` 
        }])
      } else {
        setError('No assistants found. Please create one first.')
      }
    } catch (err) {
      console.error('Error loading assistants:', err)
      setError('Could not connect to backend. Is it running?')
    } finally {
      setLoadingAssistants(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !selectedAssistant) return
    
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    
    try {
      const response = await chatAPI.sendMessage(
        selectedAssistant.id,
        input,
        messages
      )
      
      console.log('API Response:', response)
      
      // Debug: Log the sources with scores
      if (response.source_urls) {
        console.log('Sources with scores:', response.source_urls)
        response.source_urls.forEach((source, i) => {
          console.log(`Source ${i}:`, source, 'Score:', typeof source === 'string' ? 'N/A' : source.score)
        })
      }
      
      // Sort sources by score (highest first) and maintain context alignment
      let sortedSources = response.source_urls || []
      let sortedContexts = response.contexts || []
      
      if (sortedSources.length > 0) {
        // Create array of indices with scores
        const sourceIndices = sortedSources.map((source, index) => ({
          index,
          score: typeof source === 'string' ? 0.5 : (source.score || 0.5)
        }))
        
        // Sort by score descending
        sourceIndices.sort((a, b) => b.score - a.score)
        
        // Reorder sources and contexts based on sorted indices
        sortedSources = sourceIndices.map(item => sortedSources[item.index])
        sortedContexts = sourceIndices.map(item => sortedContexts[item.index] || '')
      }
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.response || response.message || 'No response received',
        sources: sortedSources,
        contexts: sortedContexts
      }])
    } catch (err) {
      console.error('Error sending message:', err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '❌ Error: ' + (err.response?.data?.detail || err.message || 'Could not send message')
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleNewChat = () => {
    if (selectedAssistant) {
      setMessages([{ 
        role: 'assistant', 
        content: `Hi! I'm ${selectedAssistant.name}. How can I help you today?` 
      }])
    }
  }

  const scrollCarousel = (direction) => {
    if (carouselRef.current) {
      const scrollAmount = 320
      const newScroll = direction === 'left' 
        ? Math.max(0, carouselScroll - scrollAmount)
        : Math.min(carouselRef.current.scrollWidth - carouselRef.current.clientWidth, carouselScroll + scrollAmount)
      
      carouselRef.current.scrollTo({ left: newScroll, behavior: 'smooth' })
      setCarouselScroll(newScroll)
    }
  }

  const selectAssistant = (bot) => {
    setSelectedAssistant(bot)
    setMessages([{ 
      role: 'assistant', 
      content: `Hi! I'm ${bot.name}. How can I help you today?` 
    }])
  }

  const getSourceDomain = (url) => {
    try {
      const urlString = typeof url === 'string' ? url : url.url
      return new URL(urlString).hostname.replace('www.', '')
    } catch {
      return 'Source'
    }
  }

  const getSourceUrl = (source) => {
    return typeof source === 'string' ? source : source.url
  }

  const getSourceScore = (source) => {
    // Return null if source is a string or doesn't have a score
    if (typeof source === 'string') return null
    // Only return score if it actually exists
    return source.score !== undefined ? source.score : null
  }

  const getSourceStyle = (score) => {
    // If no score, use a neutral style without glow
    if (score === null || score === undefined) {
      return {
        backgroundColor: 'rgb(30, 41, 59)',
        borderColor: 'rgba(148, 163, 184, 0.3)',
        border: '2px solid'
      }
    }
    
    const glowIntensity = score * 20
    const borderOpacity = 0.3 + (score * 0.4)
    
    return {
      backgroundColor: 'rgb(30, 41, 59)',
      borderColor: `rgba(59, 130, 246, ${borderOpacity})`,
      boxShadow: `0 0 ${glowIntensity}px rgba(59, 130, 246, ${score * 0.6}), inset 0 0 ${glowIntensity/2}px rgba(59, 130, 246, ${score * 0.2})`,
      border: '2px solid'
    }
  }

  const getDotColor = (score) => {
    // If no score, return neutral color
    if (score === null || score === undefined) return 'bg-slate-400'
    
    if (score >= 0.8) return 'bg-emerald-400'
    if (score >= 0.6) return 'bg-blue-400'
    if (score >= 0.4) return 'bg-yellow-400'
    if (score >= 0.2) return 'bg-orange-400'
    return 'bg-red-400'
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <style>{`
        .cursor-pointer { cursor: pointer; }
        button { cursor: pointer; }
        select { cursor: pointer; }
        textarea { cursor: text; }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .message-enter { animation: slideUp 0.3s ease-out; }
        .gradient-border {
          position: relative;
          background: linear-gradient(to right, rgb(59, 130, 246), rgb(147, 51, 234));
          padding: 1px;
          border-radius: 1.5rem;
        }
        .gradient-border-inner { background: rgb(10, 10, 10); border-radius: 1.5rem; }
        .carousel-container { scrollbar-width: none; -ms-overflow-style: none; }
        .carousel-container::-webkit-scrollbar { display: none; }
        .assistant-card { transition: all 0.3s ease; }
        .assistant-card:hover { transform: translateY(-2px); }
        .assistant-card.selected { box-shadow: 0 0 0 2px rgb(59, 130, 246); }
        .chunk-tooltip { pointer-events: auto; }
        .chunk-content {
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) rgba(255, 255, 255, 0.05);
        }
        .chunk-content::-webkit-scrollbar { width: 6px; }
        .chunk-content::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 3px; }
        .chunk-content::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.3); border-radius: 3px; }
        .chunk-content::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }
      `}</style>

      <div className="flex-1 flex flex-col">
        <div className="fixed top-0 left-0 right-0 z-10 border-b border-white/5 bg-slate-950/95 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="max-w-6xl mx-auto">
              {!selectedAssistant ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl">
                        <MessageSquare className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-white">Chat</h1>
                        <p className="text-sm text-slate-400">Select an assistant to start</p>
                      </div>
                    </div>
                  </div>
                  {loadingAssistants ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading assistants...</span>
                      </div>
                    </div>
                  ) : assistants.length > 0 ? (
                    <div className="relative">
                      {carouselScroll > 0 && (
                        <button onClick={() => scrollCarousel('left')} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-2xl transition-all cursor-pointer shadow-lg">
                          <ChevronLeft className="w-5 h-5 text-white" />
                        </button>
                      )}
                      <div ref={carouselRef} className="carousel-container flex gap-4 overflow-x-auto pb-2" onScroll={(e) => setCarouselScroll(e.target.scrollLeft)}>
                        {assistants.map((bot) => (
                          <div key={bot.id} onClick={() => selectAssistant(bot)} className="assistant-card flex-shrink-0 w-80 p-5 rounded-2xl border cursor-pointer bg-slate-900/30 border-white/10 hover:border-white/20 hover:bg-slate-900/50">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-slate-800/50">
                                  <Bot className="w-5 h-5 text-slate-400" />
                                </div>
                                <div><h3 className="font-semibold text-white text-base">{bot.name}</h3></div>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 mb-4 line-clamp-2">
                              {bot.workflow === 'agentic' ? 'Agentic workflow with tools' : `Assistant with ${bot.collections?.length || 0} knowledge source${bot.collections?.length !== 1 ? 's' : ''}`}
                            </p>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs">
                                <div className="p-1.5 bg-slate-800/50 rounded-lg"><Database className="w-3.5 h-3.5 text-blue-400" /></div>
                                <span className="text-slate-400">Knowledge:</span>
                                <span className="text-slate-300 font-medium">
                                  {bot.collections && bot.collections.length > 0 ? bot.collections.length === 1 ? bot.collections[0] : `${bot.collections.length} sources` : 'None'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <div className="p-1.5 bg-slate-800/50 rounded-lg"><Cpu className="w-3.5 h-3.5 text-purple-400" /></div>
                                <span className="text-slate-400">Model:</span>
                                <span className="text-slate-300 font-medium">{bot.llm || 'Not set'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {carouselRef.current && carouselScroll < (carouselRef.current.scrollWidth - carouselRef.current.clientWidth - 10) && (
                        <button onClick={() => scrollCarousel('right')} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-slate-900/90 hover:bg-slate-800 border border-white/10 rounded-2xl transition-all cursor-pointer shadow-lg">
                          <ChevronRight className="w-5 h-5 text-white" />
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No assistants available</p>
                    </div>
                  )}
                  {error && (
                    <div className="mt-4 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-2xl">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-400">{error}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl">
                      <Bot className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-white">{selectedAssistant.name}</h1>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Database className="w-3 h-3" />
                          {selectedAssistant.collections && selectedAssistant.collections.length > 0 ? selectedAssistant.collections.length === 1 ? selectedAssistant.collections[0] : `${selectedAssistant.collections.length} sources` : 'No sources'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {selectedAssistant.llm || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setSelectedAssistant(null)} className="px-4 py-2 bg-slate-900/50 hover:bg-slate-800/50 border border-white/10 hover:border-white/20 rounded-2xl transition-all cursor-pointer text-sm text-slate-300 hover:text-white">
                      Change Bot
                    </button>
                    <button onClick={handleNewChat} className="flex items-center gap-2 px-4 py-2 bg-slate-900/50 hover:bg-slate-800/50 border border-white/10 hover:border-white/20 rounded-2xl transition-all cursor-pointer text-sm text-slate-300 hover:text-white">
                      <RefreshCw className="w-4 h-4" />
                      New Chat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8" style={{ marginTop: selectedAssistant ? '90px' : '280px', marginBottom: '140px' }}>
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} message-enter`}>
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 border border-white/10 ${msg.role === 'user' ? 'bg-gradient-to-br from-blue-500 to-purple-600' : 'bg-slate-900/50 backdrop-blur-xl'}`}>
                  {msg.role === 'user' ? <span className="text-sm font-bold text-white">You</span> : <Bot className="w-5 h-5 text-blue-400" />}
                </div>
                <div className="flex-1 max-w-[80%] space-y-3">
                  <div className={`px-5 py-4 rounded-2xl ${msg.role === 'user' ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white' : 'bg-slate-900/50 backdrop-blur-xl text-slate-100 border border-white/10'}`}>
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/30 rounded-xl">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs font-medium text-slate-400">Sources</span>
                      </div>
                      {msg.sources.map((source, i) => (
                        <SmartTooltip
                          key={i}
                          source={source}
                          context={msg.contexts?.[i]}
                          index={i}
                          getSourceUrl={getSourceUrl}
                          getSourceScore={getSourceScore}
                          getSourceDomain={getSourceDomain}
                          getSourceStyle={getSourceStyle}
                          getDotColor={getDotColor}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-4 message-enter">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center border border-white/10 bg-slate-900/50 backdrop-blur-xl">
                  <Bot className="w-5 h-5 text-blue-400" />
                </div>
                <div className="bg-slate-900/50 backdrop-blur-xl px-5 py-4 rounded-2xl border border-white/10">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-10 border-t border-white/5 bg-slate-950/95 backdrop-blur-xl p-6">
          <div className="max-w-4xl mx-auto">
            <div className="gradient-border">
              <div className="gradient-border-inner p-4">
                <div className="flex items-end gap-3">
                  <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !loading) { e.preventDefault(); handleSend() }}} placeholder={selectedAssistant ? "Ask me anything..." : "Select an assistant to start..."} disabled={!selectedAssistant || loading} rows={1} className="flex-1 bg-transparent text-white placeholder:text-slate-500 focus:outline-none resize-none text-[15px] leading-relaxed max-h-32 disabled:cursor-not-allowed disabled:text-slate-600 cursor-text" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }} />
                  <button onClick={handleSend} disabled={!input.trim() || !selectedAssistant || loading} className="flex-shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-slate-800 disabled:to-slate-800 transition-all duration-200 flex items-center justify-center cursor-pointer disabled:cursor-not-allowed shadow-lg shadow-blue-500/25 disabled:shadow-none">
                    {loading ? <Loader2 className="w-5 h-5 text-slate-500 animate-spin" /> : <Send className={`w-5 h-5 ${input.trim() && selectedAssistant ? 'text-white' : 'text-slate-600'}`} />}
                  </button>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500 mt-4">AI can make mistakes. Verify important information.</p>
          </div>
        </div>
      </div>
    </div>
  )
}