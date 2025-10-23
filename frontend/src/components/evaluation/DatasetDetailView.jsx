import React, { useState } from 'react'
import Card from '../shared/Card'
import Button from '../shared/Button'
import Badge from '../shared/Badge'
import EvaluationComparison from './EvaluationComparison'
import { FileText, BarChart3, ArrowLeft } from 'lucide-react'

const DatasetDetailView = ({ dataset, onBack, onEdit }) => {
  const [activeTab, setActiveTab] = useState('qa-pairs') // 'qa-pairs' or 'evaluations'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="secondary"
            size="sm"
            onClick={onBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{dataset.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="blue">{dataset.num_pairs} Q&A Pairs</Badge>
              <Badge variant="gray">{dataset.source_collection}</Badge>
            </div>
          </div>
        </div>
        {activeTab === 'qa-pairs' && (
          <Button variant="primary" onClick={onEdit}>
            Edit Dataset
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('qa-pairs')}
            className={`px-4 py-3 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'qa-pairs'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            Q&A Pairs
          </button>
          <button
            onClick={() => setActiveTab('evaluations')}
            className={`px-4 py-3 border-b-2 font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'evaluations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Evaluations
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'qa-pairs' && (
        <Card>
          <div className="p-6 space-y-6">
            {dataset.qa_pairs && dataset.qa_pairs.length > 0 ? (
              dataset.qa_pairs.map((pair, index) => (
                <div
                  key={index}
                  className="border-l-4 border-blue-500 bg-gray-50 p-4 rounded-r-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Badge variant="blue" className="mt-1">
                      #{index + 1}
                    </Badge>
                    <div className="flex-1 space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Question
                        </div>
                        <p className="text-gray-900 font-medium">{pair.question}</p>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-500 uppercase mb-1">
                          Answer
                        </div>
                        <p className="text-gray-700">{pair.answer}</p>
                      </div>
                      {pair.source_doc && (
                        <div className="text-xs text-gray-500">
                          Source: {pair.source_doc}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                No Q&A pairs available
              </div>
            )}
          </div>
        </Card>
      )}

      {activeTab === 'evaluations' && (
        <EvaluationComparison
          datasetId={dataset._id}
          datasetName={dataset.name}
        />
      )}
    </div>
  )
}

export default DatasetDetailView