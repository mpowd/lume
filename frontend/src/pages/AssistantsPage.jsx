import { useState } from 'react'
import { Bot, Plus } from 'lucide-react'
import { useListAssistants, useCreateAssistant, useUpdateAssistant, useDeleteAssistant, getListAssistantsQueryKey } from '../api/generated'
import { useQueryClient } from '@tanstack/react-query'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import ErrorAlert from '../components/shared/ErrorAlert'
import AssistantForm from '../components/assistants/AssistantForm'
import ConfirmDialog from '../components/shared/ConfirmDialog'
import { validateAssistantForm } from '../utils/validators'

export default function AssistantsPage() {
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAssistantsQueryKey() })

  const { data: assistants = [], isLoading, error } = useListAssistants()
  const { mutateAsync: createAssistant } = useCreateAssistant({ mutation: { onSuccess: invalidate } })
  const { mutateAsync: updateAssistant } = useUpdateAssistant({ mutation: { onSuccess: invalidate } })
  const { mutateAsync: deleteAssistant } = useDeleteAssistant({ mutation: { onSuccess: invalidate } })

  const [showForm, setShowForm] = useState(false)
  const [editingAssistant, setEditingAssistant] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState(null)
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

    try {
      const payload = {
        name: formData.assistant_name,
        description: formData.description || '',
        type: 'qa',
        config: {
          knowledge_base_ids: formData.collections || [],
          opening_message: formData.opening_message || '',
          references: formData.references || [],
          llm_model: formData.llm,
          llm_provider: formData.llm_provider,
          hybrid_search: formData.hybrid_search,
          top_k: formData.top_k,
          use_hyde: formData.hyde,
          hyde_prompt: formData.hyde_prompt,
          reranking: formData.reranking,
          reranker_provider: formData.reranker_provider,
          reranker_model: formData.reranker_model,
          top_n: formData.top_n,
          system_prompt: formData.system_prompt,
          user_prompt: formData.user_prompt,
          precise_citation: formData.precise_citation,
          precise_citation_system_prompt: formData.precise_citation_system_prompt,
          precise_citation_user_prompt: formData.precise_citation_user_prompt,
          local_only: formData.local_only,
          tools: formData.tools || [],
          max_steps: formData.max_steps,
          workflow: formData.workflow,
          agentic_system_prompt: formData.agentic_system_prompt,
        },
        created_by: 'user',
      }

      if (editingAssistant) {
        await updateAssistant({ assistantId: editingAssistant.id, data: payload })
      } else {
        await createAssistant({ data: payload })
      }
      resetForm()
    } catch (err) {
      let errorMessage = 'Failed to save assistant'
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map(e => `${e.loc.join('.')}: ${e.msg}`).join(', ')
        } else if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail
        }
      }
      setFormError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id, name) => {
    setConfirmDialog({ isOpen: true, assistantId: id, assistantName: name || 'this assistant' })
  }

  const confirmDelete = async () => {
    if (confirmDialog.assistantId) {
      try {
        await deleteAssistant({ assistantId: confirmDialog.assistantId })
      } catch (err) {
        console.error('Delete failed:', err)
      }
    }
    closeConfirmDialog()
  }

  const closeConfirmDialog = () => {
    setConfirmDialog({ isOpen: false, assistantId: null, assistantName: '' })
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingAssistant(null)
    setFormError(null)
  }

  const getAssistantDescription = (assistant) => {
    if (assistant.config.workflow === 'agentic') {
      return 'Agentic workflow with tools'
    }

    const collectionCount = assistant.config.knowledge_base_ids?.length || 0
    const referenceCount = assistant.config.references?.length || 0

    if (collectionCount === 0 && referenceCount === 0) {
      return 'General purpose assistant'
    }

    const parts = []
    if (collectionCount > 0) parts.push(`${collectionCount} knowledge source${collectionCount !== 1 ? 's' : ''}`)
    if (referenceCount > 0) parts.push(`${referenceCount} reference${referenceCount !== 1 ? 's' : ''}`)
    return parts.join(', ')
  }

  if (isLoading) {
    return <LoadingSpinner fullScreen text="Loading assistants..." />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && <ErrorAlert message={error.message} onClose={() => { }} className="mb-6" />}
        {formError && <ErrorAlert message={formError} onClose={() => setFormError(null)} className="mb-6" />}

        {showForm ? (
          <div className="mb-8">
            <AssistantForm
              assistant={editingAssistant}
              onSubmit={handleSubmit}
              onCancel={resetForm}
              loading={saving}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => { setEditingAssistant(null); setShowForm(true) }}
              className="group relative overflow-hidden bg-transparent border-2 border-dashed border-border-default hover:border-border-brand-hover rounded-2xl p-8 transition-all duration-300 hover:bg-background-elevated min-h-[200px] flex flex-col items-center justify-center"
            >
              <div className="mb-4 p-4 rounded-2xl bg-transparent border border-border-brand">
                <Plus className="w-8 h-8 text-brand-teal" strokeWidth={2.5} />
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Create Assistant</h3>
              <p className="text-sm text-text-tertiary text-center">Add a new AI assistant to your workspace</p>
            </button>

            {assistants.map((assistant) => (
              <div
                key={assistant.id}
                className="bg-background-elevated border border-border-default rounded-2xl p-6 hover:border-border-brand transition-all duration-300 min-h-[200px] flex flex-col"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-transparent border border-border-default">
                      <Bot className="w-5 h-5 text-brand-teal" />
                    </div>
                    <h3 className="font-semibold text-text-primary">{assistant.name}</h3>
                  </div>
                </div>
                <p className="text-sm text-text-tertiary mb-4 flex-1">
                  {getAssistantDescription(assistant)}
                </p>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={() => handleEdit(assistant)}
                    className="flex-1 px-3 py-2 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary text-sm rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(assistant.id, assistant.name)}
                    className="px-3 py-2 bg-danger-bg border border-danger-border hover:bg-danger text-danger hover:text-white text-sm rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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