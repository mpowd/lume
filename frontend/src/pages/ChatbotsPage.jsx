import { useState } from 'react'
import { Bot, Plus } from 'lucide-react'
import { useChatbots } from '../hooks/useChatbots'
import PageHeader from '../components/shared/PageHeader'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import ChatbotGrid from '../components/chatbots/ChatbotGrid'
import ChatbotForm from '../components/chatbots/ChatbotForm'
import { validateChatbotForm } from '../utils/validators'

export default function ChatbotsPage() {
  const { chatbots, loading, error, createChatbot, updateChatbot, deleteChatbot } = useChatbots()
  const [showForm, setShowForm] = useState(false)
  const [editingChatbot, setEditingChatbot] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleEdit = (chatbot) => {
    setEditingChatbot(chatbot)
    setShowForm(true)
    setFormError(null)
  }

  const handleSubmit = async (formData) => {
    const validationError = validateChatbotForm(formData)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)

    const result = editingChatbot
      ? await updateChatbot(editingChatbot.id, formData)
      : await createChatbot(formData)

    setSaving(false)

    if (result.success) {
      resetForm()
    } else {
      setFormError(result.error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this chatbot?')) return
    await deleteChatbot(id)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingChatbot(null)
    setFormError(null)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading chatbots..." />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <PageHeader
        icon={Bot}
        title="Chatbots"
        subtitle={`${chatbots.length} active assistant${chatbots.length !== 1 ? 's' : ''}`}
        actionLabel={showForm ? 'Cancel' : 'New Chatbot'}
        actionIcon={Plus}
        onAction={() => {
          setShowForm(!showForm)
          if (showForm) resetForm()
        }}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorAlert message={error} onClose={() => {}} className="mb-6" />}
        {formError && <ErrorAlert message={formError} onClose={() => setFormError(null)} className="mb-6" />}

        {showForm && (
          <div className="mb-8">
            <ChatbotForm
              chatbot={editingChatbot}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              loading={saving}
            />
          </div>
        )}

        <ChatbotGrid
          chatbots={chatbots}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  )
}