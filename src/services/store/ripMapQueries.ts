import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createRipMapUploadRecord,
  getRipMapCaptureRecords,
  type CreateRipMapUploadParams,
} from '../firebase/ripMapCaptures';
import { groupRipMapPointsByLayer } from '../../utils/ripMapPoints';

export const RIP_MAP_POINTS_QUERY_KEY = ['ripMapPoints'];

export function useRipMapPointsQuery() {
  return useQuery({
    queryKey: RIP_MAP_POINTS_QUERY_KEY,
    queryFn: async () => {
      const records = await getRipMapCaptureRecords();
      return groupRipMapPointsByLayer(records);
    },
    staleTime: 1000 * 60,
  });
}

export function useCreateRipMapUploadMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateRipMapUploadParams) =>
      createRipMapUploadRecord(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RIP_MAP_POINTS_QUERY_KEY });
    },
  });
}
