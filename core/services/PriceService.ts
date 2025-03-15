import { supabase } from '@/utils/supabase';
import { FuelPrice } from '@/core/models/FuelPrice';
import { BaseService } from './BaseService';

export class PriceService extends BaseService<FuelPrice> {
  constructor() {
    super('fuel_prices');
  }

  async getPricesByArea(area: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('area', area)
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by area:', error);
      throw new Error('Failed to fetch fuel prices by area');
    }

    return data || [];
  }

  async getPricesByFuelType(fuelType: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('fuel_type', fuelType)
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by fuel type:', error);
      throw new Error('Failed to fetch fuel prices by fuel type');
    }

    return data || [];
  }

  async getPricesByBrand(brand: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('brand', brand)
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by brand:', error);
      throw new Error('Failed to fetch fuel prices by brand');
    }

    return data || [];
  }

  async getLatestPrices(): Promise<FuelPrice[]> {
    const { data: latestData, error: latestError } = await supabase
      .from(this.tableName)
      .select('week_of')
      .order('week_of', { ascending: false })
      .limit(1)
      .single();

    if (latestError) {
      console.error('Error fetching latest week:', latestError);
      throw new Error('Failed to fetch latest prices');
    }

    const latestWeek = latestData?.week_of;

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('week_of', latestWeek);

    if (error) {
      console.error('Error fetching latest prices:', error);
      throw new Error('Failed to fetch latest prices');
    }

    return data || [];
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
      const formattedDate = weekDate.toISOString().split('T')[0];

      try {
        // Find prices for this week
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('week_of', formattedDate);

        if (error) {
          console.error(`Error getting prices for week ${i}:`, error);
          continue;
        }

        // Filter by area and fuel type
        const filteredPrices = data.filter(
          (price) => price.area === area && price.fuel_type === fuelType
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
