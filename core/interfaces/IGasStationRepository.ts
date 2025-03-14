import { GasStation } from '../models/GasStation';
import { IRepository } from './IRepository';
import { Coordinates } from './ILocationService';

export interface IGasStationRepository extends IRepository<GasStation> {
  findByBrand(brand: string): Promise<GasStation[]>;
  findByCity(city: string): Promise<GasStation[]>;
  findNearby(coordinates: Coordinates, radiusKm: number): Promise<GasStation[]>;
  search(query: string): Promise<GasStation[]>;
}
