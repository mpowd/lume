import { useState, useRef } from 'react'
import { uploadWebsites, getUploadProgress } from '../api/generated'

export const useWebsiteUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [taskId, setTaskId] = useState(null)
  const pollRef = useRef(null)

  const startUpload = async (collectionName, urls, onComplete) => {
    if (!urls || urls.length === 0) {
      return { success: false, error: 'No URLs to upload' }
    }

    setIsUploading(true)
    setUploadProgress({
      status: 'starting',
      title: 'Starting Website Upload',
      message: 'Preparing to crawl URLs...',
      stages: [],
      stats: [],
      failed: [],
    })

    try {
      const result = await uploadWebsites({
        collection_name: collectionName,
        urls,
      })

      const newTaskId = result.task_id
      if (!newTaskId) {
        throw new Error('No task ID returned from server')
      }

      setTaskId(newTaskId)

      // Poll for progress
      const pollProgress = async () => {
        try {
          const progress = await getUploadProgress(newTaskId)

          setUploadProgress({
            status: progress.status,
            title: progress.title,
            message: progress.message,
            stages: progress.stages || [],
            stats: progress.stats || [],
            failed: progress.failed || [],
          })

          if (progress.status !== 'complete' && progress.status !== 'error') {
            pollRef.current = setTimeout(pollProgress, 500)
          }
        } catch (err) {
          console.error('Error polling progress:', err)
          setUploadProgress({
            status: 'error',
            title: 'Progress Check Failed',
            message: err.message || 'Failed to get upload progress',
            stages: [],
            stats: [],
            failed: [],
          })
          setIsUploading(false)
        }
      }

      pollProgress()
      return { success: true, taskId: newTaskId }
    } catch (err) {
      console.error('Error starting website upload:', err)
      setUploadProgress({
        status: 'error',
        title: 'Upload Failed',
        message: err.message || 'Failed to start upload',
        stages: [],
        stats: [],
        failed: [],
      })
      setIsUploading(false)
      return { success: false, error: err.message }
    }
  }

  const closeProgress = (onComplete) => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setIsUploading(false)
    setUploadProgress(null)
    setTaskId(null)
    if (onComplete) onComplete()
  }

  const reset = () => {
    if (pollRef.current) clearTimeout(pollRef.current)
    setUploadProgress(null)
    setIsUploading(false)
    setTaskId(null)
  }

  return {
    uploadProgress,
    isUploading,
    startUpload,
    closeProgress,
    reset,
    taskId,
  }
}
