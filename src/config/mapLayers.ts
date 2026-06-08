import type { RipMapLayer, RipMapLayerId } from '../types/ripMap';

export const RIP_MAP_LAYERS: RipMapLayer[] = [
  {
    id: 'public',
    label: 'Public',
    description: 'Public capture locations uploaded by app users.',
    icon: 'waves',
    color: '#0EA5A3',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Admin-managed capture locations and observations.',
    icon: 'shield-check',
    color: '#2563EB',
  },
  {
    id: 'extra',
    label: 'Extra',
    description: 'Additional map observations and supporting data.',
    icon: 'layers-triple',
    color: '#F59E0B',
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
