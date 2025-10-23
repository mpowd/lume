import { useState } from 'react'
import { Globe, Check, X, ChevronLeft, Database, Sparkles, ExternalLink } from 'lucide-react'
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
  onReset,
  onComplete 
}) {
  const [searchQuery, setSearchQuery] = useState('')
  const { uploadProgress, isUploading, startUpload, closeProgress } = useUploadProgress()

  const filteredUrls = discoveredUrls.filter(item => {
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
              <StatDisplay value={discoveredUrls.length} label="Total Links" />
              <div className="h-12 w-px bg-white/10" />
              <StatDisplay 
                value={getSelectedCount()} 
                label="Selected" 
                variant="info" 
              />
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" onClick={() => onSelectAll(true)} icon={Check}>
                Select All
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
              Showing {filteredUrls.length} of {discoveredUrls.length} links
            </p>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
          <style>{`
            .scrollbar-thin::-webkit-scrollbar { width: 8px; }
            .scrollbar-thin::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
            .scrollbar-thin::-webkit-scrollbar-thumb { background: linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234)); border-radius: 4px; }
          `}</style>

          {filteredUrls.length === 0 ? (
            <Card className="p-12 text-center">
              <Globe className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-400">
                {searchQuery ? 'No links match your search' : 'No links discovered'}
              </p>
            </Card>
          ) : (
            filteredUrls.map((item, idx) => {
              const isSelected = selectedUrls[item.url] || false
              return (
                <Card
                  key={idx}
                  className={`p-5 ${isSelected ? 'border-blue-500/40 bg-blue-500/5' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="pt-1">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggle(item.url)}
                        className="w-5 h-5 rounded-lg border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer transition-all"
                      />
                    </div>

                    <div className={`p-3 rounded-xl transition-all flex-shrink-0 ${
                      isSelected ? 'bg-blue-500/20' : 'bg-slate-800/50'
                    }`}>
                      <Globe className={`w-5 h-5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className={`font-semibold transition-colors ${
                          isSelected ? 'text-white' : 'text-slate-300'
                        }`}>
                          {item.title || 'Untitled Page'}
                        </h4>
                      </div>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="group/link flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition-colors mb-3"
                      >
                        <span className="truncate font-mono">{item.url}</span>
                        <ExternalLink className="w-3.5 h-3.5 flex-shrink-0 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>

                      {item.base_domain && (
                        <div className="px-2 py-1 bg-slate-800/50 rounded-md inline-block">
                          <span className="text-xs text-slate-400">{item.base_domain}</span>
                        </div>
                      )}
                    </div>

                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`p-2.5 rounded-xl transition-all flex-shrink-0 ${
                        isSelected 
                          ? 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400' 
                          : 'bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title="Open in new tab"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  {isSelected && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-purple-600 rounded-l-2xl" />
                  )}
                </Card>
              )
            })
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
          >
            Add {getSelectedCount()} Link{getSelectedCount() !== 1 ? 's' : ''}
          </Button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-blue-500/5 to-purple-500/5 border-blue-500/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 rounded-xl">
              <Sparkles className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Smart Link Discovery</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Links are automatically discovered and organized. Click any link to preview it in your browser before adding to your knowledge base.
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