import { useQueryClient } from '@tanstack/react-query'
import {
  useListCollections,
  useCreateCollection,
  useDeleteCollection,
  getListCollectionsQueryKey,
} from '../api/generated'

export const useCollections = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListCollectionsQueryKey() })

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useListCollections()

  const { mutateAsync: createMutation } = useCreateCollection({
    mutation: { onSuccess: invalidate },
  })

  const { mutateAsync: deleteMutation } = useDeleteCollection({
    mutation: { onSuccess: invalidate },
  })

  const collections = data?.collection_names || []
  const error = queryError ? queryError.message || 'Failed to load collections' : null

  const createCollection = async (collectionData) => {
    try {
      await createMutation({ data: collectionData })
      return { success: true }
    } catch (err) {
      console.error('Error creating collection:', err)
      return { success: false, error: err.response?.data?.detail || 'Failed to create collection' }
    }
  }

  const deleteCollection = async (collectionName) => {
    try {
      await deleteMutation({ collectionName })
      return { success: true }
    } catch (err) {
      console.error('Error deleting collection:', err)
      return { success: false, error: 'Failed to delete collection' }
    }
  }

  return {
    collections,
    loading,
    error,
    createCollection,
    deleteCollection,
    reload: invalidate,
  }
}
