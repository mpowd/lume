import { useQueryClient } from '@tanstack/react-query'
import {
  useListDatasets,
  useCreateDataset,
  useUpdateDataset,
  useDeleteDataset,
  useGenerateRagasDataset,
  getListDatasetsQueryKey,
} from '../api/generated'

export const useDatasets = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() })

  const {
    data,
    isLoading: loading,
    error: queryError,
  } = useListDatasets()

  const { mutateAsync: createMutation } = useCreateDataset({
    mutation: { onSuccess: invalidate },
  })

  const { mutateAsync: updateMutation } = useUpdateDataset({
    mutation: { onSuccess: invalidate },
  })

  const { mutateAsync: deleteMutation } = useDeleteDataset({
    mutation: { onSuccess: invalidate },
  })

  const { mutateAsync: generateMutation } = useGenerateRagasDataset({
    mutation: { onSuccess: invalidate },
  })

  const datasets = data?.datasets || []
  const error = queryError ? queryError.message || 'Failed to load datasets' : null

  const createDataset = async (datasetData) => {
    try {
      await createMutation({ data: datasetData })
      return { success: true }
    } catch (err) {
      console.error('Error creating dataset:', err)
      return { success: false, error: 'Failed to create dataset' }
    }
  }

  const generateDataset = async (collectionName, datasetName, testsetSize) => {
    try {
      await generateMutation({
        data: {
          collection_name: collectionName,
          dataset_name: datasetName,
          testset_size: testsetSize,
        },
      })
      return { success: true }
    } catch (err) {
      console.error('Error generating dataset:', err)
      return { success: false, error: 'Failed to generate dataset' }
    }
  }

  const updateDataset = async (id, data) => {
    try {
      await updateMutation({ datasetId: id, data })
      return { success: true }
    } catch (err) {
      console.error('Error updating dataset:', err)
      return { success: false, error: 'Failed to update dataset' }
    }
  }

  const deleteDataset = async (id) => {
    try {
      await deleteMutation({ datasetId: id })
      return { success: true }
    } catch (err) {
      console.error('Error deleting dataset:', err)
      return { success: false, error: 'Failed to delete dataset' }
    }
  }

  return {
    datasets,
    loading,
    error,
    createDataset,
    generateDataset,
    updateDataset,
    deleteDataset,
    reload: invalidate,
  }
}
