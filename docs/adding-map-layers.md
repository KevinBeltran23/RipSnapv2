# Adding A Map Layer

Use this when adding a new switchable layer to the RipFinder map.

The map renderer should not change for normal ping layers. Add the layer to the map data contract, give it metadata, then feed it points.

## 1. Add The Layer Id

Edit `src/types/ripMap.ts`.

Add the new id to `RipMapLayerId`:

```ts
export type RipMapLayerId = 'public' | 'admin' | 'extra' | 'winter';
```

Add a matching key to `RipMapPointsByLayer`:

```ts
export interface RipMapPointsByLayer {
  public: RipMapPoint[];
  admin: RipMapPoint[];
  extra: RipMapPoint[];
  winter: RipMapPoint[];
}
```

Use a short camelCase id. Examples:

```ts
'admin'
'winter'
'summer'
'officialHazards'
```

## 2. Add Layer Metadata

Edit `src/config/mapLayers.ts`.

Add one object to `RIP_MAP_LAYERS`:

```ts
{
  id: 'winter',
  label: 'Winter',
  description: 'Winter season upload locations.',
  icon: 'snowflake',
  color: '#38BDF8',
  markerGlyph: 'W',
  markerTextColor: '#0F172A',
  stylePreset: 'outdoors',
}
```

This controls the layer toggle label, marker treatment, and base-map preset.
Set `EXPO_PUBLIC_MAPBOX_<LAYER>_STYLE_URL` to override the preset with a
Mapbox Studio style URL.

## 3. Add An Empty Array For The Layer

Edit `src/utils/ripMapPoints.ts`.

Update `emptyRipMapPointsByLayer`:

```ts
export const emptyRipMapPointsByLayer = (): RipMapPointsByLayer => ({
  public: [],
  admin: [],
  extra: [],
  winter: [],
});
```

This prevents undefined layer data while Firebase is loading.

## 4. Decide The Source Type

Choose one of these patterns.

### Option A: Filtered Layer From Existing Uploads

Use this when the layer is just a view of existing `ripsnap_captures`.

Examples:

- winter uploads
- summer uploads
- my uploads
- recent uploads

Edit `groupRipMapPointsByLayer` in `src/utils/ripMapPoints.ts`:

```ts
export const groupRipMapPointsByLayer = (
  records: RipCaptureMapRecord[],
): RipMapPointsByLayer => {
  const pointsByLayer = emptyRipMapPointsByLayer();

  records.forEach(record => {
    const uploadPoint = normalizeCaptureToRipMapPoint(record, 'public');
    if (uploadPoint) pointsByLayer.public.push(uploadPoint);

    const winterPoint = normalizeCaptureToRipMapPoint(record, 'winter');
    if (winterPoint && isWinterUpload(winterPoint.createdAt)) {
      pointsByLayer.winter.push(winterPoint);
    }
  });

  return pointsByLayer;
};
```

Add the helper near the bottom of the file:

```ts
const isWinterUpload = (createdAt?: string) => {
  if (!createdAt) return false;
  const month = new Date(createdAt).getMonth();
  return month === 11 || month <= 1;
};
```

### Option B: New Firebase Collection

Use this when the layer has different data or different permissions.

Examples:

- admin points
- official hazards
- curated beach zones

Create a Firebase reader in `src/services/firebase/`.

Example: `src/services/firebase/adminMapPoints.ts`

```ts
import {
  collection,
  FirebaseFirestoreTypes,
  getDocs,
  getFirestore,
  orderBy,
  query,
} from '@react-native-firebase/firestore';
import type { RipCaptureMapRecord } from '../../utils/ripMapPoints';

const db = getFirestore();

export async function getAdminMapPointRecords(): Promise<RipCaptureMapRecord[]> {
  const snapshot = await getDocs(
    query(collection(db, 'admin_map_points'), orderBy('createdAt', 'desc')),
  );

  return snapshot.docs.map(
    (docSnap: FirebaseFirestoreTypes.QueryDocumentSnapshot) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }),
  ) as RipCaptureMapRecord[];
}
```

Then edit `src/services/store/ripMapQueries.ts`:

```ts
import { getAdminMapPointRecords } from '../firebase/adminMapPoints';
import {
  emptyRipMapPointsByLayer,
  groupRipMapPointsByLayer,
  normalizeCaptureToRipMapPoint,
} from '../../utils/ripMapPoints';
```

Update the query:

```ts
queryFn: async () => {
  const [captureRecords, adminRecords] = await Promise.all([
    getRipMapCaptureRecords(),
    getAdminMapPointRecords(),
  ]);

  const pointsByLayer = groupRipMapPointsByLayer(captureRecords);

  adminRecords.forEach(record => {
    const point = normalizeCaptureToRipMapPoint(record, 'admin');
    if (point) pointsByLayer.admin.push(point);
  });

  return pointsByLayer;
},
```

## 5. Check Firestore Rules

If the layer uses a new collection, add rules for it.

Example:

```js
match /admin_map_points/{pointId} {
  allow read: if request.auth != null;
  allow create, update, delete: if request.auth != null
                                && request.auth.token.admin == true;
}
```

If the layer uses `ripsnap_captures`, no new rule is needed.

## 6. Verify The Layer

Run:

```sh
yarn tsc --noEmit
yarn lint
```

Then manually check:

- The layer appears in the layer toggle sheet.
- Selecting it makes it the only active map layer.
- Tapping a ping opens the detail sheet.
- The marker color matches `src/config/mapLayers.ts`.

## What Not To Change

Do not edit `GoogleRipMap` for normal ping layers.

Only change the renderer if the new layer needs a different visual shape, such as:

- polygons
- heatmaps
- raster tiles
- vector tiles
- clustered points
