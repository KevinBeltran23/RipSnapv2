import { useQuery } from '@tanstack/react-query';
import { searchLocationsByText } from '../firebase/locations';

export const SEARCH_QUERY_KEY = (query: string) => ['search', query];

export function useSearchQuery(query: string) {
    return useQuery({
        queryKey: SEARCH_QUERY_KEY(query),
        queryFn: async () => {
            if (!query.trim()) return [];
            return await searchLocationsByText(query);
        },
        enabled: query.trim().length > 0,
        staleTime: 1000 * 60 * 5, // 5 minutes fresh cache per-term
    });
}
