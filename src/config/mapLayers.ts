import type { RipMapLayer, RipMapLayerId } from '../types/ripMap';

export const RIP_MAP_LAYERS: RipMapLayer[] = [
  {
    id: 'ripUploads',
    label: 'Rip uploads',
    description: 'Capture locations uploaded from the Live Feed tab.',
    icon: 'map-marker-wave',
    color: '#0EA5A3',
  },
];

export const DEFAULT_VISIBLE_RIP_LAYER_IDS: RipMapLayerId[] =
  RIP_MAP_LAYERS.map(layer => layer.id);

export const RIP_MAP_LAYER_BY_ID = RIP_MAP_LAYERS.reduce(
  (layers, layer) => {
    layers[layer.id] = layer;
    return layers;
  },
  {} as Record<RipMapLayerId, RipMapLayer>,
);
