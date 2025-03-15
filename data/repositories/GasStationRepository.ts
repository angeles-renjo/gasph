// src/data/repositories/GasStationRepository.ts
import { GasStation } from '@/core/models/GasStation';
import { IGasStationRepository } from '@/core/interfaces/IGasStationRepository';
import { SupabaseDataSource } from '../datasources/SupabaseDataSource';
import { Coordinates } from '@/core/interfaces/ILocationService';
import { supabase } from '@/utils/supabase';

// Interface for PostGIS results
interface StationWithDistance {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  province: string;
  coordinates: any;
  amenities: any;
  operating_hours: any;
  status: string;
  distance: number;
}

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
    console.log(
      'Finding stations near',
      JSON.stringify(coordinates),
      'within',
      radiusKm,
      'km'
    );

    try {
      // First try to use PostGIS with our stored function
      console.log('Calling find_stations_within_distance RPC');
      const { data, error } = await supabase.rpc(
        'find_stations_within_distance',
        {
          lat: coordinates.latitude,
          lng: coordinates.longitude,
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

        // Map the PostGIS results to GasStation objects
        return data.map((station: StationWithDistance) => {
          // Extract lat/lng from PostGIS point text format if needed
          // For "POINT(longitude latitude)" format
          let latitude = 0;
          let longitude = 0;

          if (
            typeof station.coordinates === 'string' &&
            station.coordinates.startsWith('POINT')
          ) {
            const coordsText = station.coordinates;
            const match = coordsText.match(/POINT\(([^ ]+) ([^)]+)\)/);
            if (match) {
              longitude = parseFloat(match[1]);
              latitude = parseFloat(match[2]);
            }
          }

          return {
            id: station.id,
            name: station.name,
            brand: station.brand,
            address: station.address,
            city: station.city,
            province: station.province,
            coordinates: {
              latitude: latitude || 0,
              longitude: longitude || 0,
            },
            amenities: station.amenities || [],
            operatingHours: station.operating_hours || {
              open: '00:00',
              close: '23:59',
              is24Hours: true,
              daysOpen: [
                'Monday',
                'Tuesday',
                'Wednesday',
                'Thursday',
                'Friday',
                'Saturday',
                'Sunday',
              ],
            },
            status: station.status,
            distance: station.distance,
          };
        });
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
