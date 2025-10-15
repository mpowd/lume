import { Edit3, Plus, Check, ArrowLeft } from 'lucide-react'
import Button from '../shared/Button'
import Card from '../shared/Card'
import QAPairInput from './QAPairInput'

export default function DatasetEditor({ 
  dataset, 
  onSave, 
  onCancel, 
  loading 
}) {
  const [qaPairs, setQaPairs] = dataset.qa_pairs

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({ qa_pairs: qaPairs })
  }

  const addQaPair = () => {
    const updated = [...qaPairs, { question: '', ground_truth: '', source_doc: '' }]
    setQaPairs(updated)
  }

  const updateQaPair = (index, field, value) => {
    const updated = [...qaPairs]
    updated[index][field] = value
    setQaPairs(updated)
  }

  const removeQaPair = (index) => {
    if (qaPairs.length > 1) {
      setQaPairs(qaPairs.filter((_, i) => i !== index))
    }
  }

  return (
    <div className="w-full max-w-5xl">
      <Button variant="ghost" onClick={onCancel} icon={ArrowLeft} className="mb-8">
        Cancel Editing
      </Button>

      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Edit3 className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Edit Dataset</h2>
            <p className="text-slate-400 mt-1">{dataset.name}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Question-Answer Pairs</h3>
              <Button type="button" variant="secondary" size="sm" onClick={addQaPair} icon={Plus}>
                Add Pair
              </Button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {qaPairs.map((pair, index) => (
                <QAPairInput
                  key={index}
                  pair={pair}
                  index={index}
                  onChange={updateQaPair}
                  onRemove={() => removeQaPair(index)}
                  canRemove={qaPairs.length > 1}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={onCancel} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading} fullWidth icon={Check}>
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}