import { FuelPrice } from '../models/FuelPrice';
import { IRepository } from './IRepository';

export interface IFuelPriceRepository extends IRepository<FuelPrice> {
  findByArea(area: string): Promise<FuelPrice[]>;
  findByBrand(brand: string): Promise<FuelPrice[]>;
  findByFuelType(fuelType: string): Promise<FuelPrice[]>;
  findLatest(): Promise<FuelPrice[]>;
  findByWeek(weekOf: Date): Promise<FuelPrice[]>;
}
