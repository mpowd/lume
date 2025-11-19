import { useState } from 'react'
import { FileText, Search, ChevronRight, Calendar, Hash, BarChart3 } from 'lucide-react'
import Card from '../shared/Card'
import SearchInput from '../shared/SearchInput'
import Badge from '../shared/Badge'
import EmptyState from '../shared/EmptyState'

export default function DatasetSelector({ datasets, selectedDataset, onSelect, evaluations }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hoveredDataset, setHoveredDataset] = useState(null)

  // Get evaluation count for each dataset
  const getEvaluationCount = (datasetName) => {
    return evaluations.filter(e => e.dataset_name === datasetName).length
  }

  // Filter datasets
  const filteredDatasets = datasets.filter(dataset => {
    const searchLower = searchQuery.toLowerCase()
    const name = (dataset.name || '').toLowerCase()
    const description = (dataset.description || '').toLowerCase()
    return name.includes(searchLower) || description.includes(searchLower)
  })

  // Only show datasets that have evaluations
  const datasetsWithEvaluations = filteredDatasets.filter(
    dataset => getEvaluationCount(dataset.name) > 0
  )

  if (datasetsWithEvaluations.length === 0 && searchQuery === '') {
    return (
      <Card>
        <div className="p-16">
          <EmptyState
            icon={BarChart3}
            title="No Evaluated Datasets"
            description="Run evaluations on your datasets first to see comparison visualizations"
          />
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-2">Select a Dataset</h2>
          <p className="text-slate-400 mb-6">
            Choose which evaluation dataset you want to analyze
          </p>

          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets..."
          />
        </div>
      </Card>

      {datasetsWithEvaluations.length === 0 ? (
        <Card>
          <div className="p-16">
            <EmptyState
              icon={Search}
              title="No datasets found"
              description="Try adjusting your search terms"
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {datasetsWithEvaluations.map((dataset) => {
            const evalCount = getEvaluationCount(dataset.name)
            const isSelected = selectedDataset?._id === dataset._id
            const isHovered = hoveredDataset === dataset._id

            return (
              <Card
                key={dataset._id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-brand-teal shadow-lg shadow-brand-teal/20'
                    : isHovered ? 'border-white/30 shadow-lg' : ''
                }`}
                onMouseEnter={() => setHoveredDataset(dataset._id)}
                onMouseLeave={() => setHoveredDataset(null)}
                onClick={() => onSelect(dataset)}
              >
                <div className="p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-brand-teal border-brand-teal'
                        : 'bg-white/10 border-white/20'
                    }`}>
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-brand-teal flex items-center justify-center">
                        <ChevronRight className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Title */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors line-clamp-1">
                      {dataset.name}
                    </h3>
                    {dataset.description && (
                      <p className="text-sm text-slate-400 line-clamp-2">
                        {dataset.description}
                      </p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      <span>{dataset.qa_pairs?.length || 0} questions</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1.5">
                      <BarChart3 className="w-3.5 h-3.5 text-brand-teal" />
                      <span className="text-brand-teal font-medium">{evalCount} evaluations</span>
                    </div>
                  </div>

                  {dataset.generated_at && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-white/5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Created {new Date(dataset.generated_at).toLocaleDateString()}</span>
                    </div>
                  )}

                  {/* Preview on hover */}
                  {isHovered && dataset.qa_pairs && dataset.qa_pairs.length > 0 && (
                    <div className="pt-3 border-t border-white/10 space-y-2">
                      <div className="text-xs font-semibold text-slate-400 uppercase">
                        Sample Question
                      </div>
                      <p className="text-sm text-slate-300 line-clamp-2">
                        {dataset.qa_pairs[0].question}
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}