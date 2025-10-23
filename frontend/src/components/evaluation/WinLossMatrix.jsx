import Card from '../shared/Card'
import Badge from '../shared/Badge'
import { Trophy, Minus } from 'lucide-react'

export default function WinLossMatrix({ evaluations, assistants, metrics }) {
  // Calculate win/loss/tie for each pair of assistants
  const calculateWinLoss = (assistant1Id, assistant2Id) => {
    const eval1 = evaluations.find(e => e.assistant_id === assistant1Id)
    const eval2 = evaluations.find(e => e.assistant_id === assistant2Id)

    if (!eval1 || !eval2) return { wins: 0, losses: 0, ties: 0 }

    let wins = 0
    let losses = 0
    let ties = 0

    metrics.forEach(metric => {
      const score1 = eval1.metrics?.[metric.key] || 0
      const score2 = eval2.metrics?.[metric.key] || 0

      if (score1 > score2) wins++
      else if (score1 < score2) losses++
      else ties++
    })

    return { wins, losses, ties }
  }

  // Calculate overall winner
  const getOverallWins = (assistantId) => {
    let totalWins = 0
    evaluations.forEach(otherEval => {
      if (otherEval.assistant_id !== assistantId) {
        const result = calculateWinLoss(assistantId, otherEval.assistant_id)
        if (result.wins > result.losses) totalWins++
      }
    })
    return totalWins
  }

  // Sort assistants by total wins
  const sortedEvaluations = [...evaluations].sort((a, b) => {
    return getOverallWins(b.assistant_id) - getOverallWins(a.assistant_id)
  })

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-2">Win/Loss Matrix</h3>
          <p className="text-sm text-slate-400">
            Head-to-head comparison showing which assistant wins on more metrics
          </p>
        </div>

        {/* Matrix */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-slate-400 border-b border-white/10">
                  Assistant
                </th>
                {sortedEvaluations.map((evaluation) => (
                  <th
                    key={evaluation.assistant_id}
                    className="p-3 text-center text-sm font-semibold text-slate-400 border-b border-white/10 min-w-[120px]"
                  >
                    <div className="truncate">
                      {assistants[evaluation.assistant_id]?.name || 'Unknown'}
                    </div>
                  </th>
                ))}
                <th className="p-3 text-center text-sm font-semibold text-slate-400 border-b border-white/10">
                  Total Wins
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedEvaluations.map((rowEval, rowIndex) => (
                <tr
                  key={rowEval.assistant_id}
                  className={rowIndex % 2 === 0 ? 'bg-slate-950/30' : ''}
                >
                  <td className="p-3 font-medium text-white border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="truncate">
                        {assistants[rowEval.assistant_id]?.name || 'Unknown'}
                      </span>
                      {rowIndex === 0 && (
                        <Trophy className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      )}
                    </div>
                  </td>
                  {sortedEvaluations.map((colEval) => {
                    if (rowEval.assistant_id === colEval.assistant_id) {
                      return (
                        <td
                          key={colEval.assistant_id}
                          className="p-3 text-center border-b border-white/5 bg-slate-800"
                        >
                          <Minus className="w-4 h-4 text-slate-600 mx-auto" />
                        </td>
                      )
                    }

                    const result = calculateWinLoss(rowEval.assistant_id, colEval.assistant_id)
                    const isWin = result.wins > result.losses
                    const isTie = result.wins === result.losses

                    return (
                      <td
                        key={colEval.assistant_id}
                        className="p-3 text-center border-b border-white/5"
                      >
                        <div className={`inline-flex flex-col items-center gap-1 px-3 py-2 rounded-lg ${
                          isWin ? 'bg-green-500/20 text-green-400' :
                          isTie ? 'bg-slate-700 text-slate-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>
                          <div className="text-xs font-semibold">
                            {result.wins}-{result.losses}
                            {result.ties > 0 && `-${result.ties}`}
                          </div>
                          <div className="text-xs opacity-70">
                            {isWin ? 'Win' : isTie ? 'Tie' : 'Loss'}
                          </div>
                        </div>
                      </td>
                    )
                  })}
                  <td className="p-3 text-center font-bold border-b border-white/5">
                    <Badge variant={rowIndex === 0 ? 'green' : 'gray'}>
                      {getOverallWins(rowEval.assistant_id)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500/20" />
            <span className="text-slate-400">Win (more metrics better)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-slate-700" />
            <span className="text-slate-400">Tie (equal performance)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500/20" />
            <span className="text-slate-400">Loss (fewer metrics better)</span>
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <div className="text-sm text-blue-400">
            <strong>Reading the matrix:</strong> Each cell shows wins-losses-ties on the 4 metrics.
            For example, "3-1" means the row assistant won on 3 metrics and lost on 1 metric against the column assistant.
          </div>
        </div>
      </div>
    </Card>
  )
}