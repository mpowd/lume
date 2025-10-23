import { useState } from 'react'
import { Bot, Check, ArrowLeft, AlertCircle, CheckCircle2, Search } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import SearchInput from '../shared/SearchInput'
import EmptyState from '../shared/EmptyState'

export default function AssistantMultiSelector({
  dataset,
  assistants,
  evaluations,
  selectedAssistants,
  onSelect,
  onBack
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const [tempSelected, setTempSelected] = useState(selectedAssistants)

  // Get assistants that have evaluations for this dataset
  const assistantIdsWithEvals = [
    ...new Set(
      evaluations
        .filter(e => e.dataset_name === dataset.name)
        .map(e => e.assistant_id)
    )
  ]

  // Handle both array and object formats for assistants
  const assistantsArray = Array.isArray(assistants) ? assistants : Object.values(assistants)
  
  const assistantsWithEvaluations = assistantsArray.filter(a =>
    assistantIdsWithEvals.includes(a._id)
  )

  // Filter by search
  const filteredAssistants = assistantsWithEvaluations.filter(assistant => {
    const searchLower = searchQuery.toLowerCase()
    const name = (assistant.name || '').toLowerCase()
    const description = (assistant.description || '').toLowerCase()
    return name.includes(searchLower) || description.includes(searchLower)
  })

  const toggleAssistant = (assistantId) => {
    if (tempSelected.includes(assistantId)) {
      setTempSelected(tempSelected.filter(id => id !== assistantId))
    } else {
      setTempSelected([...tempSelected, assistantId])
    }
  }

  const handleConfirm = () => {
    onSelect(tempSelected)
  }

  const selectAll = () => {
    setTempSelected(filteredAssistants.map(a => a._id))
  }

  const deselectAll = () => {
    setTempSelected([])
  }

  if (assistantsWithEvaluations.length === 0) {
    return (
      <Card>
        <div className="p-16">
          <EmptyState
            icon={AlertCircle}
            title="No Evaluations Found"
            description={`No assistants have been evaluated on "${dataset.name}" yet. Run evaluations first to compare results.`}
          />
          <div className="mt-6 flex justify-center">
            <Button variant="ghost" onClick={onBack} icon={ArrowLeft}>
              Back to Datasets
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card>
        <div className="p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            icon={ArrowLeft}
            className="mb-4"
          >
            Back to Datasets
          </Button>

          <h2 className="text-2xl font-bold text-white mb-2">Select Assistants to Compare</h2>
          <p className="text-slate-400 mb-4">
            Comparing evaluations for: <span className="text-white font-medium">{dataset.name}</span>
          </p>

          <div className="flex gap-4 items-center">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search assistants..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={filteredAssistants.length === tempSelected.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={deselectAll}
                disabled={tempSelected.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>

          {/* Selection Counter */}
          <div className="mt-4 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-400" />
            <span className="text-sm text-slate-300">
              <span className="font-semibold text-white">{tempSelected.length}</span> of {filteredAssistants.length} assistants selected
            </span>
          </div>
        </div>
      </Card>

      {/* Assistants Grid */}
      {filteredAssistants.length === 0 ? (
        <Card>
          <div className="p-16">
            <EmptyState
              icon={Search}
              title="No assistants found"
              description="Try adjusting your search terms"
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssistants.map((assistant) => {
            const isSelected = tempSelected.includes(assistant._id)
            const evalCount = evaluations.filter(
              e => e.dataset_name === dataset.name && e.assistant_id === assistant._id
            ).length

            return (
              <Card
                key={assistant._id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20 bg-blue-500/5'
                    : 'hover:border-white/30 hover:shadow-lg'
                }`}
                onClick={() => toggleAssistant(assistant._id)}
              >
                <div className="p-6 space-y-4">
                  {/* Header with checkbox */}
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-gradient-to-br from-blue-500 to-purple-600'
                        : 'bg-gradient-to-br from-slate-700 to-slate-800'
                    }`}>
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-slate-600 bg-slate-800'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {/* Assistant Info */}
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 line-clamp-1">
                      {assistant.name}
                    </h3>
                    {assistant.description && (
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                        {assistant.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="blue">
                        {assistant.type || 'Assistant'}
                      </Badge>
                      {assistant.config?.llm_model && (
                        <Badge variant="gray">
                          {assistant.config.llm_model}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Evaluation Count */}
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-slate-500">
                      {evalCount} evaluation{evalCount !== 1 ? 's' : ''} on this dataset
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Confirm Button */}
      {tempSelected.length > 0 && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
          <Card className="shadow-2xl">
            <div className="p-4 flex items-center gap-4">
              <div className="text-sm text-slate-300">
                <span className="font-semibold text-white">{tempSelected.length}</span> assistant{tempSelected.length !== 1 ? 's' : ''} selected
              </div>
              <Button
                variant="primary"
                onClick={handleConfirm}
                icon={Check}
                className="shadow-lg"
              >
                View Comparison
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}