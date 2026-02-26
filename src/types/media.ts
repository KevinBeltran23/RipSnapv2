/**
 * Firestore-layer media and accessibility-location types.
 * Renamed from types/media.ts — old path re-exports from here.
 */

export interface Media {
    url: string;
    path: string;
    type: 'image' | 'pdf' | 'video';
    name: string;
}

export interface AccessibilityLocation {
    id?: string;
    name: string;
    latitude: number;
    longitude: number;
    description?: string;
    categories?: Record<string, { severity?: string; details?: string }>;
    images?: Media[];
    createdAt?: number;
}
