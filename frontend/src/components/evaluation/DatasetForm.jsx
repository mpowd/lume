import { useState } from 'react'
import { Edit3, Plus, Check, Zap, ArrowLeft } from 'lucide-react'
import FormInput from '../shared/FormInput'
import Button from '../shared/Button'
import Card from '../shared/Card'
import QAPairInput from './QAPairInput'

export default function DatasetForm({ 
  collectionName,
  type = 'manual', // 'manual' or 'auto'
  onSubmit, 
  onBack, 
  loading 
}) {
  const [datasetName, setDatasetName] = useState('')
  const [qaPairs, setQaPairs] = useState([{ question: '', ground_truth: '', source_doc: '' }])
  const [testsetSize, setTestsetSize] = useState(10)

  const handleManualSubmit = (e) => {
    e.preventDefault()
    const validPairs = qaPairs.filter(pair => 
      pair.question.trim() && pair.ground_truth.trim()
    )
    
    if (validPairs.length === 0) {
      alert('Please add at least one question-answer pair')
      return
    }

    onSubmit({
      dataset_name: datasetName,
      qa_pairs: validPairs,
      source_collection: collectionName
    })
  }

  const handleAutoSubmit = (e) => {
    e.preventDefault()
    onSubmit(collectionName, datasetName, testsetSize)
  }

  const addQaPair = () => {
    setQaPairs([...qaPairs, { question: '', ground_truth: '', source_doc: '' }])
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
      <Button variant="ghost" onClick={onBack} icon={ArrowLeft} className="mb-8">
        Back to Menu
      </Button>

      <Card className="p-8">
        <div className="flex items-center gap-3 mb-8">
          <div className={`p-3 ${type === 'manual' ? 'bg-blue-500/10' : 'bg-purple-500/10'} rounded-xl`}>
            {type === 'manual' ? (
              <Edit3 className="w-6 h-6 text-blue-400" />
            ) : (
              <Zap className="w-6 h-6 text-purple-400" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {type === 'manual' ? 'Craft Dataset' : 'AI Generate Dataset'}
            </h2>
            <p className="text-slate-400 mt-1">for {collectionName}</p>
          </div>
        </div>

        {type === 'manual' ? (
          <form onSubmit={handleManualSubmit} className="space-y-6">
            <FormInput
              label="Dataset Name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="my-evaluation-dataset"
              required
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Question-Answer Pairs</h3>
                <Button type="button" variant="secondary" size="sm" onClick={addQaPair} icon={Plus}>
                  Add Pair
                </Button>
              </div>

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

            <Button type="submit" variant="primary" loading={loading} fullWidth icon={Check} size="lg">
              Create Dataset
            </Button>
          </form>
        ) : (
          <form onSubmit={handleAutoSubmit} className="space-y-6">
            <FormInput
              label="Dataset Name"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              placeholder="auto-generated-dataset"
              required
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Number of Questions
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="5"
                  value={testsetSize}
                  onChange={(e) => setTestsetSize(parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-3xl font-bold text-purple-400 w-16 text-right">
                  {testsetSize}
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Quick</span>
                <span>Comprehensive</span>
              </div>
            </div>

            <Button type="submit" variant="primary" loading={loading} fullWidth icon={Zap} size="lg">
              Generate Dataset
            </Button>
          </form>
        )}
      </Card>
    </div>
  )
}