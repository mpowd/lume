import { useEffect, useState, useCallback } from 'react'
import { MessageSquare, Plus, Trash2, Clock, X } from 'lucide-react'
import { useListConversations, useDeleteConversation } from '../../api/generated'

function timeAgo(dateStr) {
    if (!dateStr) return ''
    const diff = (Date.now() - new Date(dateStr)) / 1000
    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
    return new Date(dateStr).toLocaleDateString()
}

function ConversationItem({ conv, isActive, onSelect, onDelete }) {
    const [hovered, setHovered] = useState(false)

    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onClick={() => onSelect(conv)}
            className={`
        group relative flex items-start gap-3 px-3 py-3 rounded-xl cursor-pointer
        transition-all duration-150 select-none
        ${isActive
                    ? 'bg-brand-teal/10 border border-brand-teal/20'
                    : 'hover:bg-white/5 border border-transparent'
                }
      `}
        >
            <div className={`mt-0.5 flex-shrink-0 p-1.5 rounded-lg border ${isActive ? 'border-brand-teal/30 text-brand-teal' : 'border-white/10 text-text-quaternary'}`}>
                <MessageSquare className="w-3 h-3" />
            </div>

            <div className="flex-1 min-w-0">
                <p className={`text-[13px] font-medium truncate leading-snug ${isActive ? 'text-brand-teal' : 'text-text-secondary'}`}>
                    {conv.title || 'New conversation'}
                </p>
                {conv.last_message && (
                    <p className="text-[11px] text-text-quaternary truncate mt-0.5 leading-snug">
                        {conv.last_message}
                    </p>
                )}
                <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-2.5 h-2.5 text-text-disabled" />
                    <span className="text-[10px] text-text-disabled">{timeAgo(conv.updated_at)}</span>
                </div>
            </div>

            {hovered && (
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(conv.session_id) }}
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-text-disabled hover:text-danger transition-colors"
                    title="Delete conversation"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}
        </div>
    )
}

export default function ConversationSidebar({
    assistantId,
    activeSessionId,
    onSelectConversation,
    onNewChat,
    onClose,
    pendingTitle,
}) {
    // Use generated Orval hook — auto-refetches when assistantId changes
    const { data: fetchedConversations = [], isLoading, refetch } = useListConversations(
        assistantId,
        { limit: 50 },
        { query: { enabled: !!assistantId } }
    )

    const { mutate: deleteConversationMutation } = useDeleteConversation()

    // Local state so we can apply optimistic updates (new session placeholder + title patch)
    const [conversations, setConversations] = useState([])

    // Sync from server data
    useEffect(() => {
        setConversations(fetchedConversations)
    }, [fetchedConversations])

    // When a new session starts, prepend a placeholder immediately
    useEffect(() => {
        if (!activeSessionId) return
        setConversations(prev => {
            const exists = prev.some(c => c.session_id === activeSessionId)
            if (exists) return prev
            return [
                {
                    session_id: activeSessionId,
                    title: null,
                    updated_at: new Date().toISOString(),
                    last_message: '',
                },
                ...prev,
            ]
        })
    }, [activeSessionId])

    // Apply title pushed from parent after first LLM exchange
    useEffect(() => {
        if (!pendingTitle) return
        setConversations(prev =>
            prev.map(c =>
                c.session_id === pendingTitle.sessionId
                    ? { ...c, title: pendingTitle.title }
                    : c
            )
        )
    }, [pendingTitle])

    const handleDelete = (sessionId) => {
        // Optimistic remove
        setConversations(prev => prev.filter(c => c.session_id !== sessionId))
        deleteConversationMutation(
            { assistantId, sessionId },
            { onError: () => refetch() }  // roll back on error
        )
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border-subtle flex-shrink-0">
                <div>
                    <h2 className="text-sm font-semibold text-text-primary">History</h2>
                    <p className="text-[11px] text-text-quaternary mt-0.5">
                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={onNewChat}
                        title="New conversation"
                        className="p-1.5 rounded-lg border border-border-default hover:border-border-brand hover:bg-brand-teal/5 text-text-quaternary hover:text-brand-teal transition-all"
                    >
                        <Plus className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-text-disabled hover:text-text-tertiary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                {isLoading && conversations.length === 0 && (
                    <div className="py-8 text-center">
                        <p className="text-[12px] text-text-disabled">Loading...</p>
                    </div>
                )}

                {!isLoading && conversations.length === 0 && (
                    <div className="py-12 text-center px-4">
                        <div className="w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center mx-auto mb-3">
                            <MessageSquare className="w-4 h-4 text-text-disabled" />
                        </div>
                        <p className="text-[12px] text-text-disabled leading-relaxed">
                            No conversations yet.<br />Start chatting to see history here.
                        </p>
                    </div>
                )}

                {conversations.map(conv => (
                    <ConversationItem
                        key={conv.session_id}
                        conv={conv}
                        isActive={conv.session_id === activeSessionId}
                        onSelect={onSelectConversation}
                        onDelete={handleDelete}
                    />
                ))}
            </div>
        </div>
    )
}