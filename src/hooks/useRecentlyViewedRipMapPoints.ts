import { useCallback, useEffect, useMemo, useState } from 'react';
import { createMMKV } from 'react-native-mmkv';
import type { RipMapPoint } from '../types/ripMap';

const recentlyViewedStorage = createMMKV({
  id: 'rip-map-recently-viewed-cache',
});

const MAX_RECENTLY_VIEWED_POINTS = 6;

const getRecentlyViewedStorageKey = (userId: string) =>
  `recently-viewed-map-points:${userId}`;

const readRecentlyViewedPointIds = (userId?: string | null): string[] => {
  if (!userId) return [];

  const rawPointIds = recentlyViewedStorage.getString(
    getRecentlyViewedStorageKey(userId),
  );
  if (!rawPointIds) return [];

  try {
    const parsedPointIds = JSON.parse(rawPointIds);
    if (!Array.isArray(parsedPointIds)) return [];

    return parsedPointIds.filter(
      (pointId): pointId is string => typeof pointId === 'string',
    );
  } catch {
    return [];
  }
};

export function useRecentlyViewedRipMapPoints(
  userId: string | undefined,
  visiblePoints: RipMapPoint[],
) {
  const [recentlyViewedPointIds, setRecentlyViewedPointIds] = useState<
    string[]
  >(() => readRecentlyViewedPointIds(userId));

  useEffect(() => {
    setRecentlyViewedPointIds(readRecentlyViewedPointIds(userId));
  }, [userId]);

  const recentlyViewedPoints = useMemo(() => {
    const pointById = new Map(
      visiblePoints.map(point => [point.id, point] as const),
    );

    return recentlyViewedPointIds
      .map(pointId => pointById.get(pointId))
      .filter((point): point is RipMapPoint => Boolean(point));
  }, [recentlyViewedPointIds, visiblePoints]);

  const recordViewedPoint = useCallback(
    (point: RipMapPoint) => {
      if (!userId) return;

      setRecentlyViewedPointIds(currentPointIds => {
        const nextPointIds = [
          point.id,
          ...currentPointIds.filter(pointId => pointId !== point.id),
        ].slice(0, MAX_RECENTLY_VIEWED_POINTS);

        recentlyViewedStorage.set(
          getRecentlyViewedStorageKey(userId),
          JSON.stringify(nextPointIds),
        );

        return nextPointIds;
      });
    },
    [userId],
  );

  return {
    recentlyViewedPoints,
    recordViewedPoint,
  };
}
