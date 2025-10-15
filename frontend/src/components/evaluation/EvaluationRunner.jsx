import { PlayCircle, Brain, Loader2 } from 'lucide-react'
import { useEvaluation } from '../../hooks/useEvaluation'
import Button from '../shared/Button'
import Card from '../shared/Card'
import ProgressBar from '../shared/ProgressBar'

export default function EvaluationRunner({ 
  dataset, 
  chatbots, 
  selectedChatbots, 
  onToggle, 
  onComplete 
}) {
  const { evaluating, evalProgress, evaluateChatbots } = useEvaluation()

  const handleEvaluate = async () => {
    if (selectedChatbots.length === 0) {
      alert('Please select at least one chatbot')
      return
    }

    const result = await evaluateChatbots(dataset, selectedChatbots)
    if (result.success) {
      alert(`Successfully evaluated ${result.count} chatbot(s)!`)
      onComplete()
    }
  }

  return (
    <Card className="p-8">
      <h3 className="text-xl font-semibold text-white mb-6">Evaluate Assistants</h3>
      
      <div className="space-y-6">
        <div>
          <p className="text-sm text-slate-400 mb-4">Select assistants to evaluate with this dataset</p>
          <div className="grid grid-cols-2 gap-3">
            {chatbots.map(bot => (
              <label
                key={bot.id}
                className="flex items-center gap-3 p-4 bg-slate-950/30 border border-white/5 hover:border-white/10 rounded-xl transition-all group cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedChatbots.includes(bot.id)}
                  onChange={() => onToggle(bot.id)}
                  className="w-5 h-5 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                />
                <Brain className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
                <div className="flex-1">
                  <div className="text-white font-medium group-hover:text-blue-400 transition-colors">{bot.name}</div>
                  <div className="text-sm text-slate-500">{bot.llm}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {evaluating && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <span className="text-white font-semibold">
                  Evaluating {selectedChatbots.length} assistant(s)...
                </span>
              </div>
              <span className="text-2xl font-bold text-blue-400">{evalProgress}%</span>
            </div>
            <ProgressBar current={evalProgress} total={100} showPercentage={false} />
          </div>
        )}

        <Button
          variant="success"
          onClick={handleEvaluate}
          disabled={evaluating || selectedChatbots.length === 0}
          icon={evaluating ? Loader2 : PlayCircle}
          fullWidth
          size="lg"
        >
          {evaluating ? 'Evaluating...' : `Run Evaluation (${selectedChatbots.length} assistant${selectedChatbots.length !== 1 ? 's' : ''})`}
        </Button>
      </div>
    </Card>
  )
}