// src/core/services/PriceService.ts
import { IPriceService } from '@/core/interfaces/IPriceService';
import { FuelPrice } from '@/core/models/FuelPrice';
import { IFuelPriceRepository } from '@/core/interfaces/IFuelPriceRepository';

export class PriceService implements IPriceService {
  private fuelPriceRepository: IFuelPriceRepository;

  constructor(fuelPriceRepository: IFuelPriceRepository) {
    this.fuelPriceRepository = fuelPriceRepository;
  }

  async getPricesByArea(area: string): Promise<FuelPrice[]> {
    return this.fuelPriceRepository.findByArea(area);
  }

  async getPricesByFuelType(fuelType: string): Promise<FuelPrice[]> {
    return this.fuelPriceRepository.findByFuelType(fuelType);
  }

  async getPricesByBrand(brand: string): Promise<FuelPrice[]> {
    return this.fuelPriceRepository.findByBrand(brand);
  }

  async getLatestPrices(): Promise<FuelPrice[]> {
    return this.fuelPriceRepository.findLatest();
  }

  async getPriceHistory(
    area: string,
    fuelType: string,
    weeks: number
  ): Promise<FuelPrice[]> {
    // Get current date
    const now = new Date();

    // Create array to hold results
    const results: FuelPrice[] = [];

    // Collect prices for each week going back 'weeks' number of weeks
    for (let i = 0; i < weeks; i++) {
      // Calculate the date for this week
      const weekDate = new Date(now);
      weekDate.setDate(weekDate.getDate() - i * 7);

      try {
        // Find prices for this week
        const weekPrices = await this.fuelPriceRepository.findByWeek(weekDate);

        // Filter by area and fuel type
        const filteredPrices = weekPrices.filter(
          (price) => price.area === area && price.fuelType === fuelType
        );

        // Add to results
        results.push(...filteredPrices);
      } catch (error) {
        console.error(`Error getting prices for week ${i}:`, error);
      }
    }

    return results;
  }
}
