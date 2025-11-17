import { useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { SOURCE_TYPES } from '../../constants/sourceTypes'
import { EMBEDDING_MODELS, DISTANCE_METRICS } from '../../constants/models'
import Modal from '../shared/Modal'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'
import FormSelect from '../shared/FormSelect'
import Button from '../shared/Button'
import Accordion from '../shared/Accordion'

export default function CollectionForm({ isOpen, onClose, onSubmit, loading }) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [formData, setFormData] = useState({
    collection_name: '',
    description: '',
    source_type: 'website',
    embedding_model: 'jina/jina-embeddings-v2-base-de',
    chunk_size: 1000,
    chunk_overlap: 100,
    distance_metric: 'Cosine similarity'
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleClose = () => {
    setFormData({
      collection_name: '',
      description: '',
      source_type: 'website',
      embedding_model: 'jina/jina-embeddings-v2-base-de',
      chunk_size: 1000,
      chunk_overlap: 100,
      distance_metric: 'Cosine similarity'
    })
    setShowAdvanced(false)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Collection" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormInput
          label="Collection Name"
          value={formData.collection_name}
          onChange={(e) => setFormData({...formData, collection_name: e.target.value})}
          placeholder="my-knowledge-base"
          required
        />

        <FormTextarea
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData({...formData, description: e.target.value})}
          placeholder="Describe what this collection contains..."
          rows={3}
        />

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Source Type</label>
          <div className="grid grid-cols-2 gap-3">
            {SOURCE_TYPES.map(type => {
              const Icon = type.icon
              const isSelected = formData.source_type === type.id
              return (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => type.implemented && setFormData({...formData, source_type: type.id})}
                  disabled={!type.implemented}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-white/5 border-white/20'
                      : type.implemented
                      ? 'bg-slate-800/30 border-white/5 hover:border-white/10 hover:bg-slate-800/50 cursor-pointer'
                      : 'bg-slate-800/20 border-white/5 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${
                      isSelected ? 'text-white' : 'text-slate-400'
                    }`} />
                    <span className={`text-sm font-medium ${
                      isSelected ? 'text-white' : 'text-slate-300'
                    }`}>
                      {type.label}
                    </span>
                  </div>
                  {!type.implemented && (
                    <span className="text-xs text-slate-500">Coming Soon</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Accordion
          title="Advanced Settings"
          isOpen={showAdvanced}
          onToggle={() => setShowAdvanced(!showAdvanced)}
        >
          <div className="space-y-4">
            <FormSelect
              label="Embedding Model"
              value={formData.embedding_model}
              onChange={(e) => setFormData({...formData, embedding_model: e.target.value})}
              options={EMBEDDING_MODELS}
            />

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Chunk Size: {formData.chunk_size} characters
              </label>
              <input
                type="range"
                min="500"
                max="2000"
                step="100"
                value={formData.chunk_size}
                onChange={(e) => setFormData({...formData, chunk_size: parseInt(e.target.value)})}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>500</span>
                <span>2000</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Chunk Overlap: {formData.chunk_overlap} characters
              </label>
              <input
                type="range"
                min="0"
                max="500"
                step="50"
                value={formData.chunk_overlap}
                onChange={(e) => setFormData({...formData, chunk_overlap: parseInt(e.target.value)})}
                className="w-full cursor-pointer"
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>0</span>
                <span>500</span>
              </div>
            </div>

            <FormSelect
              label="Distance Metric"
              value={formData.distance_metric}
              onChange={(e) => setFormData({...formData, distance_metric: e.target.value})}
              options={DISTANCE_METRICS}
            />
          </div>
        </Accordion>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose} fullWidth>
            Cancel
          </Button>
          <Button 
            type="submit" 
            variant="primary" 
            loading={loading} 
            fullWidth 
            icon={Check}
            disabled={loading || !formData.collection_name.trim()}
          >
            Create
          </Button>
        </div>
      </form>
    </Modal>
  )
}