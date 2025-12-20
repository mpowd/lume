// hooks/useFileUpload.js
import { useState } from 'react'

export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [taskId, setTaskId] = useState(null)

  const startUpload = async (collectionName, formData, onComplete) => {
    if (formData.getAll('files').length === 0) {
      return { success: false, error: 'No files to upload' }
    }

    setIsUploading(true)
    setUploadProgress({
      status: 'starting',
      title: 'Starting Upload',
      message: 'Preparing files...',
      stages: [],
      stats: [],
      failed: []
    })

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      
      // Start the upload task
      const uploadResponse = await fetch(`${API_BASE_URL}/file/upload-files`, {
        method: 'POST',
        body: formData
      })

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.statusText}`)
      }

      const uploadData = await uploadResponse.json()
      const newTaskId = uploadData.task_id
      
      if (!newTaskId) {
        throw new Error('No task ID returned from server')
      }
      
      setTaskId(newTaskId)
      
      // Poll for progress updates
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`${API_BASE_URL}/file/upload-progress/${newTaskId}`)
          
          if (!progressResponse.ok) {
            throw new Error(`Progress check failed: ${progressResponse.statusText}`)
          }
          
          const progressData = await progressResponse.json()

          console.log('File upload progress:', {
            status: progressData.status,
            title: progressData.title,
            message: progressData.message,
            hasStats: !!progressData.stats,
            statsLength: progressData.stats?.length || 0,
            stats: progressData.stats,
            stages: progressData.stages?.map(s => ({
              label: s.label,
              current: s.current,
              total: s.total,
              is_current: s.is_current
            }))
          })
          
          // Update state with the new progress data
          setUploadProgress({
            status: progressData.status,
            title: progressData.title,
            message: progressData.message,
            stages: progressData.stages || [],
            stats: progressData.stats || [],
            failed: progressData.failed || []
          })
          
          // Continue polling if not complete or error
          if (progressData.status !== 'complete' && progressData.status !== 'error') {
            setTimeout(pollProgress, 500) // Poll every 500ms for smooth updates
          } else {
            console.log('File upload finished with status:', progressData.status)
            // Keep isUploading true so modal stays open showing completion stats
          }
        } catch (error) {
          console.error('Error polling progress:', error)
          setUploadProgress({
            status: 'error',
            title: 'Progress Check Failed',
            message: error.message || 'Failed to get upload progress',
            stages: [],
            stats: [],
            failed: []
          })
          setIsUploading(false)
        }
      }
      
      // Start polling immediately
      pollProgress()
      
      return { success: true, taskId: newTaskId }
    } catch (error) {
      console.error('Error starting file upload:', error)
      setUploadProgress({
        status: 'error',
        title: 'Upload Failed',
        message: error.message || 'Failed to start upload',
        stages: [],
        stats: [],
        failed: []
      })
      setIsUploading(false)
      return { success: false, error: error.message }
    }
  }

  const closeProgress = (onComplete) => {
    setIsUploading(false)
    setUploadProgress(null)
    setTaskId(null)
    // Call onComplete when user manually closes
    if (onComplete) onComplete()
  }

  const reset = () => {
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
    taskId
  }
}