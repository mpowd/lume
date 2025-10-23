import { useState, useEffect } from 'react'
import { BarChart3, Plus, Play, TrendingUp, Database } from 'lucide-react'
import { evaluationAPI } from '../services/api'
import { useCollections } from '../hooks/useCollections'
import { useAssistants } from '../hooks/useAssistants'
import Button from '../components/shared/Button'
import LoadingSpinner from '../components/shared/LoadingSpinner'
import DatasetList from '../components/evaluation/DatasetList'
import DatasetCreator from '../components/evaluation/DatasetCreator'
import EvaluationRunner from '../components/evaluation/EvaluationRunner'
import EvaluationWorkflow from '../components/evaluation/EvaluationWorkflow'  // ← CHANGED: New workflow component
import DatasetManager from '../components/evaluation/DatasetManager'

export default function EvaluationPage() {
  const { collections } = useCollections()
  const { assistants } = useAssistants()
  const [view, setView] = useState('overview') // overview, create, edit, run, results, manage
  const [datasets, setDatasets] = useState([])
  const [evaluations, setEvaluations] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [editingDataset, setEditingDataset] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [datasetsData, evaluationsData] = await Promise.all([
        evaluationAPI.getDatasets(),
        evaluationAPI.getEvaluations()
      ])
      setDatasets(datasetsData.datasets || [])
      setEvaluations(evaluationsData.evaluations || [])
    } catch (error) {
      console.error('Error loading evaluation data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDatasetCreated = async () => {
    await loadData()
    setView('overview')
    setEditingDataset(null)
  }

  const handleDatasetDeleted = async () => {
    await loadData()
    setSelectedDataset(null)
  }

  const handleDatasetEdit = (dataset) => {
    setEditingDataset(dataset)
    setView('edit')
  }

  const handleEvaluationComplete = async () => {
    await loadData()
    setView('results')
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="h-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/5 bg-slate-950/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1600px] mx-auto px-8 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Evaluation</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Test and measure assistant performance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-8">
        {view === 'overview' && (
          <div className="space-y-8">
            {/* Simple Action Buttons */}
            <div className="flex gap-4">
              <Button
                variant="primary"
                icon={Plus}
                onClick={() => {
                  setEditingDataset(null)
                  setView('create')
                }}
              >
                Create Dataset
              </Button>
              <Button
                variant="secondary"
                icon={Database}
                onClick={() => setView('manage')}
                disabled={datasets.length === 0}
              >
                Manage Datasets
              </Button>
              <Button
                variant="secondary"
                icon={Play}
                onClick={() => setView('run')}
                disabled={datasets.length === 0}
              >
                Run Evaluation
              </Button>
              {evaluations.length > 0 && (
                <Button
                  variant="ghost"
                  icon={TrendingUp}
                  onClick={() => setView('results')}
                >
                  View Results
                </Button>
              )}
            </div>

            {/* Datasets List */}
            <DatasetList
              datasets={datasets}
              onSelect={(dataset) => {
                setSelectedDataset(dataset)
                setView('run')
              }}
              onEdit={handleDatasetEdit}
              onDelete={handleDatasetDeleted}
              onRefresh={loadData}
            />
          </div>
        )}

        {view === 'create' && (
          <DatasetCreator
            collections={collections}
            onSuccess={handleDatasetCreated}
            onCancel={() => setView('overview')}
          />
        )}

        {view === 'edit' && (
          <DatasetCreator
            collections={collections}
            dataset={editingDataset}
            onSuccess={handleDatasetCreated}
            onCancel={() => {
              setEditingDataset(null)
              setView('overview')
            }}
          />
        )}

        {view === 'manage' && (
          <DatasetManager
            datasets={datasets}
            onEdit={handleDatasetEdit}
            onDelete={handleDatasetDeleted}
            onBack={() => setView('overview')}
          />
        )}

        {view === 'run' && (
          <EvaluationRunner
            datasets={datasets}
            assistants={assistants}
            selectedDataset={selectedDataset}
            onComplete={handleEvaluationComplete}
            onCancel={() => setView('overview')}
          />
        )}

        {/* ← CHANGED: Use new EvaluationWorkflow instead of EvaluationResults */}
        {view === 'results' && (
          <EvaluationWorkflow
            datasets={datasets}
            assistants={assistants}
            evaluations={evaluations}
            onBack={() => setView('overview')}
          />
        )}
      </div>
    </div>
  )
}