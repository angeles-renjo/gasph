// utils/demo-data-generator.ts
import type { FuelPrice } from '@/core/models/FuelPrice';
import { supabase } from './supabase';

/**
 * Utility for generating and importing demo fuel price data
 */
export class DemoDataGenerator {
  /**
   * Generate sample fuel price data
   * @param weekDate The date for which to generate data (defaults to current date)
   * @returns Array of generated FuelPrice objects
   */
  static generateFuelPriceData(weekDate?: string): FuelPrice[] {
    const date = weekDate || new Date().toISOString().split('T')[0];

    // Sample areas (cities in Metro Manila)
    const areas = [
      'Quezon City',
      'Manila City',
      'Makati City',
      'Pasig City',
      'Taguig City',
    ];

    // Fuel types
    const fuelTypes = ['RON 95', 'RON 91', 'DIESEL', 'DIESEL PLUS'];

    // Gas station brands
    const brands = ['PETRON', 'SHELL', 'CALTEX', 'PHOENIX', 'SEAOIL'];

    // Base prices per fuel type
    const basePrices: Record<string, number> = {
      'RON 95': 60.5,
      'RON 91': 56.75,
      DIESEL: 55.25,
      'DIESEL PLUS': 57.5,
    };

    // Generate sample data
    const fuelPrices: FuelPrice[] = [];

    for (const area of areas) {
      for (const fuelType of fuelTypes) {
        const basePrice = basePrices[fuelType];

        for (const brand of brands) {
          // Add some variance per brand
          const brandVariance = Math.random() * 3 - 1.5; // between -1.5 and 1.5

          // Add some variance between min and max
          const priceRange = Math.random() * 2 + 0.5; // between 0.5 and 2.5

          const minPrice = +(basePrice + brandVariance).toFixed(2);
          const maxPrice = +(minPrice + priceRange).toFixed(2);
          const commonPrice = +((minPrice + maxPrice) / 2).toFixed(2);

          fuelPrices.push({
            id: `${area}-${fuelType}-${brand}-${date}`
              .toLowerCase()
              .replace(/\s+/g, '-'),
            area,
            brand,
            fuelType,
            minPrice,
            maxPrice,
            commonPrice,
            weekOf: new Date(date),
            updatedAt: new Date(),
          });
        }
      }
    }

    return fuelPrices;
  }

  /**
   * Import sample fuel price data into the database
   * @param weekDate Optional specific date to use
   * @returns Summary of the import operation
   */
  static async importDemoData(weekDate?: string): Promise<{
    success: boolean;
    message: string;
    imported: number;
    errors: number;
    weekOf?: string;
  }> {
    try {
      // Generate the sample data
      const date = weekDate || new Date().toISOString().split('T')[0];
      const fuelPrices = this.generateFuelPriceData(date);

      if (!fuelPrices.length) {
        return {
          success: false,
          message: 'Failed to generate sample fuel price data',
          imported: 0,
          errors: 0,
        };
      }

      // Check if data for this week already exists
      const { data: existingData, error: checkError } = await supabase
        .from('fuel_prices')
        .select('id')
        .eq('week_of', date)
        .limit(1);

      if (checkError) {
        console.error('Error checking existing data:', checkError);
        return {
          success: false,
          message: `Error checking existing data: ${checkError.message}`,
          imported: 0,
          errors: 1,
        };
      }

      // If data already exists, let the caller know
      if (existingData && existingData.length > 0) {
        return {
          success: false,
          message: `Data for week of ${date} already exists. Please confirm to replace.`,
          imported: 0,
          errors: 0,
          weekOf: date,
        };
      }

      // Prepare the data for insertion by converting to snake_case for database
      const fuelPriceRecords = fuelPrices.map((price) => ({
        id: price.id,
        area: price.area,
        brand: price.brand,
        fuel_type: price.fuelType,
        min_price: price.minPrice,
        max_price: price.maxPrice,
        common_price: price.commonPrice,
        week_of: price.weekOf.toISOString().split('T')[0],
        updated_at: new Date().toISOString(),
      }));

      // Insert the data into Supabase
      console.log(
        `Importing ${fuelPriceRecords.length} demo records to Supabase...`
      );
      const { data, error } = await supabase
        .from('fuel_prices')
        .upsert(fuelPriceRecords);

      if (error) {
        console.error('Error importing demo fuel prices:', error);
        return {
          success: false,
          message: `Error importing data: ${error.message}`,
          imported: 0,
          errors: fuelPriceRecords.length,
        };
      }

      return {
        success: true,
        message: `Successfully imported ${fuelPriceRecords.length} sample fuel price records for week of ${date}`,
        imported: fuelPriceRecords.length,
        errors: 0,
        weekOf: date,
      };
    } catch (error) {
      console.error('Error in importDemoData:', error);
      return {
        success: false,
        message: `Error importing demo data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        imported: 0,
        errors: 1,
      };
    }
  }

  /**
   * Replace existing fuel price data for a specific week with demo data
   * @param weekDate The week to replace data for
   * @returns Summary of the replace operation
   */
  static async replaceDemoData(weekDate: string): Promise<{
    success: boolean;
    message: string;
    imported: number;
    errors: number;
  }> {
    try {
      // Delete existing data for the week
      const { error: deleteError } = await supabase
        .from('fuel_prices')
        .delete()
        .eq('week_of', weekDate);

      if (deleteError) {
        console.error('Error deleting existing data:', deleteError);
        return {
          success: false,
          message: `Error deleting existing data: ${deleteError.message}`,
          imported: 0,
          errors: 1,
        };
      }

      // Import the new data
      const result = await this.importDemoData(weekDate);

      if (result.success) {
        result.message = `Successfully replaced fuel price data for week of ${weekDate} with demo data`;
      }

      return result;
    } catch (error) {
      console.error('Error in replaceDemoData:', error);
      return {
        success: false,
        message: `Error replacing data: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        imported: 0,
        errors: 1,
      };
    }
  }
}
