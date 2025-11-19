import { useState, useEffect } from 'react'
import { ArrowRight, Check, Database, Users, BarChart3 } from 'lucide-react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import DatasetSelector from './DatasetSelector'
import AssistantMultiSelector from './AssistantMultiSelector'
import EvaluationVisualizations from './EvaluationVisualizations'

const STEPS = [
  { id: 'dataset', label: 'Select Dataset', icon: Database },
  { id: 'assistants', label: 'Select Assistants', icon: Users },
  { id: 'visualize', label: 'View Results', icon: BarChart3 }
]

export default function EvaluationWorkflow({ datasets, assistants, evaluations, onBack }) {
  const [currentStep, setCurrentStep] = useState('dataset')
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [selectedAssistants, setSelectedAssistants] = useState([])
  
  // Convert assistants array to object map for easier lookup
  const assistantsMap = {}
  if (Array.isArray(assistants)) {
    assistants.forEach(a => {
      assistantsMap[a._id] = a
    })
  } else if (assistants) {
    // Already an object
    Object.assign(assistantsMap, assistants)
  }
  
  // Filter evaluations by selected dataset and assistants
  const filteredEvaluations = evaluations.filter(evaluation => 
    evaluation.dataset_name === selectedDataset?.name &&
    selectedAssistants.includes(evaluation.assistant_id)
  )

  // Reset assistant selection when dataset changes
  useEffect(() => {
    if (selectedDataset) {
      setSelectedAssistants([])
    }
  }, [selectedDataset])

  const handleDatasetSelect = (dataset) => {
    setSelectedDataset(dataset)
    setCurrentStep('assistants')
  }

  const handleAssistantsSelect = (assistantIds) => {
    setSelectedAssistants(assistantIds)
    if (assistantIds.length > 0) {
      setCurrentStep('visualize')
    }
  }

  const handleStepClick = (stepId) => {
    const stepIndex = STEPS.findIndex(s => s.id === stepId)
    const currentIndex = STEPS.findIndex(s => s.id === currentStep)
    
    // Only allow going back to completed steps
    if (stepIndex < currentIndex) {
      setCurrentStep(stepId)
    } else if (stepId === 'assistants' && selectedDataset) {
      setCurrentStep(stepId)
    } else if (stepId === 'visualize' && selectedDataset && selectedAssistants.length > 0) {
      setCurrentStep(stepId)
    }
  }

  const isStepComplete = (stepId) => {
    if (stepId === 'dataset') return !!selectedDataset
    if (stepId === 'assistants') return selectedAssistants.length > 0
    if (stepId === 'visualize') return selectedDataset && selectedAssistants.length > 0
    return false
  }

  const isStepAccessible = (stepId) => {
    if (stepId === 'dataset') return true
    if (stepId === 'assistants') return !!selectedDataset
    if (stepId === 'visualize') return selectedDataset && selectedAssistants.length > 0
    return false
  }

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => {
              const Icon = step.icon
              const isActive = currentStep === step.id
              const isComplete = isStepComplete(step.id)
              const isAccessible = isStepAccessible(step.id)
              
              return (
                <div key={step.id} className="flex items-center flex-1">
                  <button
                    onClick={() => handleStepClick(step.id)}
                    disabled={!isAccessible}
                    className={`flex items-center gap-3 transition-all ${
                      isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center transition-all ${
                      isComplete
                        ? 'bg-brand-teal border-brand-teal text-white shadow-lg'
                        : isActive
                        ? 'bg-white border-white text-black shadow-lg scale-110'
                        : 'bg-transparent border-white/20 text-slate-500'
                    }`}>
                      {isComplete ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <Icon className="w-6 h-6" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold ${
                        isActive ? 'text-white' : isComplete ? 'text-brand-teal' : 'text-slate-500'
                      }`}>
                        {step.label}
                      </div>
                      {isComplete && !isActive && (
                        <div className="text-xs text-slate-400">
                          {step.id === 'dataset' && selectedDataset?.name}
                          {step.id === 'assistants' && `${selectedAssistants.length} selected`}
                        </div>
                      )}
                    </div>
                  </button>
                  
                  {index < STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-4 rounded-full transition-all ${
                      isComplete ? 'bg-brand-teal' : 'bg-white/20'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* Step Content */}
      <div className="min-h-[600px]">
        {currentStep === 'dataset' && (
          <DatasetSelector
            datasets={datasets}
            selectedDataset={selectedDataset}
            onSelect={handleDatasetSelect}
            evaluations={evaluations}
          />
        )}

        {currentStep === 'assistants' && selectedDataset && (
          <AssistantMultiSelector
            dataset={selectedDataset}
            assistants={assistants}
            evaluations={evaluations}
            selectedAssistants={selectedAssistants}
            onSelect={handleAssistantsSelect}
            onBack={() => setCurrentStep('dataset')}
          />
        )}

        {currentStep === 'visualize' && selectedDataset && selectedAssistants.length > 0 && (
          <EvaluationVisualizations
            dataset={selectedDataset}
            selectedAssistants={selectedAssistants}
            assistants={assistantsMap}
            evaluations={filteredEvaluations}
            allEvaluations={evaluations}
            onBack={() => setCurrentStep('assistants')}
            onChangeDataset={() => setCurrentStep('dataset')}
            onChangeAssistants={() => setCurrentStep('assistants')}
          />
        )}
      </div>
    </div>
  )
}