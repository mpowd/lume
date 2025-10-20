import { useState } from 'react'
import { useWebCrawl } from '../../../hooks/useWebCrawl'
import Wizard from '../../shared/Wizard'
import CrawlSettings from './CrawlSettings'
import LinkDiscovery from './LinkDiscovery'
import LinkSelection from './LinkSelection'

export default function CrawlWizard({ 
  collectionName, 
  onBack, 
  onComplete 
}) {
  const [step, setStep] = useState(1)
  const [crawlSettings, setCrawlSettings] = useState({
    base_url: '',
    include_external: false
  })

  const {
    discoveredUrls,
    selectedUrls,
    crawling,
    error,
    crawl,
    toggleUrlSelection,
    selectAll,
    getSelectedCount
  } = useWebCrawl()

  const handleStartCrawl = async () => {
    setStep(2)
    const result = await crawl(crawlSettings.base_url, crawlSettings.include_external)
    if (result.success) {
      setStep(3)
    } else {
      setStep(1)
    }
  }

  const handleReset = () => {
    setStep(1)
    setCrawlSettings({ base_url: '', include_external: false })
  }

  return (
    <div className="w-full max-w-5xl animate-in fade-in slide-in-from-right-4 duration-500">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Website Scraper</h1>
        <p className="text-slate-400">
          {step === 1 && 'Enter a URL to discover links'}
          {step === 2 && 'Analyzing website structure'}
          {step === 3 && 'Choose which pages to scrape'}
        </p>
      </div>

      <Wizard currentStep={step} totalSteps={3} className="mb-8" />

      {step === 1 && (
        <CrawlSettings
          settings={crawlSettings}
          onChange={setCrawlSettings}
          onStart={handleStartCrawl}
          onBack={onBack}
        />
      )}

      {step === 2 && (
        <LinkDiscovery />
      )}

      {step === 3 && (
        <LinkSelection
          collectionName={collectionName}
          discoveredUrls={discoveredUrls}
          selectedUrls={selectedUrls}
          onToggle={toggleUrlSelection}
          onSelectAll={selectAll}
          getSelectedCount={getSelectedCount}
          onReset={handleReset}
          onComplete={onComplete}
        />
      )}
    </div>
  )
}