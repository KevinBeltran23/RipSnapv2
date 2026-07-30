import type { RipMapLayer, RipMapLayerId } from '../types/ripMap';

export const RIP_MAP_LAYERS: RipMapLayer[] = [
  {
    id: 'public',
    label: 'Public',
    description: 'Public capture locations uploaded by app users.',
    icon: 'waves',
    color: '#0EA5A3',
    markerGlyph: 'P',
    markerTextColor: '#0F172A',
    stylePreset: 'outdoors',
  },
  {
    id: 'admin',
    label: 'Admin',
    description: 'Admin-managed capture locations and observations.',
    icon: 'shield-check',
    color: '#2563EB',
    markerGlyph: 'A',
    markerTextColor: '#FFFFFF',
    stylePreset: 'light',
  },
  {
    id: 'extra',
    label: 'Extra',
    description: 'Additional map observations and supporting data.',
    icon: 'layers-triple',
    color: '#F59E0B',
    markerGlyph: 'E',
    markerTextColor: '#1F2937',
    stylePreset: 'satelliteStreet',
  },
];

export const DEFAULT_VISIBLE_RIP_LAYER_IDS: RipMapLayerId[] = ['public'];

export const RIP_MAP_LAYER_BY_ID = RIP_MAP_LAYERS.reduce(
  (layers, layer) => {
    layers[layer.id] = layer;
    return layers;
  },
  {} as Record<RipMapLayerId, RipMapLayer>,
);

export const getUploadableRipMapLayers = (isAdmin: boolean) =>
  RIP_MAP_LAYERS.filter(layer => isAdmin || layer.id !== 'admin');

export const canUploadToRipMapLayer = (
  layerId: RipMapLayerId,
  isAdmin: boolean,
) => layerId !== 'admin' || isAdmin;
