// src/data/repositories/FuelPriceRepository.ts
import { FuelPrice } from '@/core/models/FuelPrice';
import { IFuelPriceRepository } from '@/core/interfaces/IFuelPriceRepository';
import { SupabaseDataSource } from '../datasources/SupabaseDataSource';
import { supabase } from '@/utils/supabase';

export class FuelPriceRepository
  extends SupabaseDataSource
  implements IFuelPriceRepository
{
  constructor() {
    super('fuel_prices');
  }

  async findByArea(area: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('area', area)
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by area:', error);
      throw new Error('Failed to fetch fuel prices by area');
    }

    return this.mapToCamelCase(data) || [];
  }

  async findByBrand(brand: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('brand', brand)
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by brand:', error);
      throw new Error('Failed to fetch fuel prices by brand');
    }

    return this.mapToCamelCase(data) || [];
  }

  async findByFuelType(fuelType: string): Promise<FuelPrice[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('fuel_type', fuelType) // Changed from 'fuelType' to 'fuel_type'
      .order('week_of', { ascending: false });

    if (error) {
      console.error('Error fetching fuel prices by fuel type:', error);
      throw new Error('Failed to fetch fuel prices by fuel type');
    }

    return this.mapToCamelCase(data) || [];
  }

  async findLatest(): Promise<FuelPrice[]> {
    // Get the most recent week
    const { data: latestData, error: latestError } = await supabase
      .from(this.tableName)
      .select('week_of') // Changed from 'weekOf' to 'week_of'
      .order('week_of', { ascending: false })
      .limit(1)
      .single();

    if (latestError) {
      console.error('Error fetching latest week:', latestError);
      throw new Error('Failed to fetch latest prices');
    }

    const latestWeek = latestData?.week_of;

    // Get all prices for that week
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('week_of', latestWeek);

    if (error) {
      console.error('Error fetching latest prices:', error);
      throw new Error('Failed to fetch latest prices');
    }

    return this.mapToCamelCase(data) || [];
  }

  async findByWeek(weekOf: Date): Promise<FuelPrice[]> {
    // Format the date for Supabase
    const formattedDate = weekOf.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('week_of', formattedDate); // Changed from 'weekOf' to 'week_of'

    if (error) {
      console.error('Error fetching prices by week:', error);
      throw new Error('Failed to fetch prices by week');
    }

    return this.mapToCamelCase(data) || [];
  }

  // Helper method to map snake_case from database to camelCase for model
  private mapToCamelCase(data: any[]): FuelPrice[] {
    if (!data) return [];

    return data.map((item) => ({
      id: item.id,
      area: item.area,
      brand: item.brand,
      fuelType: item.fuel_type,
      minPrice: item.min_price,
      maxPrice: item.max_price,
      commonPrice: item.common_price,
      weekOf: new Date(item.week_of),
      updatedAt: new Date(item.updated_at),
    }));
  }
}
