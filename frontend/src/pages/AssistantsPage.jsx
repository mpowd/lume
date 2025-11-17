import { useState } from 'react'
import { Bot, Plus, X } from 'lucide-react'
import { useAssistants } from '../hooks/useAssistants'
import PageHeader from '../components/shared/PageHeader'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import AssistantGrid from '../components/assistants/AssistantGrid'
import AssistantForm from '../components/assistants/AssistantForm'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { validateAssistantForm } from '../utils/validators'

export default function AssistantsPage() {
  const { assistants, loading, error, createAssistant, updateAssistant, deleteAssistant, reload } = useAssistants()
  const [showForm, setShowForm] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    assistantId: null,
    assistantName: ''
  })

  const handleEdit = (assistant) => {
    setEditingAssistant(assistant)
    setShowForm(true)
    setFormError(null)
  }

  const handleSubmit = async (formData) => {
    const validationError = validateAssistantForm(formData)
    if (validationError) {
      setFormError(validationError)
      return
    }

    setSaving(true)
    setFormError(null)

    const result = editingAssistant
      ? await updateAssistant(editingAssistant.id, formData)
      : await createAssistant(formData)

    setSaving(false)

    if (result.success) {
      await reload()
      resetForm()
    } else {
      setFormError(result.error)
    }
  }

  const handleDelete = (id, name) => {
    setConfirmDialog({
      isOpen: true,
      assistantId: id,
      assistantName: name || 'this assistant'
    })
  }

  const confirmDelete = async () => {
    if (confirmDialog.assistantId) {
      await deleteAssistant(confirmDialog.assistantId)
    }
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({
      isOpen: false,
      assistantId: null,
      assistantName: ''
    })
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingAssistant(null)
    setFormError(null)
  }

  if (loading) {
    return <LoadingSpinner fullScreen text="Loading assistants..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        icon={Bot}
        title="Assistants"
        subtitle={`${assistants.length} active assistant${assistants.length !== 1 ? 's' : ''}`}
        actionLabel={showForm ? 'Cancel' : 'New Assistant'}
        actionIcon={showForm ? X : Plus}
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
            <AssistantForm
              assistant={editingAssistant}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              loading={saving}
            />
          </div>
        )}

        {/* Only show the grid when not showing the form */}
        {!showForm && (
          <AssistantGrid
            assistants={assistants}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={closeConfirmDialog}
        onConfirm={confirmDelete}
        title="Delete Assistant"
        message={`Are you sure you want to delete "${confirmDialog.assistantName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}