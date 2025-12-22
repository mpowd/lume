import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader, ExternalLink, Search, X } from 'lucide-react';
import { websiteAPI } from '../../services/api';

// Main Component
export default function WatchWebsiteKnowledge({ collectionName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [reindexing, setReindexing] = useState(false);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [reindexedCount, setReindexedCount] = useState(0);

  useEffect(() => {
    loadUrlStatus();
  }, [collectionName]);

  const loadUrlStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await websiteAPI.watchUrls(collectionName);
      setData(result);
      setSelectedUrls(new Set()); // Reset selection on reload
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleUrlSelection = (url) => {
    setSelectedUrls(prev => {
      const newSet = new Set(prev);
      if (newSet.has(url)) {
        newSet.delete(url);
      } else {
        newSet.add(url);
      }
      return newSet;
    });
  };

  const selectAllChanged = () => {
    if (!data?.changed_urls) return;
    
    const allChanged = new Set(data.changed_urls);
    const allSelected = data.changed_urls.every(url => selectedUrls.has(url));
    
    if (allSelected) {
      // Deselect all
      setSelectedUrls(new Set());
    } else {
      // Select all changed URLs
      setSelectedUrls(allChanged);
    }
  };

  const handleReindexSelected = async () => {
    if (selectedUrls.size === 0) return;
    
    setReindexing(true);
    const urlsToReindex = Array.from(selectedUrls);
    
    try {
      // Call the reindex API endpoint
      await websiteAPI.reindex(collectionName, urlsToReindex);
      
      // Update the data state to move reindexed URLs from changed to unchanged
      setData(prevData => {
        const reindexedSet = new Set(urlsToReindex);
        const newChangedUrls = prevData.changed_urls.filter(url => !reindexedSet.has(url));
        const newUnchangedUrls = [...prevData.unchanged_urls, ...urlsToReindex];
        
        return {
          ...prevData,
          changed_urls: newChangedUrls,
          unchanged_urls: newUnchangedUrls,
          changed_count: newChangedUrls.length,
          unchanged_count: newUnchangedUrls.length
        };
      });
      
      // Store count and show success modal
      setReindexedCount(selectedUrls.size);
      setSelectedUrls(new Set()); // Clear selection
      setShowSuccessModal(true);
      
    } catch (err) {
      console.error('Reindex error:', err);
      alert(`Error reindexing URLs: ${err.message}`);
    } finally {
      setReindexing(false);
    }
  };

  const closeSuccessModal = () => {
    setShowSuccessModal(false);
    setReindexedCount(0);
  };

  if (loading) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="w-8 h-8 text-brand-teal animate-spin" />
          <p className="mt-4 text-text-tertiary">Checking whether content has changed ...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <h3 className="text-red-400 font-semibold mb-2">Error Loading URLs</h3>
          <p className="text-text-tertiary">{error}</p>
          <button
            onClick={loadUrlStatus}
            className="mt-4 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.total_urls === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="bg-background-elevated border border-border-default rounded-xl p-12 text-center">
          <div className="mb-4 p-4 rounded-full bg-transparent border border-border-default inline-block">
            <ExternalLink className="w-8 h-8 text-text-tertiary" />
          </div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Website URLs Found</h3>
          <p className="text-text-tertiary">This collection doesn't contain any indexed website URLs yet.</p>
        </div>
      </div>
    );
  }

  const allUrls = [
    ...data.changed_urls.map(url => ({ url, changed: true })),
    ...data.unchanged_urls.map(url => ({ url, changed: false }))
  ];

  // Filter URLs based on search query
  const filteredUrls = allUrls.filter(({ url }) =>
    url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const allChangedSelected = data.changed_urls.length > 0 && 
    data.changed_urls.every(url => selectedUrls.has(url));

  return (
    <div className="w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-background-elevated border border-border-default rounded-xl p-6 max-w-md w-full mx-4 animate-slide-in">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-success-bg border border-success-border flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-text-primary mb-1">
                  Reindexing Complete
                </h3>
                <p className="text-text-secondary text-sm">
                  Successfully reindexed {reindexedCount} URL{reindexedCount !== 1 ? 's' : ''}. 
                  The content has been updated and is now marked as up to date.
                </p>
              </div>
              <button
                onClick={closeSuccessModal}
                className="flex-shrink-0 text-text-tertiary hover:text-text-primary transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={closeSuccessModal}
                className="px-4 py-2 bg-brand-teal hover:bg-brand-teal-dark text-white font-medium rounded-lg transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Watch Website Knowledge</h2>
        <p className="text-text-tertiary">Monitor changes to indexed website URLs</p>
      </div>

      {/* Summary Stats - Smaller and less dominant */}
      <div className="flex items-center gap-3 mb-6 text-sm">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-elevated border border-border-default rounded-lg">
          <span className="text-text-tertiary">Total:</span>
          <span className="font-semibold text-white">{data.total_urls}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-elevated border border-green-500/20 rounded-lg">
          <CheckCircle className="w-3.5 h-3.5 text-green-400" />
          <span className="text-text-tertiary">Up to date:</span>
          <span className="font-semibold text-green-400">{data.unchanged_count}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-background-elevated border border-yellow-500/20 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-yellow-400" />
          <span className="text-text-tertiary">Changed:</span>
          <span className="font-semibold text-yellow-400">{data.changed_count}</span>
        </div>
        
        <div className="ml-auto">
          <button
            onClick={loadUrlStatus}
            className="px-3 py-1.5 bg-transparent border border-border-default hover:border-brand-teal hover:bg-background text-text-primary rounded-lg transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search URLs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-elevated border border-border-default rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-brand-teal transition-colors"
          />
        </div>
      </div>

      {/* Select All Changed - Only show if there are changed URLs */}
      {data.changed_count > 0 && (
        <div className="mb-3 flex items-center gap-2 px-4 py-2 bg-background-elevated border border-border-default rounded-lg">
          <input
            type="checkbox"
            id="select-all"
            checked={allChangedSelected}
            onChange={selectAllChanged}
            className="w-4 h-4 rounded border-border-default bg-background text-brand-teal focus:ring-brand-teal focus:ring-offset-0 cursor-pointer"
          />
          <label htmlFor="select-all" className="text-sm text-text-secondary cursor-pointer">
            Select all changed URLs ({data.changed_count})
          </label>
        </div>
      )}

      {/* URL List */}
      <div className="bg-background-elevated border border-border-default rounded-xl overflow-hidden mb-6">
        <div className="divide-y divide-border-default max-h-[500px] overflow-y-auto">
          {filteredUrls.length === 0 ? (
            <div className="p-8 text-center text-text-tertiary">
              No URLs match your search
            </div>
          ) : (
            filteredUrls.map(({ url, changed }) => (
              <div
                key={url}
                className="p-4 hover:bg-background transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Checkbox - Only for changed URLs */}
                  {changed && (
                    <div className="flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={selectedUrls.has(url)}
                        onChange={() => toggleUrlSelection(url)}
                        className="w-4 h-4 rounded border-border-default bg-background text-brand-teal focus:ring-brand-teal focus:ring-offset-0 cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Status Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {changed ? (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    ) : (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    )}
                  </div>

                  {/* URL Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-text-primary hover:text-brand-teal transition-colors break-all group"
                      >
                        {url}
                        <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                      
                      {/* Status Badge */}
                      <span
                        className={`flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                          changed
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : 'bg-green-500/20 text-green-400'
                        }`}
                      >
                        {changed ? 'Changed' : 'Up to date'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reindex Button - Centered */}
      {data.changed_count > 0 && (
        <div className="flex flex-col items-center gap-3 pt-4 border-t border-border-subtle">
          <div className="text-sm text-text-tertiary">
            {selectedUrls.size > 0 ? (
              <span>{selectedUrls.size} URL{selectedUrls.size !== 1 ? 's' : ''} selected</span>
            ) : (
              <span>Select URLs to reindex</span>
            )}
          </div>
          
          <button
            onClick={handleReindexSelected}
            disabled={selectedUrls.size === 0 || reindexing}
            className="px-6 py-2.5 bg-transparent border border-border-default hover:border-brand-teal hover:bg-background-elevated disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-border-default disabled:hover:bg-transparent text-text-primary hover:text-brand-teal font-medium rounded-lg transition-all flex items-center gap-2 text-sm"
          >
            {reindexing ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Reindexing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Reindex Selected
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}