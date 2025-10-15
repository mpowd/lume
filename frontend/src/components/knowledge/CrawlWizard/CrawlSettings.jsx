import { Globe, ArrowRight, ChevronLeft } from 'lucide-react'
import Card from '../../shared/Card'
import Button from '../../shared/Button'

export default function CrawlSettings({ settings, onChange, onStart, onBack }) {
  return (
    <div className="space-y-6">
      <Card className="p-8 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Globe className="w-6 h-6 text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Crawl Settings</h3>
        </div>

        <div className="space-y-6">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity blur" />
            <input
              type="url"
              value={settings.base_url}
              onChange={(e) => onChange({ ...settings, base_url: e.target.value })}
              className="relative w-full px-6 py-5 bg-slate-950/80 border border-white/10 rounded-2xl text-white text-lg placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
              placeholder="https://example.com"
            />
          </div>

          <label className="flex items-center gap-3 p-4 bg-slate-950/30 rounded-xl cursor-pointer hover:bg-slate-950/50 transition-colors">
            <input
              type="checkbox"
              checked={settings.include_external}
              onChange={(e) => onChange({ ...settings, include_external: e.target.checked })}
              className="w-5 h-5 rounded border-white/20 bg-slate-950 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
            />
            <div className="flex-1">
              <div className="text-sm font-medium text-white">Include External Links</div>
              <div className="text-xs text-slate-400">Also discover links from other domains</div>
            </div>
          </label>
        </div>
      </Card>

      <div className="flex gap-3">
        <Button variant="secondary" onClick={onBack} icon={ChevronLeft}>
          Back to Sources
        </Button>
        <Button
          variant="primary"
          onClick={onStart}
          disabled={!settings.base_url}
          icon={ArrowRight}
          fullWidth
          size="lg"
        >
          Start Crawling
        </Button>
      </div>
    </div>
  )
}