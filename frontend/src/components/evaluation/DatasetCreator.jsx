import { useState, useEffect } from 'react'
import { Plus, Trash2, FileText, ArrowLeft } from 'lucide-react'
import { createDataset, updateDataset } from '../../api/generated'
import Button from '../shared/Button'
import Card from '../shared/Card'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'

const USE_CASE_TYPES = [
  { id: 'qa', name: 'Question Answering', description: 'Evaluate answer quality and relevance', enabled: true, icon: '💬', fields: ['question', 'ground_truth'] },
  { id: 'retrieval', name: 'Document Retrieval', description: 'Test document relevance and ranking', enabled: false, icon: '📄', fields: ['query', 'relevant_docs'] },
  { id: 'summarization', name: 'Summarization', description: 'Evaluate summary quality', enabled: false, icon: '📝', fields: ['document', 'reference_summary'] }
]

export default function DatasetCreator({ collections, dataset, onSuccess, onCancel }) {
  const isEditMode = !!dataset
  const [step, setStep] = useState(isEditMode ? 2 : 1)
  const [selectedUseCase, setSelectedUseCase] = useState(null)
  const [loading, setLoading] = useState(false)

  const [config, setConfig] = useState({ name: '', description: '' })
  const [qaData, setQaData] = useState([{ question: '', ground_truth: '' }])

  useEffect(() => {
    if (dataset) {
      setConfig({
        name: dataset.name || dataset.dataset_name || '',
        description: dataset.description || ''
      })
      if (dataset.qa_pairs && dataset.qa_pairs.length > 0) {
        setQaData(dataset.qa_pairs.map(pair => ({
          question: pair.question || '',
          ground_truth: pair.ground_truth || pair.answer || ''
        })))
      }
      if (dataset.use_case) {
        const useCase = USE_CASE_TYPES.find(uc => uc.id === dataset.use_case)
        setSelectedUseCase(useCase || USE_CASE_TYPES[0])
      } else {
        setSelectedUseCase(USE_CASE_TYPES[0])
      }
    }
  }, [dataset])

  const handleUseCaseSelect = (useCase) => {
    if (!useCase.enabled) return
    setSelectedUseCase(useCase)
    setConfig({ name: '', description: '' })
    setStep(2)
  }

  const addQAPair = () => setQaData([...qaData, { question: '', ground_truth: '' }])

  const removeQAPair = (index) => {
    if (qaData.length === 1) return
    setQaData(qaData.filter((_, i) => i !== index))
  }

  const updateQAPair = (index, field, value) => {
    const updated = [...qaData]
    updated[index][field] = value
    setQaData(updated)
  }

  const handleSubmit = async () => {
    if (!config.name.trim()) {
      alert('Please provide a dataset name')
      return
    }

    const validPairs = qaData.filter(pair => pair.question.trim() && pair.ground_truth.trim())
    if (validPairs.length === 0) {
      alert('Please add at least one complete Q&A pair')
      return
    }

    setLoading(true)
    try {
      if (isEditMode) {
        // Use Orval-generated function
        await updateDataset(dataset._id || dataset.id, {
          name: config.name,
          qa_pairs: validPairs,
        })
      } else {
        // Use Orval-generated function
        await createDataset({
          dataset_name: config.name,
          qa_pairs: validPairs,
        })
      }
      onSuccess()
    } catch (error) {
      alert(`Error ${isEditMode ? 'updating' : 'creating'} dataset: ` + (error.response?.data?.detail || error.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {!isEditMode && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {['Select Use Case', 'Add Data'].map((label, idx) => (
              <div key={idx} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold transition-all ${step > idx + 1 ? 'bg-brand-teal border-brand-teal text-white' : step === idx + 1 ? 'bg-white border-white text-black' : 'bg-transparent border-white/20 text-slate-500'
                  }`}>
                  {step > idx + 1 ? '✓' : idx + 1}
                </div>
                <div className="ml-3 flex-1">
                  <p className={`text-sm font-medium ${step >= idx + 1 ? 'text-white' : 'text-slate-500'}`}>{label}</p>
                </div>
                {idx < 1 && <div className={`h-0.5 flex-1 mx-4 ${step > idx + 1 ? 'bg-brand-teal' : 'bg-white/20'}`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {!isEditMode && step === 1 && (
        <Card className="p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Select Evaluation Use Case</h2>
            <p className="text-slate-400">Choose what you want to evaluate</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {USE_CASE_TYPES.map((useCase) => (
              <button key={useCase.id} onClick={() => handleUseCaseSelect(useCase)} disabled={!useCase.enabled}
                className={`p-6 rounded-xl border-2 transition-all text-left ${useCase.enabled ? 'border-white/10 hover:border-brand-teal hover:bg-slate-900/50 cursor-pointer' : 'border-white/5 opacity-40 cursor-not-allowed'}`}>
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{useCase.name}</h3>
                <p className="text-sm text-slate-400 mb-3">{useCase.description}</p>
                {!useCase.enabled && <span className="inline-block px-2 py-1 text-xs rounded-full bg-slate-800 text-slate-500">Coming Soon</span>}
              </button>
            ))}
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card className="p-8">
          <div className="mb-6">
            {!isEditMode && (
              <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
            )}
            <h2 className="text-2xl font-bold text-white mb-2">{isEditMode ? `Edit Dataset: ${config.name}` : 'Create Dataset'}</h2>
            <p className="text-slate-400">{isEditMode ? 'Update questions and ground truth answers' : 'Add dataset details and Q&A pairs'}</p>
          </div>

          <div className="space-y-4 mb-8">
            <FormInput label="Dataset Name" value={config.name} onChange={(e) => setConfig({ ...config, name: e.target.value })} placeholder="e.g., Product Support Q&A v1" required />
            <FormTextarea label="Description (Optional)" value={config.description} onChange={(e) => setConfig({ ...config, description: e.target.value })} placeholder="Describe the purpose of this evaluation dataset..." rows={3} />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Q&A Pairs</h3>
            <div className="space-y-4">
              {qaData.map((pair, index) => (
                <div key={index} className="p-6 rounded-xl bg-brand-teal/5 border border-brand-teal/20 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-400">Pair {index + 1}</span>
                    {qaData.length > 1 && (
                      <button onClick={() => removeQAPair(index)} className="p-2 hover:bg-red-500/10 rounded-lg transition-colors text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <FormTextarea label="Question" value={pair.question} onChange={(e) => updateQAPair(index, 'question', e.target.value)} placeholder="What is the refund policy?" rows={2} />
                  <FormTextarea label="Ground Truth Answer" value={pair.ground_truth} onChange={(e) => updateQAPair(index, 'ground_truth', e.target.value)} placeholder="Our refund policy allows returns within 30 days..." rows={3} />
                </div>
              ))}
            </div>
          </div>

          <Button variant="ghost" onClick={addQAPair} icon={Plus} fullWidth className="mb-6">Add Another Q&A Pair</Button>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button variant="primary" onClick={handleSubmit} loading={loading} icon={FileText}>
              {isEditMode ? 'Update Dataset' : 'Create Dataset'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
