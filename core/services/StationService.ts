import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { BaseService } from './BaseService';
import { calculateDistance } from '@/utils/geo';

export class StationService extends BaseService<GasStation> {
  constructor() {
    super('gas_stations');
  }

  async getStationsByBrand(brand: string): Promise<GasStation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('brand', brand);

    if (error) {
      console.error('Error fetching gas stations by brand:', error);
      throw new Error('Failed to fetch gas stations by brand');
    }

    return data || [];
  }

  async getStationsByCity(city: string): Promise<GasStation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('city', city);

    if (error) {
      console.error('Error fetching gas stations by city:', error);
      throw new Error('Failed to fetch gas stations by city');
    }

    return data || [];
  }

  async getStationsNearby(
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<GasStation[]> {
    console.log('Finding stations near', lat, lon, 'within', radiusKm, 'km');

    try {
      // First try to use PostGIS with our stored function
      console.log('Calling find_stations_within_distance RPC');
      const { data, error } = await supabase.rpc(
        'find_stations_within_distance',
        {
          lat: lat,
          lng: lon,
          distance_km: radiusKm,
        }
      );

      if (error) {
        console.error('Error using RPC function:', error);
        // If the function fails, fall back to city-based search
        return this.findNearbyByCity(radiusKm);
      }

      if (data && data.length > 0) {
        console.log(
          `Found ${data.length} stations via PostGIS within ${radiusKm}km`
        );
        return data;
      }

      console.log(
        'No stations found with PostGIS, falling back to city search'
      );
      return this.findNearbyByCity(radiusKm);
    } catch (error) {
      console.error('Exception in findNearby:', error);
      // Fall back to city-based search on any exception
      return this.findNearbyByCity(radiusKm);
    }
  }

  // Fallback method using city-based search
  private async findNearbyByCity(radiusKm: number): Promise<GasStation[]> {
    console.log('Using city-based station search');

    // Get stations from a few major cities
    const cities = [
      'Caloocan City',
      'Quezon City',
      'Manila City',
      'Pasig City',
    ];
    const nearbyStations: GasStation[] = [];

    for (const city of cities) {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('city', city);

      if (error) {
        console.error(`Error fetching stations in ${city}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        console.log(`Found ${data.length} stations in ${city}`);

        // Assign approximate distances based on city
        const approxDistance =
          city === 'Caloocan City'
            ? 1.0
            : city === 'Quezon City'
            ? 3.0
            : city === 'Manila City'
            ? 5.0
            : 7.0;

        // Add stations with the approximate distance
        data.forEach((station: any) => {
          if (approxDistance <= radiusKm) {
            nearbyStations.push({
              ...station,
              distance: approxDistance,
            });
          }
        });
      }
    }

    console.log(
      `Returning ${nearbyStations.length} stations from city-based search`
    );
    return nearbyStations;
  }

  async searchStations(query: string): Promise<GasStation[]> {
    // Search by name or address
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

    if (error) {
      console.error('Error searching gas stations:', error);
      throw new Error('Failed to search gas stations');
    }

    return data || [];
  }
}
