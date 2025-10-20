import { useState } from 'react'
import { MessageSquare, Bot, RefreshCw, Database, Cpu } from 'lucide-react'
import { useAssistants } from '../hooks/useAssistants'
import { chatAPI } from '../services/api'
import AssistantSelector from '../components/chat/AssistantSelector'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import Button from '../components/shared/Button'

export default function ChatPage() {
  const { assistants, loading: loadingAssistants, error: assistantsError } = useAssistants()
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! Ask me anything.' }])
  const [loading, setLoading] = useState(false)

  const handleSelectAssistant = (bot) => {
    setSelectedAssistant(bot)
    setMessages([{ 
      role: 'assistant', 
      content: `Hi! I'm ${bot.name}. How can I help you today?` 
    }])
  }

  const handleSendMessage = async (input) => {
    const userMessage = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setLoading(true)
    
    try {
      const response = await chatAPI.sendMessage(
        selectedAssistant.id,
        input,
        messages
      )
      
      let sortedSources = response.source_urls || []
      let sortedContexts = response.contexts || []
      
      if (sortedSources.length > 0) {
        const sourceIndices = sortedSources.map((source, index) => ({
          index,
          score: typeof source === 'string' ? 0.5 : (source.score || 0.5)
        }))
        
        sourceIndices.sort((a, b) => b.score - a.score)
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

  if (loadingAssistants) {
    return <LoadingSpinner fullScreen text="Loading assistants..." />
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="flex-1 flex flex-col">
        {/* Header */}
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
                        <p className="text-sm text-slate-400">Select a assistant to start</p>
                      </div>
                    </div>
                  </div>

                  {assistantsError && <ErrorAlert message={assistantsError} className="mb-4" />}

                  {assistants.length > 0 ? (
                    <AssistantSelector assistants={assistants} onSelect={handleSelectAssistant} />
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-slate-400">No assistants available</p>
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
                          {selectedAssistant.collections?.length > 0 
                            ? `${selectedAssistant.collections.length} sources` 
                            : 'No sources'}
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
                    <Button variant="secondary" onClick={() => setSelectedAssistant(null)}>
                      Change Bot
                    </Button>
                    <Button variant="secondary" icon={RefreshCw} onClick={handleNewChat}>
                      New Chat
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div 
          className="flex-1 overflow-y-auto px-6 pb-8" 
          style={{ 
            marginTop: selectedAssistant ? '90px' : '280px', 
            marginBottom: '140px' 
          }}
        >
          <MessageList messages={messages} loading={loading} />
        </div>

        {/* Input */}
        <ChatInput 
          onSend={handleSendMessage}
          disabled={!selectedAssistant}
          loading={loading}
        />
      </div>
    </div>
  )
}