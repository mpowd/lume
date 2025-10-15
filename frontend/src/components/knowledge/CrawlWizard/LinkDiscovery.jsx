import { Loader2 } from 'lucide-react'
import Card from '../../shared/Card'

export default function LinkDiscovery() {
  return (
    <Card className="p-12 backdrop-blur-xl">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse" />
          <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center">
            <Loader2 className="w-10 h-10 text-blue-400 animate-spin" />
          </div>
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-2">Fetching Links...</h3>
        <p className="text-slate-400">This may take a few moments</p>
      </div>
    </Card>
  )
}