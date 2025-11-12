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
      failed: [],
      total_chunks: 0,
      embedded_chunks: 0
    })

    let eventSource = null
    let hasReceivedComplete = false

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      eventSource = new EventSource(
        `${API_BASE_URL}/website/upload-documents-stream?collection_name=${encodeURIComponent(collectionName)}&urls=${encodeURIComponent(JSON.stringify(urls))}`
      )

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.status === 'complete') {
            hasReceivedComplete = true
            setUploadProgress({
              status: 'complete',
              message: 'Upload complete!',
              current: data.total_processed || data.total || urls.length,
              total: data.total_processed || data.total || urls.length,
              processed: data.processed_urls || data.processed || [],
              failed: data.failed_urls || data.failed || [],
              total_chunks: data.total_chunks || 0,
              embedded_chunks: data.total_chunks || 0
            })
            eventSource.close()
          } else if (data.status === 'error') {
            hasReceivedComplete = true
            setUploadProgress({
              status: 'error',
              message: data.message || 'An error occurred',
              current: data.current || 0,
              total: urls.length,
              processed: data.processed || [],
              failed: data.failed || [],
              total_chunks: data.total_chunks || 0,
              embedded_chunks: data.embedded_chunks || 0
            })
            eventSource.close()
          } else {
            // Update progress with all fields including embedding progress
            setUploadProgress({
              status: data.status,
              message: data.message,
              current: data.current,
              total: data.total,
              processed: data.processed || [],
              failed: data.failed || [],
              current_url: data.current_url,
              total_chunks: data.total_chunks || 0,
              embedded_chunks: data.embedded_chunks || 0
            })
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError, event.data)
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        
        // Only show error if we haven't received a complete message
        // Sometimes the connection closes naturally after completion
        if (!hasReceivedComplete) {
          setUploadProgress({
            status: 'error',
            message: 'Connection error. Please check if the backend is running.',
            current: 0,
            total: urls.length,
            processed: [],
            failed: [],
            total_chunks: 0,
            embedded_chunks: 0
          })
        }
        
        if (eventSource) {
          eventSource.close()
        }
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
        failed: [],
        total_chunks: 0,
        embedded_chunks: 0
      })
      
      if (eventSource) {
        eventSource.close()
      }
      
      return { success: false, error: error.message }
    }
  }

  const closeProgress = (onComplete) => {
    setIsUploading(false)
    setUploadProgress(null)
    // Call onComplete when user manually closes
    if (onComplete) onComplete()
  }

  const reset = () => {
    setUploadProgress(null)
    setIsUploading(false)
  }

  return {
    uploadProgress,
    isUploading,
    startUpload,
    closeProgress,
    reset
  }
}