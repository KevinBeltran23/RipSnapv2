import { Colors } from '../hooks/useColors';
import { Media } from './accessibility'; // Import Media interface
import { SeverityLevel } from './severity';

export interface CategoryData {
  severity: SeverityLevel;
  details: string;
}

export interface LocationData {
  id: string;
  name: string;
  categories: { [key: string]: CategoryData };
  severity: SeverityLevel;
  severityColor: keyof Colors;
  accessibilityDetails?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  googleMapsUrl?: string;
  galleryImages: Media[]; // Changed to Media[]
  analysis?: string;
  chatOption?: string;
  media?: Media[]; // Ensuring media is also Media[] if used as direct property
}

export type DropdownOption = {
  label: string;
  value: string | number | null;
  icon?: string;
  colorKey?: keyof Colors;
};
