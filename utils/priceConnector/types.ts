// utils/priceConnector/types.ts
// Type definitions for the price connector modules

import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';

// Location and area types
export type AreaName = string;
export type CityName = string;
export type ProvinceName = 'NCR' | 'Metro Manila' | 'CALABARZON' | string;

// Brand-related types
export type BrandName = string;

// Confidence levels and scores
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type ConfidenceScore = number; // Value between 0 and 1

// Matching-related types
export type NormalizedString = string;

// Known city and area constants
export const NCR_CITIES = [
  'quezon city',
  'manila',
  'makati',
  'pasig',
  'taguig',
  'pasay',
  'mandaluyong',
  'san juan',
  'caloocan',
  'parañaque',
  'marikina',
  'muntinlupa',
  'las piñas',
  'valenzuela',
  'navotas',
  'malabon',
  'pateros',
] as const;

export type NCRCity = (typeof NCR_CITIES)[number];

export const NCR_AREAS = ['ncr', 'metro manila'] as const;
export type NCRArea = (typeof NCR_AREAS)[number];

// Price station match result
export interface StationMatch {
  station: GasStation | null;
  confidence: ConfidenceScore;
}

// Grouped stations
export type GroupedStations = Record<string, GasStation[]>;

// City and brand lookup key
export interface LocationKey {
  brand: NormalizedString;
  area: NormalizedString;
}

// Match result for a price and station
export interface PriceStationMatch {
  price: FuelPrice;
  station: GasStation;
  confidence: ConfidenceScore;
}
