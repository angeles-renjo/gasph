import { FuelPrice } from '../models/FuelPrice';

export interface IPriceService {
  getPricesByArea(area: string): Promise<FuelPrice[]>;
  getPricesByFuelType(fuelType: string): Promise<FuelPrice[]>;
  getPricesByBrand(brand: string): Promise<FuelPrice[]>;
  getLatestPrices(): Promise<FuelPrice[]>;
  getPriceHistory(
    area: string,
    fuelType: string,
    weeks: number
  ): Promise<FuelPrice[]>;
}
