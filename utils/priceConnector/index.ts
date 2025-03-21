// /utils/priceConnector/index.ts
// Central export for all price connector utilities
import { GasStation } from '@/core/models/GasStation';
import { FuelPrice } from '@/core/models/FuelPrice';

// Re-export all functions from utility files
export * from './queries';
export * from './matchers';
export * from './sorters';
export * from './transformers';

// You can add any additional exports or type definitions here

// Export simple type aliases for common object structures
export type GroupedStations = Record<string, GasStation[]>;
export type GroupedPrices = Record<string, FuelPrice[]>;
