// src/types/accessibility.ts
import { CategoryData } from './location';

// Define the Media interface
export interface Media {
  url: string;
  path: string;
  type: 'image' | 'pdf' | 'video' | 'unknown';
  name?: string;
}

export interface AccessibilityLocation {
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  categories?: { [key: string]: CategoryData };
  description?: string;
  images?: Media[];
  userId?: string;
  createdAt: number;
  updatedAt?: number;
}
