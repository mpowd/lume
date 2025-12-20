// frontend/src/components/knowledge/CrawlWizard.jsx
import { useState } from 'react'
import { useWebCrawl } from '../../../hooks/useWebCrawl'
import CrawlSettings from './CrawlSettings'
import LinkDiscovery from './LinkDiscovery'
import LinkSelection from './LinkSelection'
import ManualUrlEntry from './ManualUrlEntry'
import UploadProgress from '../UploadProgress'
import Button from '../../shared/Button'
import { ChevronLeft } from 'lucide-react'

export default function CrawlWizard({ collectionName, onBack, onComplete }) {
  const [step, setStep] = useState('settings')
  const {
    discoveredUrls,
    selectedUrls,
    crawling,
    crawlProgress,
    error,
    crawl,
    toggleUrlSelection,
    selectAll,
    getSelectedCount,
    getNewUrlsCount,
    getExistingUrlsCount,
    reset,
    closeCrawlProgress
  } = useWebCrawl()

  const handleDiscover = async (baseUrl, includeExternal) => {
    setStep('discovering')
    const result = await crawl(baseUrl, includeExternal, collectionName)
    
    if (result.success) {
      setStep('selection')
    } else {
      setStep('settings')
    }
  }

  const handleManualEntry = () => {
    setStep('manual')
  }

  const handleReset = () => {
    reset()
    setStep('settings')
  }

  const handleBackFromManual = () => {
    setStep('settings')
  }

  const handleCloseProgress = () => {
    closeCrawlProgress(onComplete)
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <Button variant="secondary" onClick={handleReset}>
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="w-full">
        {step !== 'settings' && step !== 'manual' && (
          <Button variant="ghost" onClick={onBack} icon={ChevronLeft} className="mb-8">
            Back to sources
          </Button>
        )}

        {step === 'settings' && (
          <CrawlSettings 
            collectionName={collectionName}
            onDiscover={handleDiscover}
            onManualEntry={handleManualEntry}
            loading={crawling}
          />
        )}

        {step === 'discovering' && <LinkDiscovery />}

        {step === 'selection' && (
          <div className="max-w-6xl mx-auto">
            <LinkSelection
              collectionName={collectionName}
              discoveredUrls={discoveredUrls}
              selectedUrls={selectedUrls}
              onToggle={toggleUrlSelection}
              onSelectAll={selectAll}
              getSelectedCount={getSelectedCount}
              getNewUrlsCount={getNewUrlsCount}
              getExistingUrlsCount={getExistingUrlsCount}
              onReset={handleReset}
              onComplete={onComplete}
            />
          </div>
        )}

        {step === 'manual' && (
          <ManualUrlEntry
            collectionName={collectionName}
            onBack={handleBackFromManual}
            onComplete={onComplete}
          />
        )}
      </div>

      {/* Reuse the same UploadProgress component for web crawling */}
      <UploadProgress
        isOpen={crawling || (crawlProgress && crawlProgress.status === 'complete')}
        progress={crawlProgress}
        onClose={handleCloseProgress}
      />
    </>
  )
}