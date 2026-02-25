import { useState, useEffect } from 'react'
import {
  ArrowLeft, Plus, Trash2, Database, Hash, FileText, AlertCircle
} from 'lucide-react'
import { useCreateDataset, useUpdateDataset } from '../../api/generated'
import Button from '../shared/Button'
import Card from '../shared/Card'

// ── Empty QA pair factory ─────────────────────────────────
const emptyPair = () => ({ question: '', ground_truth: '' })

// ── Sub-component: single QA row ──────────────────────────

function QAPairRow({ pair, index, onChange, onRemove, canRemove }) {
  return (
    <div className="group relative p-4 rounded-xl border border-white/8 bg-background-elevated hover:border-white/14 transition-all duration-200">
      {/* Row header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-text-quaternary">
          #{String(index + 1).padStart(2, '0')}
        </span>
        {canRemove && (
          <button
            onClick={() => onRemove(index)}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-text-quaternary hover:text-red-400 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="space-y-2.5">
        {/* Question */}
        <div>
          <label className="block text-xs font-medium text-text-quaternary uppercase tracking-wide mb-1.5">
            Question <span className="text-red-400">*</span>
          </label>
          <textarea
            value={pair.question}
            onChange={(e) => onChange(index, 'question', e.target.value)}
            placeholder="Enter your question…"
            rows={2}
            className="w-full px-3 py-2.5 bg-background border border-white/10 rounded-lg text-white text-sm placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all resize-none leading-relaxed"
          />
        </div>

        {/* Ground truth */}
        <div>
          <label className="block text-xs font-medium text-text-quaternary uppercase tracking-wide mb-1.5">
            Expected Answer <span className="text-text-quaternary font-normal normal-case">(optional)</span>
          </label>
          <textarea
            value={pair.ground_truth}
            onChange={(e) => onChange(index, 'ground_truth', e.target.value)}
            placeholder="Expected answer for correctness scoring…"
            rows={2}
            className="w-full px-3 py-2.5 bg-background border border-white/10 rounded-lg text-text-secondary text-sm placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all resize-none leading-relaxed"
          />
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────

export default function DatasetCreator({ dataset, onSuccess, onCancel }) {
  const isEdit = !!dataset

  const [name, setName] = useState('')
  const [pairs, setPairs] = useState([emptyPair()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const { mutateAsync: createDataset } = useCreateDataset()
  const { mutateAsync: updateDataset } = useUpdateDataset()

  // Populate when editing
  useEffect(() => {
    if (dataset) {
      setName(dataset.name || dataset.dataset_name || '')
      const existingPairs = dataset.qa_pairs || []
      setPairs(existingPairs.length ? existingPairs.map((p) => ({
        question: p.question || '',
        ground_truth: p.ground_truth || '',
      })) : [emptyPair()])
    }
  }, [dataset])

  // ── Pair manipulation ─────────────────────────────────

  const handlePairChange = (idx, field, value) => {
    setPairs((prev) => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const addPair = () => setPairs((prev) => [...prev, emptyPair()])

  const removePair = (idx) =>
    setPairs((prev) => prev.filter((_, i) => i !== idx))

  // ── Validation ────────────────────────────────────────

  const validPairs = pairs.filter((p) => p.question.trim())
  const isValid = name.trim() && validPairs.length > 0

  // ── Submit ────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!isValid) return
    setError(null)
    setSaving(true)
    try {
      const payload = validPairs.map((p) => ({
        question: p.question.trim(),
        ground_truth: p.ground_truth.trim() || null,
      }))

      if (isEdit) {
        const id = dataset._id || dataset.id
        await updateDataset({
          datasetId: id,
          data: { name: name.trim(), qa_pairs: payload },
        })
      } else {
        await createDataset({
          data: { dataset_name: name.trim(), qa_pairs: payload },
        })
      }
      onSuccess()
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to save dataset')
    } finally {
      setSaving(false)
    }
  }

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + title */}
      <div className="flex items-center gap-4">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-sm text-text-tertiary hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-brand-teal/10 border border-brand-teal/20">
            <Database className="w-4 h-4 text-brand-teal" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              {isEdit ? 'Edit Dataset' : 'New QA Dataset'}
            </h2>
            <p className="text-xs text-text-tertiary mt-0.5">
              Question–answer pairs used for evaluation runs
            </p>
          </div>
        </div>
      </div>

      {/* Dataset name */}
      <Card className="p-6">
        <label className="block text-sm font-medium text-text-secondary mb-2">
          Dataset Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Product FAQ — v1"
          className="w-full px-4 py-2.5 bg-transparent border border-white/10 rounded-xl text-white text-sm placeholder:text-text-quaternary focus:outline-none focus:border-brand-teal/50 hover:border-white/20 transition-all"
        />
      </Card>

      {/* QA pairs */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-text-tertiary" />
              <span className="text-sm font-medium text-text-secondary">Q&amp;A Pairs</span>
            </div>
            <span className="px-2 py-0.5 rounded-md text-xs bg-background-elevated text-text-quaternary border border-white/8">
              {validPairs.length} valid
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-quaternary">
            <Hash className="w-3.5 h-3.5" />
            {pairs.length} total
          </div>
        </div>

        <div className="space-y-3">
          {pairs.map((pair, i) => (
            <QAPairRow
              key={i}
              pair={pair}
              index={i}
              onChange={handlePairChange}
              onRemove={removePair}
              canRemove={pairs.length > 1}
            />
          ))}
        </div>

        {/* Add pair button */}
        <button
          onClick={addPair}
          className="mt-4 w-full py-3 flex items-center justify-center gap-2 text-sm text-text-tertiary hover:text-brand-teal border border-dashed border-white/10 hover:border-brand-teal/30 rounded-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Add Q&amp;A pair
        </button>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-red-500/8 border border-red-500/20">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={saving}
          disabled={!isValid}
        >
          {isEdit ? 'Save Changes' : 'Create Dataset'}
        </Button>
      </div>
    </div>
  )
}