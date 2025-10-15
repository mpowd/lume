import { Edit3, Zap, FileText, ChevronRight } from 'lucide-react'
import { Database } from 'lucide-react'
import Badge from '../shared/Badge'

export default function ActionMenu({ 
  collectionName, 
  datasetCount,
  onCreateManual, 
  onGenerateAuto, 
  onViewDatasets 
}) {
  return (
    <div className="w-full max-w-4xl">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full mb-4">
          <Database className="w-5 h-5 text-blue-400" />
          <h1 className="text-xl font-semibold text-white">{collectionName}</h1>
        </div>
        <p className="text-slate-400">Choose an action to continue</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <button
          onClick={onCreateManual}
          className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-blue-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <div className="p-4 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl inline-flex mb-4 transition-all">
              <Edit3 className="w-8 h-8 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Craft Dataset
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              Manually create test questions
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-blue-400 absolute top-8 right-8 transition-colors" />
        </button>

        <button
          onClick={onGenerateAuto}
          className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-purple-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <div className="p-4 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl inline-flex mb-4 transition-all">
              <Zap className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
              AI Generate
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              Auto-create from knowledge base
            </p>
          </div>
          <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-purple-400 absolute top-8 right-8 transition-colors" />
        </button>

        <button
          onClick={onViewDatasets}
          className="group relative bg-gradient-to-br from-slate-900/50 to-slate-900/30 hover:from-slate-900/70 hover:to-slate-900/50 border border-white/10 hover:border-green-500/30 rounded-2xl p-8 transition-all text-left cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
          <div className="relative">
            <div className="p-4 bg-green-500/10 group-hover:bg-green-500/20 rounded-2xl inline-flex mb-4 transition-all">
              <FileText className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-green-400 transition-colors">
              View Datasets
            </h3>
            <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
              Browse and manage datasets
            </p>
            {datasetCount > 0 && (
              <Badge variant="green" className="mt-4">
                {datasetCount} available
              </Badge>
            )}
          </div>
          <ChevronRight className="w-6 h-6 text-slate-600 group-hover:text-green-400 absolute top-8 right-8 transition-colors" />
        </button>
      </div>
    </div>
  )
}