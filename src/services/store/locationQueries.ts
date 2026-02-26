import { useQuery } from '@tanstack/react-query';
import { getLocations } from '../firebase/locations';

export const LOCATIONS_QUERY_KEY = ['locations'];

export function useLocationsQuery() {
    return useQuery({
        queryKey: LOCATIONS_QUERY_KEY,
        queryFn: async () => {
            return await getLocations();
        },
    });
}
