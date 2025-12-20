import { useState, useCallback } from 'react'
import { Upload, FileText, Folder, ChevronLeft, Check } from 'lucide-react'
import Button from '../shared/Button'
import Card from '../shared/Card'
import { useFileUpload } from '../../hooks/useFileUpload'
import UploadProgress from './UploadProgress'

export default function FileWizard({ collectionName, onBack, onComplete }) {
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const { startUpload, uploadProgress, isUploading, closeProgress } = useFileUpload()

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files)
    const validFiles = droppedFiles.filter(file => 
      file.type.startsWith('text/') || 
      file.name.endsWith('.pdf') || 
      file.name.endsWith('.doc') || 
      file.name.endsWith('.docx') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    )
    
    setFiles(prev => [...prev, ...validFiles])
  }, [])

  const handleFileInput = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const validFiles = selectedFiles.filter(file => 
      file.type.startsWith('text/') || 
      file.name.endsWith('.pdf') || 
      file.name.endsWith('.doc') || 
      file.name.endsWith('.docx') ||
      file.name.endsWith('.md') ||
      file.name.endsWith('.txt')
    )
    
    setFiles(prev => [...prev, ...validFiles])
  }

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {  
    if (files.length === 0) return

    try {
      const formData = new FormData()
      formData.append('collection_name', collectionName)
      
      files.forEach((file) => {
        formData.append('files', file)
      })

      const result = await startUpload(collectionName, formData, onComplete, true)
      if (result.success) {
        console.log('Upload started with task ID:', result.taskId)
      }
    } catch (error) {
      console.error('Upload error:', error)
    }
  }

  const handleCloseProgress = () => {
    closeProgress(onComplete)
    setFiles([]) // Clear files after completion
  }

  return (
    <>
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-right-4 duration-500">
        <Button variant="ghost" onClick={onBack} icon={ChevronLeft} className="mb-8">
          Back to source selection
        </Button>

        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-3">Upload Files</h2>
          <p className="text-slate-400">Drag and drop files or directories here</p>
        </div>

        <Card className="p-8 mb-8">
          <div 
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging 
                ? 'border-brand-teal bg-brand-teal/10' 
                : 'border-slate-700 hover:border-slate-600'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">Drag & drop files here</p>
            <p className="text-slate-600 text-sm mb-4">or</p>
            <input 
              type="file" 
              multiple 
              onChange={handleFileInput}
              className="hidden" 
              id="file-upload"
              accept=".txt,.md,.pdf,.doc,.docx,text/*"
            />
            <label htmlFor="file-upload" className="inline-block px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-white cursor-pointer transition-colors">
              Browse Files
            </label>
            <p className="text-slate-600 text-xs mt-4">Supports: PDF, DOC, DOCX, TXT, MD</p>
          </div>
        </Card>

        {files.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Selected Files</h3>
            <div className="space-y-3">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {file.type.startsWith('directory') ? (
                      <Folder className="w-6 h-6 text-brand-teal" />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-400" />
                    )}
                    <div>
                      <p className="text-white font-medium truncate max-w-xs">{file.name}</p>
                      <p className="text-slate-500 text-sm">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeFile(index)}
                    className="text-slate-500 hover:text-white"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={onBack} fullWidth>
            Back
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit} 
            fullWidth 
            icon={Check}
            disabled={files.length === 0 || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </div>
      </div>

      <UploadProgress
        isOpen={isUploading || (uploadProgress && uploadProgress.status === 'complete')}
        progress={uploadProgress}
        onClose={handleCloseProgress}
      />
    </>
  )
}