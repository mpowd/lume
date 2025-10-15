import { Bot } from 'lucide-react'
import ChatbotCard from './ChatbotCard'
import EmptyState from '../shared/EmptyState'

export default function ChatbotGrid({ chatbots, onEdit, onDelete }) {
  if (chatbots.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No chatbots yet"
        description="Create your first assistant to get started"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {chatbots.map(chatbot => (
        <ChatbotCard
          key={chatbot.id}
          chatbot={chatbot}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}