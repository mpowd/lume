import { useQueryClient } from '@tanstack/react-query'
import {
    useListMetrics,
    useCreateMetric,
    useUpdateMetric,
    useDeleteMetric,
    getListMetricsQueryKey,
} from '../api/generated'

export const useMetrics = () => {
    const queryClient = useQueryClient()
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: getListMetricsQueryKey() })

    const { data, isLoading, error: queryError } = useListMetrics()

    const { mutateAsync: createMutation } = useCreateMetric({
        mutation: { onSuccess: invalidate },
    })
    const { mutateAsync: updateMutation } = useUpdateMetric({
        mutation: { onSuccess: invalidate },
    })
    const { mutateAsync: deleteMutation } = useDeleteMetric({
        mutation: { onSuccess: invalidate },
    })

    const metrics = data?.metrics || []
    const error = queryError ? queryError.message || 'Failed to load metrics' : null

    return {
        metrics,
        isLoading,
        error,
        createMetric: (data) => createMutation({ data }),
        updateMetric: (id, data) => updateMutation({ metricId: id, data }),
        deleteMetric: (id) => deleteMutation({ metricId: id }),
        reload: invalidate,
    }
}