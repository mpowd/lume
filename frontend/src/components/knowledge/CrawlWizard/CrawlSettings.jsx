import { useState } from 'react'
import { Globe, Search, ListPlus } from 'lucide-react'
import Card from '../../shared/Card'
import Button from '../../shared/Button'
import FormInput from '../../shared/FormInput'

export default function CrawlSettings({ onDiscover, onManualEntry, loading }) {
  const [baseUrl, setBaseUrl] = useState('')
  const [includeExternal, setIncludeExternal] = useState(false)
  const [mode, setMode] = useState(null) // null, 'auto', 'manual'

  const handleAutoDiscover = (e) => {
    e.preventDefault()
    if (!baseUrl.trim()) return
    onDiscover(baseUrl, includeExternal)
  }

  const handleManualMode = () => {
    setMode('manual')
    onManualEntry()
  }

  if (mode === null) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-3">Add Website Content</h2>
          <p className="text-slate-400">Choose how you want to add URLs to your knowledge base</p>
        </div>

        <div className="grid gap-4">
          <Card 
            onClick={() => setMode('auto')} 
            className="p-8 cursor-pointer group" 
            hover
          >
            <div className="flex items-start gap-6">
              <div className="p-4 bg-blue-500/10 group-hover:bg-blue-500/20 rounded-2xl transition-all">
                <Search className="w-8 h-8 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Automatic Discovery
                </h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  Enter a website URL and automatically discover all linked pages
                </p>
              </div>
            </div>
          </Card>

          <Card 
            onClick={handleManualMode} 
            className="p-8 cursor-pointer group" 
            hover
          >
            <div className="flex items-start gap-6">
              <div className="p-4 bg-purple-500/10 group-hover:bg-purple-500/20 rounded-2xl transition-all">
                <ListPlus className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Manual Entry
                </h3>
                <p className="text-slate-400 group-hover:text-slate-300 transition-colors">
                  Manually add specific URLs one by one
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  if (mode === 'auto') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setMode(null)}
            className="mb-4"
          >
            ← Back to selection
          </Button>
          <h2 className="text-3xl font-bold text-white mb-3">Automatic URL Discovery</h2>
          <p className="text-slate-400">Enter a website URL to automatically discover linked pages</p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleAutoDiscover} className="space-y-6">
            <FormInput
              label="Website URL"
              type="url"
              placeholder="https://example.com"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              required
              icon={Globe}
            />

            <div className="flex items-center gap-3 p-4 bg-slate-800/50 rounded-xl">
              <input
                type="checkbox"
                id="includeExternal"
                checked={includeExternal}
                onChange={(e) => setIncludeExternal(e.target.checked)}
                className="w-5 h-5 rounded-lg border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
              />
              <label htmlFor="includeExternal" className="text-sm text-slate-300 cursor-pointer">
                Include external domains
              </label>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              size="lg"
              disabled={loading || !baseUrl.trim()}
              icon={Search}
            >
              {loading ? 'Discovering...' : 'Discover Links'}
            </Button>
          </form>
        </Card>
      </div>
    )
  }

  return null
}