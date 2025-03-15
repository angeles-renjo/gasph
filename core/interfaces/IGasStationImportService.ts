// src/core/interfaces/IGasStationImportService.ts
import { GasStation } from '../models/GasStation';
import { PlaceDetails } from '../interfaces/IGooglePlacesService';

export interface IGasStationImportService {
  /**
   * Import gas stations from Google Places API for a specific city
   * @param city The city name to search for gas stations
   * @returns Number of gas stations imported
   */
  importGasStationsFromCity(city: string): Promise<number>;

  /**
   * Map Google Places details to GasStation model
   * @param placeDetails Place details from Google Places API
   * @returns Partial GasStation object
   */
  mapPlaceToGasStation(placeDetails: PlaceDetails): Partial<GasStation>;
}
