import { useState } from 'react'
import { Plus, X, Globe, ChevronLeft, Database, Trash2, ExternalLink } from 'lucide-react'
import { useUploadProgress } from '../../../hooks/useUploadProgress'
import Card from '../../shared/Card'
import Button from '../../shared/Button'
import FormInput from '../../shared/FormInput'
import StatDisplay from '../../shared/StatDisplay'
import UploadProgress from '../UploadProgress'

export default function ManualUrlEntry({ collectionName, onBack, onComplete }) {
  const [urls, setUrls] = useState([''])
  const [urlErrors, setUrlErrors] = useState({})
  const { uploadProgress, isUploading, startUpload, closeProgress } = useUploadProgress()

  const validateUrl = (url) => {
    if (!url.trim()) return null
    try {
      new URL(url)
      return null
    } catch {
      return 'Invalid URL format'
    }
  }

  const handleUrlChange = (index, value) => {
    const newUrls = [...urls]
    newUrls[index] = value
    setUrls(newUrls)

    // Validate URL
    const error = validateUrl(value)
    setUrlErrors(prev => ({
      ...prev,
      [index]: error
    }))
  }

  const handleAddUrl = () => {
    setUrls([...urls, ''])
  }

  const handleRemoveUrl = (index) => {
    if (urls.length === 1) return // Keep at least one input
    const newUrls = urls.filter((_, i) => i !== index)
    setUrls(newUrls)
    
    // Clean up errors
    const newErrors = { ...urlErrors }
    delete newErrors[index]
    setUrlErrors(newErrors)
  }

  const getValidUrls = () => {
    return urls
      .filter(url => url.trim())
      .filter(url => !validateUrl(url))
  }

  const handleUpload = () => {
    const validUrls = getValidUrls()
    if (validUrls.length === 0) return
    
    startUpload(collectionName, validUrls, onComplete)
  }

  const handleClose = () => {
    closeProgress(onComplete)
  }

  const validUrlCount = getValidUrls().length
  const hasErrors = Object.values(urlErrors).some(error => error !== null)

  return (
    <>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <Button variant="ghost" onClick={onBack} icon={ChevronLeft} className="mb-4">
            Back
          </Button>
          <h2 className="text-3xl font-bold text-white mb-3">Manual URL Entry</h2>
          <p className="text-slate-400">Add specific URLs to your knowledge base</p>
        </div>

        <Card className="p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-6">
              <StatDisplay value={urls.length} label="Total Entries" />
              <div className="h-12 w-px bg-white/10" />
              <StatDisplay 
                value={validUrlCount} 
                label="Valid URLs" 
                variant={validUrlCount > 0 ? "success" : "default"} 
              />
            </div>
          </div>
        </Card>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin">
          <style>{`
            .scrollbar-thin::-webkit-scrollbar { width: 8px; }
            .scrollbar-thin::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); border-radius: 4px; }
            .scrollbar-thin::-webkit-scrollbar-thumb { background: var(--color-brand-teal); border-radius: 4px; }
          `}</style>

          {urls.map((url, index) => (
            <Card 
              key={index} 
              className={`p-4 ${urlErrors[index] ? 'border-red-500/40' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-3 rounded-xl flex-shrink-0 ${
                  url && !urlErrors[index] 
                    ? 'bg-brand-teal/20' 
                    : 'bg-slate-800/50'
                }`}>
                  <Globe className={`w-5 h-5 ${
                    url && !urlErrors[index] 
                      ? 'text-brand-teal' 
                      : 'text-slate-400'
                  }`} />
                </div>

                <div className="flex-1 space-y-2">
                  <FormInput
                    type="url"
                    placeholder="https://example.com/page"
                    value={url}
                    onChange={(e) => handleUrlChange(index, e.target.value)}
                    error={urlErrors[index]}
                  />
                  {urlErrors[index] && (
                    <p className="text-sm text-red-400">{urlErrors[index]}</p>
                  )}
                  {url && !urlErrors[index] && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-brand-teal hover:text-brand-teal-dark transition-colors"
                    >
                      <span>Preview URL</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                {urls.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveUrl(index)}
                    icon={Trash2}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  />
                )}
              </div>
            </Card>
          ))}
        </div>

        <Button
          variant="secondary"
          onClick={handleAddUrl}
          icon={Plus}
          fullWidth
        >
          Add Another URL
        </Button>

        <div className="flex gap-3 pt-4">
          <Button variant="secondary" onClick={onBack} icon={ChevronLeft}>
            Back
          </Button>
          <Button
            variant="success"
            onClick={handleUpload}
            disabled={validUrlCount === 0 || hasErrors}
            icon={Database}
            fullWidth
            size="lg"
            className="bg-brand-teal hover:bg-brand-teal-dark text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            Add {validUrlCount} URL{validUrlCount !== 1 ? 's' : ''}
          </Button>
        </div>

        <Card className="p-6 bg-gradient-to-br from-brand-teal/5 to-brand-teal/10 border-brand-teal/20">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-teal/10 rounded-xl">
              <Globe className="w-6 h-6 text-brand-teal" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Manual URL Control</h4>
              <p className="text-sm text-slate-400 leading-relaxed">
                Add specific URLs one by one. Each URL will be validated and you can preview them before adding to your knowledge base.
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