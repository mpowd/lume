import { useQueryClient } from '@tanstack/react-query'
import {
  useListAssistants,
  getListAssistantsQueryKey,
} from '../api/generated'

export const useAssistants = () => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getListAssistantsQueryKey() })

  const {
    data: assistants = [],
    isLoading: loading,
    error: queryError,
  } = useListAssistants()

  const error = queryError ? queryError.message || 'Failed to load assistants' : null

  return {
    assistants,
    loading,
    error,
    reload: invalidate,
  }
}
