import { Bot } from 'lucide-react'
import AssistantCard from './AssistantCard'
import EmptyState from '../shared/EmptyState'

export default function AssistantGrid({ assistants, onEdit, onDelete }) {
  if (assistants.length === 0) {
    return (
      <EmptyState
        icon={Bot}
        title="No assistants yet"
        description="Create your first assistant to get started"
      />
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assistants.map(assistant => (
        <AssistantCard
          key={assistant.id}
          assistant={assistant}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}