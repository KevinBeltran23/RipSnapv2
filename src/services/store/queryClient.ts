import { QueryClient } from '@tanstack/react-query';
import {
  PersistedClient,
  Persister,
} from '@tanstack/react-query-persist-client';
import { createMMKV } from 'react-native-mmkv';

const storage = createMMKV({ id: 'react-query-cache' });

export const clientPersister: Persister = {
  persistClient: async (client: PersistedClient) => {
    try {
      storage.set('react-query-cache', JSON.stringify(client));
    } catch {
      // Cache persistence is best-effort; the in-memory client remains usable.
    }
  },
  restoreClient: async () => {
    const cacheStr = storage.getString('react-query-cache');
    if (!cacheStr) {
      return undefined;
    }

    try {
      return JSON.parse(cacheStr) as PersistedClient;
    } catch {
      storage.remove('react-query-cache');
      return undefined;
    }
  },
  removeClient: async () => {
    try {
      storage.remove('react-query-cache');
    } catch {
      return;
    }
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
