import { useState } from 'react'
import { MessageSquare, Bot, RefreshCw, Database, Cpu } from 'lucide-react'
import { useListAssistants } from '../api/generated'
import { sendMessageStream } from '../api/streaming'
import AssistantSelector from '../components/chat/AssistantSelector'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import Button from '../components/shared/Button'

export default function ChatPage() {
  const { data: assistants = [], isLoading, error } = useListAssistants({ type: 'qa' })
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(null)

  const getOpeningMessage = (bot) =>
    bot.config.opening_message || `Hi! I'm ${bot.name}. How can I help you today?`

  const handleSelectAssistant = (bot) => {
    setSelectedAssistant(bot)
    setMessages([{ role: 'assistant', content: getOpeningMessage(bot) }])
  }

  const handleSendMessage = async (input) => {
    if (!selectedAssistant) return

    setMessages(prev => [...prev, { role: 'user', content: input }])
    setLoading(true)

    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])
    setStreamingMessageIndex(assistantMessageIndex)

    sendMessageStream(selectedAssistant.id, input, {
      onToken: (token) => {
        setMessages(prev => {
          const next = [...prev]
          next[assistantMessageIndex] = {
            ...next[assistantMessageIndex],
            content: next[assistantMessageIndex].content + token,
          }
          return next
        })
      },
      onComplete: (result) => {
        let sortedSources = result.source_urls || []
        let sortedContexts = result.contexts || []

        if (sortedSources.length > 0) {
          const indices = sortedSources
            .map((source, i) => ({ i, score: typeof source === 'string' ? 0.5 : (source.score || 0.5) }))
            .sort((a, b) => b.score - a.score)
          sortedSources = indices.map(({ i }) => sortedSources[i])
          sortedContexts = indices.map(({ i }) => sortedContexts[i] || '')
        }

        setMessages(prev => {
          const next = [...prev]
          next[assistantMessageIndex] = {
            role: 'assistant',
            content: result.response || next[assistantMessageIndex].content,
            sources: sortedSources,
            contexts: sortedContexts,
            isStreaming: false,
          }
          return next
        })
        setLoading(false)
        setStreamingMessageIndex(null)
      },
      onError: (err) => {
        setMessages(prev => {
          const next = [...prev]
          next[assistantMessageIndex] = {
            role: 'assistant',
            content: '❌ Error: ' + (err.message || 'Could not send message'),
            isStreaming: false,
          }
          return next
        })
        setLoading(false)
        setStreamingMessageIndex(null)
      },
    })
  }

  const handleNewChat = () => {
    if (selectedAssistant) {
      setMessages([{ role: 'assistant', content: getOpeningMessage(selectedAssistant) }])
    }
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading assistants..." />
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 flex flex-col">
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
                  {error && <ErrorAlert message={error.message} className="mb-4" />}
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
                          {(selectedAssistant.config.knowledge_base_ids?.length || 0) > 0
                            ? `${selectedAssistant.config.knowledge_base_ids.length} sources`
                            : 'No sources'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3" />
                          {selectedAssistant.config.llm_model || 'Not set'}
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

        <div
          className="flex-1 overflow-y-auto px-6 pb-8"
          style={{ marginTop: selectedAssistant ? '90px' : '280px', marginBottom: '120px' }}
        >
          <MessageList
            messages={messages}
            loading={loading && streamingMessageIndex === null}
            streamingIndex={streamingMessageIndex}
          />
        </div>

        <ChatInput onSend={handleSendMessage} disabled={!selectedAssistant} loading={loading} />
      </div>
    </div>
  )
}
