import { useQuery } from '@tanstack/react-query';
import { getLocationMediaByCategory } from '../firebase/storage';
import { Media } from '../../types/media';

export const mediaQueryKey = (locationId: string, categoryName: string) =>
    ['media', locationId, categoryName];

export function useMediaByCategoryQuery(locationId?: string, categoryName?: string) {
    return useQuery({
        queryKey: mediaQueryKey(locationId || '', categoryName || ''),
        queryFn: async (): Promise<Media[]> => {
            if (!locationId || !categoryName) return [];
            return await getLocationMediaByCategory(locationId, categoryName);
        },
        enabled: !!locationId && !!categoryName,
        staleTime: 1000 * 60 * 5, // 5 minutes fresh
    });
}
