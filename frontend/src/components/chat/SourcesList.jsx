import { Sparkles } from 'lucide-react'
import SmartTooltip from '../SmartTooltip'
import { 
  getSourceDomain, 
  getSourceUrl, 
  getSourceScore, 
  getSourceStyle, 
  getDotColor
} from '../../utils/formatters'

export default function SourcesList({ sources, contexts }) {

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-transparent border border-white/5 rounded-lg">
        <Sparkles className="w-3 h-3 text-brand-teal" />
        <span className="text-[11px] font-medium text-text-quaternary">Sources</span>
      </div>

      {sources.map((source, i) => {
        return (
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
        )
      })}
    </div>
  )
}