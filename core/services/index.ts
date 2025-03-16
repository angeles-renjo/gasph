import { PriceService } from './PriceService';
import { StationService } from './StationService';
import { LocationService } from './LocationService';
import { GooglePlacesService } from './GooglePlacesService';
import { GasStationImportService } from './GasStationImportService';
import Constants from 'expo-constants';

// Get Google API key from environment variables or Constants
const googleApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_API_KEY ||
  (Constants.expoConfig?.extra?.googleApiKey as string) ||
  '';

// Create and export singleton instances
export const priceService = new PriceService();
export const stationService = new StationService();
export const locationService = new LocationService();
export const googlePlacesService = new GooglePlacesService(googleApiKey);
export const gasStationImportService = new GasStationImportService(
  googlePlacesService,
  stationService
);

export * from './PriceReportingService';
export { priceReportingService } from './PriceReportingService';
