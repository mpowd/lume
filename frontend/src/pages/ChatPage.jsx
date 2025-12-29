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
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(null)

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
    
    // Add empty assistant message that will be filled during streaming
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      isStreaming: true
    }])
    setStreamingMessageIndex(assistantMessageIndex)
    
    chatAPI.sendMessageStream(
      selectedAssistant.id,
      input,
      // onChunk - called for each token
      (token) => {
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex] = {
            ...newMessages[assistantMessageIndex],
            content: newMessages[assistantMessageIndex].content + token
          }
          return newMessages
        })
      },
      // onComplete - called when streaming finishes
      (result) => {
        let sortedSources = result.source_urls || []
        let sortedContexts = result.contexts || []
        
        if (sortedSources.length > 0) {
          const sourceIndices = sortedSources.map((source, index) => ({
            index,
            score: typeof source === 'string' ? 0.5 : (source.score || 0.5)
          }))
          
          sourceIndices.sort((a, b) => b.score - a.score)
          sortedSources = sourceIndices.map(item => sortedSources[item.index])
          sortedContexts = sourceIndices.map(item => sortedContexts[item.index] || '')
        }
        
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: result.response || newMessages[assistantMessageIndex].content,
            sources: sortedSources,
            contexts: sortedContexts,
            isStreaming: false
          }
          return newMessages
        })
        setLoading(false)
        setStreamingMessageIndex(null)
      },
      // onError - called on error
      (err) => {
        console.error('Error sending message:', err)
        setMessages(prev => {
          const newMessages = [...prev]
          newMessages[assistantMessageIndex] = {
            role: 'assistant',
            content: '❌ Error: ' + (err.message || 'Could not send message'),
            isStreaming: false
          }
          return newMessages
        })
        setLoading(false)
        setStreamingMessageIndex(null)
      }
    )
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
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 lg:left-80 z-10 border-b border-border-subtle bg-background-elevated/95 backdrop-blur-xl">
          <div className="px-6 py-4">
            <div className="max-w-6xl mx-auto">
              {!selectedAssistant ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-transparent border border-border-brand rounded-2xl">
                        <MessageSquare className="w-6 h-6 text-brand-teal" />
                      </div>
                      <div>
                        <h1 className="text-xl font-semibold text-text-primary">Chat</h1>
                        <p className="text-sm text-text-tertiary">Select an assistant to start</p>
                      </div>
                    </div>
                  </div>

                  {assistantsError && <ErrorAlert message={assistantsError} className="mb-4" />}

                  {assistants.length > 0 ? (
                    <AssistantSelector assistants={assistants} onSelect={handleSelectAssistant} />
                  ) : (
                    <div className="py-12 text-center">
                      <p className="text-text-tertiary">No assistants available</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-transparent border border-border-brand rounded-2xl">
                      <Bot className="w-5 h-5 text-brand-teal" />
                    </div>
                    <div>
                      <h1 className="text-lg font-semibold text-text-primary">{selectedAssistant.name}</h1>
                      <div className="flex items-center gap-3 text-xs text-text-tertiary">
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
                      Change Assistant
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
            marginBottom: '120px' 
          }}
        >
          <MessageList 
            messages={messages} 
            loading={loading && streamingMessageIndex === null}
            streamingIndex={streamingMessageIndex}
          />
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