// src/data/repositories/GasStationRepository.ts
import { GasStation } from '@/core/models/GasStation';
import { IGasStationRepository } from '@/core/interfaces/IGasStationRepository';
import { SupabaseDataSource } from '../datasources/SupabaseDataSource';
import { Coordinates } from '@/core/interfaces/ILocationService';
import { supabase } from '@/utils/supabase';

export class GasStationRepository
  extends SupabaseDataSource
  implements IGasStationRepository
{
  constructor() {
    super('gas_stations');
  }

  async findByBrand(brand: string): Promise<GasStation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('brand', brand);

    if (error) {
      console.error('Error fetching gas stations by brand:', error);
      throw new Error('Failed to fetch gas stations by brand');
    }

    return (data as GasStation[]) || [];
  }

  async findByCity(city: string): Promise<GasStation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('city', city);

    if (error) {
      console.error('Error fetching gas stations by city:', error);
      throw new Error('Failed to fetch gas stations by city');
    }

    return (data as GasStation[]) || [];
  }

  async findNearby(
    coordinates: Coordinates,
    radiusKm: number
  ): Promise<GasStation[]> {
    // This is a placeholder for the actual implementation
    // In a real implementation, you would use PostGIS functions like ST_DWithin
    // Or calculate distances in the application

    // For now, we'll fetch all stations and filter manually
    const { data, error } = await supabase.from(this.tableName).select('*');

    if (error) {
      console.error('Error fetching nearby stations:', error);
      throw new Error('Failed to fetch nearby stations');
    }

    const stations = (data as GasStation[]) || [];

    // Filter by distance (simplistic calculation)
    return stations.filter((station) => {
      const distance = this.calculateDistance(coordinates, station.coordinates);
      return distance <= radiusKm;
    });
  }

  async search(query: string): Promise<GasStation[]> {
    // Search by name or address
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

    if (error) {
      console.error('Error searching gas stations:', error);
      throw new Error('Failed to search gas stations');
    }

    return (data as GasStation[]) || [];
  }

  // Helper method to calculate distance between two coordinates (Haversine formula)
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(to.latitude - from.latitude);
    const dLon = this.toRad(to.longitude - from.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(from.latitude)) *
        Math.cos(this.toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
