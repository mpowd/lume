import { useState } from 'react'
import { Globe, Check, X, ChevronLeft, Database, Sparkles, ExternalLink, Archive, AlertCircle } from 'lucide-react'
import { useUploadProgress } from '../../../hooks/useUploadProgress'
import Card from '../../shared/Card'
import Button from '../../shared/Button'
import SearchInput from '../../shared/SearchInput'
import StatDisplay from '../../shared/StatDisplay'
import UploadProgress from '../UploadProgress'

export default function LinkSelection({ 
  collectionName,
  discoveredUrls, 
  selectedUrls, 
  onToggle, 
  onSelectAll, 
  getSelectedCount,
  getNewUrlsCount,
  getExistingUrlsCount,
  onReset,
  onComplete 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const { uploadProgress, isUploading, startUpload, closeProgress } = useUploadProgress()

  // Separate new and existing URLs
  const newUrls = discoveredUrls.filter(item => !item.exists_in_collection)
  const existingUrls = discoveredUrls.filter(item => item.exists_in_collection)

  // Filter based on search query
  const filteredNewUrls = newUrls.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.url?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.base_domain?.toLowerCase().includes(query)
    )
  })

  const filteredExistingUrls = existingUrls.filter(item => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      item.url?.toLowerCase().includes(query) ||
      item.title?.toLowerCase().includes(query) ||
      item.base_domain?.toLowerCase().includes(query)
    )
  })

  const handleUpload = () => {
    const urlsToUpload = Object.keys(selectedUrls).filter(url => selectedUrls[url])
    startUpload(collectionName, urlsToUpload, onComplete)
  }

  const handleClose = () => {
    closeProgress(onComplete)
  }

  const renderUrlCard = (item, idx, isExisting = false) => {
    const isSelected = !isExisting && (selectedUrls[item.url] || false)
    
    return (
      <Card
        key={idx}
        className={`p-5 ${
          isExisting 
            ? 'opacity-60 bg-slate-800/30 border-slate-700/30' 
            : isSelected 
              ? 'border-brand-teal/40 bg-brand-teal/5' 
              : ''
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="pt-1">
            {isExisting ? (
              <div className="w-5 h-5 rounded-lg border-2 border-slate-600 bg-slate-800 flex items-center justify-center cursor-not-allowed">
                <Check className="w-3 h-3 text-slate-600" />
              </div>
            ) : (
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggle(item.url)}
                className="w-5 h-5 rounded-lg border-white/20 bg-slate-950 text-brand-teal focus:ring-2 focus:ring-brand-teal/50 cursor-pointer transition-all"
              />
            )}
          </div>

          <div className={`p-3 rounded-xl transition-all flex-shrink-0 ${
            isExisting
              ? 'bg-slate-700/30'
              : isSelected 
                ? 'bg-brand-teal/20' 
                : 'bg-slate-800/50'
          }`}>
            {isExisting ? (
              <Archive className="w-5 h-5 text-slate-500" />
            ) : (
              <Globe className={`w-5 h-5 ${isSelected ? 'text-brand-teal' : 'text-slate-400'}`} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className={`font-semibold transition-colors ${
                isExisting
                  ? 'text-slate-500'
                  : isSelected 
                    ? 'text-white' 
                    : 'text-slate-300'
              }`}>
                {item.title || 'Untitled Page'}
              </h4>
              {isExisting && (
                <span className="px-2 py-1 bg-slate-700/50 rounded-md text-xs text-slate-400 flex items-center gap-1 flex-shrink-0">
                  <Archive className="w-3 h-3" />
                  Already in collection
                </span>
              )}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className={`group/link flex items-center gap-2 text-sm transition-colors mb-3 ${
                isExisting
                  ? 'text-slate-500 hover:text-slate-400'
                  : 'text-slate-400 hover:text-brand-teal'
              }`}
            >
              <span className="truncate font-mono">{item.url}</span>
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
            </a>

            {item.base_domain && (
              <div className={`px-2 py-1 rounded-md inline-block ${
                isExisting ? 'bg-slate-700/30' : 'bg-slate-800/50'
              }`}>
                <span className="text-xs text-slate-400">{item.base_domain}</span>
              </div>
            )}
          </div>

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
              isExisting
                ? 'bg-slate-700/30 text-slate-500 hover:bg-slate-700/50'
                : isSelected 
                  ? 'bg-brand-teal/10 hover:bg-brand-teal/20 text-brand-teal' 
                  : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Open in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {isSelected && !isExisting && (
          <div className="absolute top-0 left-0 w-1 h-full bg-brand-teal rounded-l-2xl" />
        )}
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Review Discovered Links</h2>
          <p className="text-slate-400">Select which pages to add to your knowledge base</p>
        </div>

        <Card className="p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <StatDisplay value={discoveredUrls.length} label="Total Found" />
              <div className="h-12 w-px bg-white/10" />
              <StatDisplay 
                value={getNewUrlsCount()} 
                label="New URLs" 
                variant="success" 
              />
              <div className="h-12 w-px bg-white/10" />
              <StatDisplay 
                value={getExistingUrlsCount()} 
                label="Already Added" 
                variant="default" 
              />
              <div className="h-12 w-px bg-white/10" />
              <StatDisplay 
                value={getSelectedCount()} 
                label="Selected" 
                variant="info" 
              />
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => onSelectAll(true)} icon={Check}>
                Select All New
              </Button>
              <Button variant="secondary" size="sm" onClick={() => onSelectAll(false)} icon={X}>
                Clear All
              </Button>
            </div>
          </div>

          <SearchInput
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search links by URL, title, or domain..."
          />

          {searchQuery && (
            <p className="text-sm text-slate-400 mt-2">
              Showing {filteredNewUrls.length + filteredExistingUrls.length} of {discoveredUrls.length} links
            </p>
          )}
        </Card>

        {getExistingUrlsCount() > 0 && (
          <Card className="p-4 bg-amber-500/5 border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200 font-medium">
                  {getExistingUrlsCount()} URL{getExistingUrlsCount() !== 1 ? 's' : ''} already in collection
                </p>
                <p className="text-xs text-amber-300/70 mt-1">
                  These URLs are shown below and cannot be selected to prevent duplicates.
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="space-y-6 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
          <style>{`
            .scrollbar-thin::-webkit-scrollbar { width: 8px; }
            .scrollbar-thin::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
            .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--color-brand-teal); border-radius: 4px; }
          `}</style>

          {/* New URLs Section */}
          {filteredNewUrls.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-brand-teal" />
                New URLs ({filteredNewUrls.length})
              </h3>
              {filteredNewUrls.map((item, idx) => renderUrlCard(item, `new-${idx}`, false))}
            </div>
          )}

          {/* Existing URLs Section */}
          {filteredExistingUrls.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 pt-6 pb-2">
                <div className="flex-1 h-px bg-slate-700/50" />
                <h3 className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                  <Archive className="w-4 h-4" />
                  Already in Collection ({filteredExistingUrls.length})
                </h3>
                <div className="flex-1 h-px bg-slate-700/50" />
              </div>
              {filteredExistingUrls.map((item, idx) => renderUrlCard(item, `existing-${idx}`, true))}
            </div>
          )}

          {filteredNewUrls.length === 0 && filteredExistingUrls.length === 0 && (
            <Card className="p-12 text-center">
              <Globe className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">
                {searchQuery ? 'No links match your search' : 'No links discovered'}
              </p>
            </Card>
          )}
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onReset} icon={ChevronLeft}>
            Start Over
          </Button>
          <Button
            variant="success"
            onClick={handleUpload}
            disabled={getSelectedCount() === 0}
            icon={Database}
            fullWidth
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Add {getSelectedCount()} New Link{getSelectedCount() !== 1 ? 's' : ''}
          </Button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 border-brand-teal/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-teal/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-brand-teal" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Smart Duplicate Detection</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                URLs already in your collection are automatically detected and shown separately. 
                You can only select new URLs to prevent duplicates.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <UploadProgress 
        isOpen={isUploading} 
        progress={uploadProgress}
        onClose={handleClose}
      />
    </>
  )
}