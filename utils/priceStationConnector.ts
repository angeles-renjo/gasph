// utils/priceStationConnector.ts
import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { FuelPrice } from '@/core/models/FuelPrice';

/**
 * Service to connect fuel prices with gas stations
 * Uses brand+city matching to associate DOE price data with actual stations
 */
export const PriceStationConnector = {
  /**
   * Get prices for a specific gas station
   * @param station The gas station
   * @returns Array of matching fuel prices
   */
  async getPricesForStation(station: GasStation): Promise<FuelPrice[]> {
    try {
      // Get latest week
      const { data: latestWeek } = await supabase
        .from('fuel_prices')
        .select('week_of')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      if (!latestWeek) {
        return [];
      }

      // Get matching prices using brand+city
      const { data: prices, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of)
        .eq('area', station.city)
        .ilike('brand', station.brand); // Case-insensitive match

      if (error) {
        console.error('Error fetching prices for station:', error);
        return [];
      }

      return prices || [];
    } catch (error) {
      console.error('Error in getPricesForStation:', error);
      return [];
    }
  },

  /**
   * Find matching stations for a specific price entry
   * @param price The fuel price entry
   * @param stations Array of stations to search
   * @returns Matching stations
   */
  findMatchingStations(price: FuelPrice, stations: GasStation[]): GasStation[] {
    // Convert to lowercase for case-insensitive matching
    const priceBrand = price.brand.toLowerCase();
    const priceArea = price.area.toLowerCase();

    // Find stations that match both brand and city
    return stations.filter(
      (station) =>
        station.brand.toLowerCase() === priceBrand &&
        station.city.toLowerCase() === priceArea
    );
  },

  /**
   * Get price display name for UI consistency
   * @param price The fuel price entry
   * @returns Name for display in the UI
   */
  getPriceDisplayName(price: FuelPrice): string {
    return `${price.brand} - ${price.area}`;
  },

  /**
   * Check if a station search query might be referring to a price entry
   * @param query The search query
   * @returns Boolean indicating if this might be a price-related search
   */
  isPriceRelatedSearch(query: string): boolean {
    // Split the query to check if it has parts that might be brand+city
    const parts = query.split(/\s+/);
    return parts.length >= 2;
  },

  /**
   * Get latest prices for all fuel types
   * @returns Object with fuel types as keys and corresponding prices
   */
  async getLatestPrices(): Promise<Record<string, FuelPrice[]>> {
    try {
      // Get latest week
      const { data: latestWeek } = await supabase
        .from('fuel_prices')
        .select('week_of')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      if (!latestWeek) {
        return {};
      }

      // Get all prices for the latest week
      const { data: prices, error } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of);

      if (error) {
        console.error('Error fetching latest prices:', error);
        return {};
      }

      // Group by fuel type
      const pricesByFuelType: Record<string, FuelPrice[]> = {};

      prices?.forEach((price) => {
        if (!pricesByFuelType[price.fuel_type]) {
          pricesByFuelType[price.fuel_type] = [];
        }

        pricesByFuelType[price.fuel_type].push(price);
      });

      return pricesByFuelType;
    } catch (error) {
      console.error('Error in getLatestPrices:', error);
      return {};
    }
  },
};
