import { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader, ExternalLink } from 'lucide-react';
import { websiteAPI } from '../../services/api';

// Main Component
export default function WatchWebsiteKnowledge({ collectionName, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);
  const [reindexing, setReindexing] = useState({});

  useEffect(() => {
    loadUrlStatus();
  }, [collectionName]);

  const loadUrlStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await websiteAPI.watchUrls(collectionName);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReindex = async (url) => {
    setReindexing(prev => ({ ...prev, [url]: true }));
    
    // Mock reindex - replace with actual API call
    setTimeout(() => {
      setReindexing(prev => ({ ...prev, [url]: false }));
      alert(`Reindexing triggered for: ${url}`);
      // TODO: Call actual reindex API endpoint
      // After reindex completes, call loadUrlStatus() again
    }, 1000);
  };

  const handleReindexAll = async () => {
    if (!data?.changed_urls?.length) return;
    
    alert(`Reindexing ${data.changed_urls.length} URLs...`);
    // TODO: Implement batch reindex
  };

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-20">
          <Loader className="w-8 h-8 text-brand-teal animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-4xl mx-auto">
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
      <div className="w-full max-w-4xl mx-auto">
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
    ...data.unchanged_urls.map(url => ({ url, changed: false })),
    ...data.changed_urls.map(url => ({ url, changed: true }))
  ].sort((a, b) => b.changed - a.changed);

  return (
    <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-3">Watch Website Knowledge</h2>
        <p className="text-text-tertiary">Monitor changes to indexed website URLs</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-background-elevated border border-border-default rounded-xl p-4">
          <div className="text-text-tertiary text-sm mb-1">Total URLs</div>
          <div className="text-2xl font-bold text-white">{data.total_urls}</div>
        </div>
        <div className="bg-background-elevated border border-green-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-green-400 text-sm mb-1">
            <CheckCircle className="w-4 h-4" />
            Up to Date
          </div>
          <div className="text-2xl font-bold text-green-400">{data.unchanged_count}</div>
        </div>
        <div className="bg-background-elevated border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-yellow-400 text-sm mb-1">
            <AlertCircle className="w-4 h-4" />
            Changed
          </div>
          <div className="text-2xl font-bold text-yellow-400">{data.changed_count}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={loadUrlStatus}
          className="px-4 py-2 bg-transparent border border-border-default hover:border-border-brand hover:bg-background text-text-primary rounded-lg transition-colors flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Status
        </button>
        
        {data.changed_count > 0 && (
          <button
            onClick={handleReindexAll}
            className="px-4 py-2 bg-brand-teal/10 border border-brand-teal/30 hover:bg-brand-teal/20 text-brand-teal rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reindex All Changed ({data.changed_count})
          </button>
        )}
      </div>

      {/* URL List */}
      <div className="bg-background-elevated border border-border-default rounded-xl overflow-hidden">
        <div className="divide-y divide-border-default">
          {allUrls.map(({ url, changed }) => (
            <div
              key={url}
              className="p-4 hover:bg-background transition-colors"
            >
              <div className="flex items-start gap-4">
                {/* Status Icon */}
                <div className="flex-shrink-0 mt-1">
                  {changed ? (
                    <AlertCircle className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  )}
                </div>

                {/* URL Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-white hover:text-brand-teal transition-colors break-all group"
                    >
                      {url}
                      <ExternalLink className="w-3 h-3 inline ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    
                    {/* Status Badge */}
                    <span
                      className={`flex-shrink-0 px-3 py-1 text-xs font-medium rounded-full ${
                        changed
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-green-500/20 text-green-400'
                      }`}
                    >
                      {changed ? 'Changed' : 'Up to date'}
                    </span>
                  </div>

                  {/* Action Button for Changed URLs */}
                  {changed && (
                    <button
                      onClick={() => handleReindex(url)}
                      disabled={reindexing[url]}
                      className="px-3 py-1.5 bg-transparent border border-border-default hover:border-brand-teal hover:bg-brand-teal/10 text-text-primary hover:text-brand-teal rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reindexing[url] ? (
                        <>
                          <Loader className="w-3.5 h-3.5 animate-spin" />
                          Reindexing...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          Reindex
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}