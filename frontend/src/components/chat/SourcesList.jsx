import { Sparkles } from 'lucide-react'
import SmartTooltip from '../SmartTooltip'
import { getSourceDomain, getSourceUrl, getSourceScore, getSourceStyle, getDotColor } from '../../utils/formatters'

export default function SourcesList({ sources, contexts }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/30 rounded-xl">
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-xs font-medium text-slate-400">Sources</span>
      </div>

      {sources.map((source, i) => (
        <SmartTooltip
          key={i}
          source={source}
          context={contexts?.[i]}
          index={i}
          getSourceUrl={getSourceUrl}
          getSourceScore={getSourceScore}
          getSourceDomain={getSourceDomain}
          getSourceStyle={getSourceStyle}
          getDotColor={getDotColor}
        />
      ))}
    </div>
  )
}