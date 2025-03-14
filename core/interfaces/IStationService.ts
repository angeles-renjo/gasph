// /core/interfaces/IStationService.ts
import { GasStation } from '../models/GasStation';

export interface IStationService {
  getStationById(id: string): Promise<GasStation | null>;
  getStationsByBrand(brand: string): Promise<GasStation[]>;
  getStationsByCity(city: string): Promise<GasStation[]>;
  getStationsNearby(
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<GasStation[]>;
  searchStations(query: string): Promise<GasStation[]>;
}
