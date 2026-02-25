import { useState, useCallback, useRef, useEffect } from 'react'
import { MessageSquare, Bot, Database, Cpu, Plus, ChevronDown, Brain, BrainCircuit, History, X, Check } from 'lucide-react'
import { useListAssistants } from '../api/generated'
import { sendMessageStream } from '../api/streaming'
import AssistantSelector from '../components/chat/AssistantSelector'
import MessageList from '../components/chat/MessageList'
import ChatInput from '../components/chat/ChatInput'
import ConversationSidebar from '../components/chat/ConversationSidebar'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'

function makeSessionId(assistantId) {
  return `${assistantId}-${Date.now()}`
}

// ── Assistant switcher popover ────────────────────────────────────────────────
function AssistantSwitcher({ current, assistants, onSelect }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          group flex items-center gap-2.5 px-3 py-2 rounded-xl
          border transition-all duration-150
          ${open
            ? 'border-brand-teal/40 bg-brand-teal/8'
            : 'border-transparent hover:border-border-subtle hover:bg-white/4'
          }
        `}
      >
        <div className="w-7 h-7 rounded-lg bg-brand-teal/15 border border-brand-teal/25 flex items-center justify-center flex-shrink-0">
          <Bot className="w-3.5 h-3.5 text-brand-teal" />
        </div>
        <div className="text-left">
          <div className="flex items-center gap-1.5">
            <span className="text-[14px] font-semibold text-text-primary leading-none">
              {current.name}
            </span>
            <ChevronDown className={`w-3 h-3 text-text-quaternary transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] text-text-disabled flex items-center gap-1">
              <Cpu className="w-2.5 h-2.5" />
              {current.config.llm_model || 'No model'}
            </span>
            {(current.config.knowledge_base_ids?.length || 0) > 0 && (
              <>
                <span className="text-text-disabled text-[10px]">·</span>
                <span className="text-[11px] text-text-disabled flex items-center gap-1">
                  <Database className="w-2.5 h-2.5" />
                  {current.config.knowledge_base_ids.length} sources
                </span>
              </>
            )}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 z-50 rounded-2xl border border-border-subtle bg-background-elevated/98 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-border-subtle">
            <p className="text-[11px] font-medium text-text-disabled uppercase tracking-wider">Switch assistant</p>
          </div>
          <div className="p-1.5 max-h-72 overflow-y-auto">
            {assistants.map(bot => (
              <button
                key={bot.id}
                onClick={() => { onSelect(bot); setOpen(false) }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left
                  transition-all duration-100
                  ${bot.id === current.id
                    ? 'bg-brand-teal/10 text-brand-teal'
                    : 'hover:bg-white/5 text-text-secondary'
                  }
                `}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bot.id === current.id ? 'bg-brand-teal/20 border border-brand-teal/30' : 'bg-white/5 border border-white/10'}`}>
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium truncate">{bot.name}</p>
                  <p className="text-[11px] text-text-disabled truncate">{bot.config.llm_model || 'No model'}</p>
                </div>
                {bot.id === current.id && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Overflow menu (···) ───────────────────────────────────────────────────────
function OverflowMenu({ memoryEnabled, onMemoryToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`
          w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150
          ${open ? 'border-border-strong bg-white/8' : 'border-border-subtle hover:border-border-default hover:bg-white/4'}
          text-text-quaternary hover:text-text-tertiary
        `}
      >
        <span className="text-[15px] leading-none tracking-widest">···</span>
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-52 z-50 rounded-2xl border border-border-subtle bg-background-elevated/98 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
          <div className="p-1.5">
            <button
              onClick={() => { onMemoryToggle(!memoryEnabled); setOpen(false) }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-left"
            >
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${memoryEnabled ? 'bg-brand-teal/15 border border-brand-teal/25' : 'bg-white/5 border border-white/10'}`}>
                {memoryEnabled
                  ? <Brain className="w-3.5 h-3.5 text-brand-teal" />
                  : <BrainCircuit className="w-3.5 h-3.5 text-text-disabled" />
                }
              </div>
              <div>
                <p className={`text-[13px] font-medium ${memoryEnabled ? 'text-brand-teal' : 'text-text-secondary'}`}>
                  {memoryEnabled ? 'Memory on' : 'Memory off'}
                </p>
                <p className="text-[11px] text-text-disabled">
                  {memoryEnabled ? 'Remembers context' : 'Each message is fresh'}
                </p>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── History overlay (slides in from left, over the nav) ───────────────────────
function HistoryPanel({ open, onClose, assistantId, activeSessionId, onSelectConversation, onNewChat, pendingTitle }) {
  return (
    <div
      className={`
        fixed top-0 bottom-0 z-20
        lg:left-80 left-0
        w-72 border-r border-border-subtle bg-background-elevated
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {assistantId && (
        <ConversationSidebar
          assistantId={assistantId}
          activeSessionId={activeSessionId}
          onSelectConversation={onSelectConversation}
          onNewChat={onNewChat}
          onClose={onClose}
          pendingTitle={pendingTitle}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { data: assistants = [], isLoading, error } = useListAssistants({ type: 'qa' })
  const [selectedAssistant, setSelectedAssistant] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [streamingMessageIndex, setStreamingMessageIndex] = useState(null)
  const [memoryEnabled, setMemoryEnabled] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [pendingTitle, setPendingTitle] = useState(null)

  const getOpeningMessage = (bot) =>
    bot.config.opening_message || `Hi! I'm ${bot.name}. How can I help you today?`

  const handleSelectAssistant = (bot) => {
    setSelectedAssistant(bot)
    const sid = makeSessionId(bot.id)
    setSessionId(sid)
    setMemoryEnabled(bot.config.memory_enabled ?? false)
    setMessages([{ role: 'assistant', content: getOpeningMessage(bot) }])
    setPendingTitle(null)
  }

  const handleSelectConversation = async (conv) => {
    if (!selectedAssistant) return
    if (conv.session_id === sessionId) return
    try {
      const { getConversation } = await import('../api/generated')
      const data = await getConversation(selectedAssistant.id, conv.session_id)
      const loaded = [
        { role: 'assistant', content: getOpeningMessage(selectedAssistant) },
        ...data.messages.map(m => ({ role: m.role === 'human' ? 'user' : 'assistant', content: m.content })),
      ]
      setMessages(loaded)
      setSessionId(conv.session_id)
      setMemoryEnabled(true)
    } catch (e) {
      console.error('Failed to load conversation', e)
    }
  }

  const handleSendMessage = async (input) => {
    if (!selectedAssistant) return
    setMessages(prev => [...prev, { role: 'user', content: input }])
    setLoading(true)
    const assistantMessageIndex = messages.length + 1
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true }])
    setStreamingMessageIndex(assistantMessageIndex)

    sendMessageStream(selectedAssistant.id, input, {
      session_id: sessionId,
      memory_enabled: memoryEnabled,
      onTitle: (title, sid) => setPendingTitle({ sessionId: sid, title }),
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
      setSessionId(makeSessionId(selectedAssistant.id))
      setMessages([{ role: 'assistant', content: getOpeningMessage(selectedAssistant) }])
      setPendingTitle(null)
    }
  }

  const handleMemoryToggle = useCallback((enabled) => {
    setMemoryEnabled(enabled)
    setMessages(prev => [
      ...prev,
      {
        role: 'system',
        content: enabled
          ? 'Memory enabled — the assistant will now remember this conversation.'
          : 'Memory disabled — the assistant will no longer remember previous messages.',
      },
    ])
  }, [])

  if (isLoading) return <LoadingSpinner fullScreen text="Loading assistants..." />

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* History panel — fixed, right of nav, never overlaps it */}
      <HistoryPanel
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        assistantId={selectedAssistant?.id}
        activeSessionId={sessionId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        pendingTitle={pendingTitle}
      />

      {/* ── Main column ─────────────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${historyOpen ? 'blur-[2px] pointer-events-none select-none' : ''}`}
        style={{ marginLeft: historyOpen ? '288px' : '0' }}
      >

        {/* Header */}
        <div
          className="fixed top-0 right-0 z-10 border-b border-border-subtle bg-background-elevated/95 backdrop-blur-xl"
          style={{ left: historyOpen ? '608px' : '320px' }}
        >
          <div className="px-4 h-14 flex items-center">

            {!selectedAssistant ? (
              /* ── No assistant selected ── */
              <div className="flex items-center gap-3">
                <div className="p-2 bg-transparent border border-border-brand rounded-xl">
                  <MessageSquare className="w-5 h-5 text-brand-teal" />
                </div>
                <div>
                  <h1 className="text-[15px] font-semibold text-text-primary">Chat</h1>
                  <p className="text-[12px] text-text-tertiary">Select an assistant to start</p>
                </div>
              </div>
            ) : (
              /* ── Assistant active ── */
              <div className="flex items-center justify-between w-full">

                {/* Left: history + assistant switcher */}
                <div className="flex items-center gap-1">
                  {/* History toggle */}
                  <button
                    onClick={() => setHistoryOpen(o => !o)}
                    title="Conversation history"
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-lg border transition-all duration-150
                      ${historyOpen
                        ? 'border-brand-teal/40 bg-brand-teal/10 text-brand-teal'
                        : 'border-border-subtle hover:border-border-default hover:bg-white/4 text-text-quaternary hover:text-text-tertiary'
                      }
                    `}
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <div className="w-px h-5 bg-border-subtle mx-1" />

                  {/* Assistant name + switcher */}
                  <AssistantSwitcher
                    current={selectedAssistant}
                    assistants={assistants}
                    onSelect={handleSelectAssistant}
                  />
                </div>

                {/* Right: new chat + overflow */}
                <div className="flex items-center gap-2">
                  {/* New chat pill */}
                  <button
                    onClick={handleNewChat}
                    className="
                      flex items-center gap-1.5 pl-2.5 pr-3 h-8
                      rounded-lg border border-border-subtle
                      hover:border-border-default hover:bg-white/4
                      text-text-quaternary hover:text-text-tertiary
                      transition-all duration-150 text-[13px] font-medium
                    "
                  >
                    <Plus className="w-3.5 h-3.5" />
                    New
                  </button>

                  <OverflowMenu memoryEnabled={memoryEnabled} onMemoryToggle={handleMemoryToggle} />
                </div>
              </div>
            )}
          </div>

          {/* Assistant selector (shown below header when no assistant) */}
          {!selectedAssistant && (
            <div className="px-4 pb-4">
              {error && <ErrorAlert message={error.message} className="mb-4" />}
              {assistants.length > 0
                ? <AssistantSelector assistants={assistants} onSelect={handleSelectAssistant} />
                : <div className="py-12 text-center"><p className="text-text-tertiary">No assistants available</p></div>
              }
            </div>
          )}
        </div>

        {/* Message area */}
        <div
          className="flex-1 overflow-y-auto px-6 pb-8"
          style={{
            marginTop: selectedAssistant ? '56px' : '200px',
            marginBottom: '120px',
          }}
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