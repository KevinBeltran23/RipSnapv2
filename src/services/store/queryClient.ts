import { QueryClient } from '@tanstack/react-query';
import {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'react-query-cache' });

export const clientPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    storage.set('react-query-cache', JSON.stringify(client));
  },
  restoreClient: async () => {
    const cacheStr = storage.getString('react-query-cache');
    if (!cacheStr) {
      return undefined;
    }
    return JSON.parse(cacheStr) as PersistedClient;
  },
  removeClient: async () => {
    storage.remove('react-query-cache');
  },
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours caching
      staleTime: 1000 * 60 * 5, // 5 minutes fresh data
    },
  },
});
