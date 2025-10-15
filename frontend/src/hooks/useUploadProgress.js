import { useState } from 'react'

export const useUploadProgress = () => {
  const [uploadProgress, setUploadProgress] = useState(null)
  const [isUploading, setIsUploading] = useState(false)

  const startUpload = async (collectionName, urls, onComplete) => {
    if (urls.length === 0) {
      return { success: false, error: 'No URLs to upload' }
    }

    setIsUploading(true)
    setUploadProgress({
      status: 'starting',
      message: 'Initializing upload...',
      current: 0,
      total: urls.length,
      processed: [],
      failed: []
    })

    try {
      const eventSource = new EventSource(
        `http://localhost:8000/website/upload-documents-stream?collection_name=${encodeURIComponent(collectionName)}&urls=${encodeURIComponent(JSON.stringify(urls))}`
      )

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)
        
        if (data.status === 'complete') {
          setUploadProgress({
            status: 'complete',
            message: 'Upload complete!',
            current: data.total_processed,
            total: data.total_processed,
            processed: data.processed_urls,
            failed: data.failed_urls,
            total_chunks: data.total_chunks
          })
          eventSource.close()
          
          setTimeout(() => {
            setIsUploading(false)
            if (onComplete) onComplete()
          }, 3000)
        } else if (data.status === 'error') {
          setUploadProgress({
            status: 'error',
            message: data.message || 'An error occurred',
            current: data.current || 0,
            total: urls.length,
            processed: data.processed || [],
            failed: data.failed || []
          })
          eventSource.close()
        } else {
          setUploadProgress({
            status: data.status,
            message: data.message,
            current: data.current,
            total: data.total,
            processed: data.processed || [],
            failed: data.failed || [],
            current_url: data.current_url
          })
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        eventSource.close()
        setUploadProgress({
          status: 'error',
          message: 'Connection error. Please try again.',
          current: 0,
          total: urls.length,
          processed: [],
          failed: []
        })
        
        setTimeout(() => {
          setIsUploading(false)
        }, 3000)
      }

      return { success: true }
    } catch (error) {
      console.error('Error uploading documents:', error)
      setUploadProgress({
        status: 'error',
        message: error.message || 'Upload failed',
        current: 0,
        total: urls.length,
        processed: [],
        failed: []
      })
      
      setTimeout(() => {
        setIsUploading(false)
      }, 3000)
      
      return { success: false, error: error.message }
    }
  }

  const reset = () => {
    setUploadProgress(null)
    setIsUploading(false)
  }

  return {
    uploadProgress,
    isUploading,
    startUpload,
    reset
  }
}