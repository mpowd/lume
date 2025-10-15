import { Trash2 } from 'lucide-react'
import FormInput from '../shared/FormInput'
import FormTextarea from '../shared/FormTextarea'

export default function QAPairInput({ 
  pair, 
  index, 
  onChange, 
  onRemove, 
  canRemove 
}) {
  return (
    <div className="p-6 bg-slate-950/30 border border-white/5 rounded-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">Pair #{index + 1}</span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <FormTextarea
          label="Question"
          value={pair.question}
          onChange={(e) => onChange(index, 'question', e.target.value)}
          rows={3}
        />
        <FormTextarea
          label="Ground Truth"
          value={pair.ground_truth || pair.answer || ''}
          onChange={(e) => onChange(index, 'ground_truth', e.target.value)}
          rows={3}
        />
      </div>

      <FormInput
        label="Source (Optional)"
        value={pair.source_doc || ''}
        onChange={(e) => onChange(index, 'source_doc', e.target.value)}
      />
    </div>
  )
}