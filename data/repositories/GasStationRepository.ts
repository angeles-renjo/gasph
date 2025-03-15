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

  async findById(id: string): Promise<GasStation | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error(`Error fetching ${this.tableName} by ID:`, error);
      throw new Error(`Failed to fetch ${this.tableName}`);
    }

    return data;
  }

  async findAll(): Promise<GasStation[]> {
    const { data, error } = await supabase.from(this.tableName).select('*');

    if (error) {
      console.error(`Error fetching all ${this.tableName}:`, error);
      throw new Error(`Failed to fetch ${this.tableName} list`);
    }

    return data || [];
  }

  async findByFilter(filter: Partial<GasStation>): Promise<GasStation[]> {
    let query = supabase.from(this.tableName).select('*');

    // Apply each filter condition
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;

    if (error) {
      console.error(`Error fetching ${this.tableName} with filter:`, error);
      throw new Error(`Failed to filter ${this.tableName}`);
    }

    return data || [];
  }

  async create(item: Omit<GasStation, 'id'> | any): Promise<GasStation> {
    try {
      // If the item already matches the database schema (as from mapPlaceToDatabase),
      // use it directly. Otherwise, the REST of your repository methods should convert
      // from the GasStation model to database format

      const { data, error } = await supabase
        .from(this.tableName)
        .insert(item)
        .select()
        .single();

      if (error) {
        console.error(`Error creating ${this.tableName}:`, error);
        throw new Error(`Failed to create ${this.tableName}`);
      }

      // Convert database format back to GasStation model for the return value
      const station = data as any;

      // Check if coordinates is a string (PostGIS format) and convert if needed
      if (typeof station.coordinates === 'string') {
        // Extract lat/lng from PostGIS point format
        const match = station.coordinates.match(/POINT\(([^ ]+) ([^)]+)\)/);
        if (match) {
          const lng = parseFloat(match[1]);
          const lat = parseFloat(match[2]);
          station.coordinates = { latitude: lat, longitude: lng };
        }
      }

      return this.mapToGasStation(station);
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}`);
    }
  }

  // Helper method to map database row to GasStation model
  private mapToGasStation(data: any): GasStation {
    // Map all fields from database format to GasStation model
    const station: GasStation = {
      id: data.id,
      name: data.name,
      brand: data.brand,
      address: data.address,
      city: data.city,
      coordinates: data.coordinates,
      amenities: data.amenities || [],
      operatingHours: data.operating_hours || {
        open: '09:00',
        close: '17:00',
        is24Hours: false,
        daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      },
      status: data.status || 'active',
    };

    return station;
  }

  async update(id: string, item: Partial<GasStation>): Promise<GasStation> {
    // Create a copy of the item to avoid modifying the original
    const stationData = { ...item };

    // Remove the distance property if it exists
    if ('distance' in stationData) {
      delete (stationData as any).distance;
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .update(stationData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}`);
    }

    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.tableName).delete().eq('id', id);

    if (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}`);
    }
  }

  async findByCoordinates(
    latitude: number,
    longitude: number,
    toleranceDegrees: number = 0.0005
  ): Promise<GasStation[]> {
    try {
      // Try to use the PostGIS function first
      try {
        const { data, error } = await supabase.rpc('find_stations_near_point', {
          lat: latitude,
          lng: longitude,
          distance_degrees: toleranceDegrees,
        });

        if (!error && data) {
          return data as GasStation[];
        }
      } catch (rpcError) {
        console.warn(
          'PostGIS RPC failed, falling back to basic query:',
          rpcError
        );
      }

      // Fallback to basic coordinate query if RPC fails
      const latMin = latitude - toleranceDegrees;
      const latMax = latitude + toleranceDegrees;
      const lngMin = longitude - toleranceDegrees;
      const lngMax = longitude + toleranceDegrees;

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .gte('coordinates->latitude', latMin)
        .lte('coordinates->latitude', latMax)
        .gte('coordinates->longitude', lngMin)
        .lte('coordinates->longitude', lngMax);

      if (error) {
        throw error;
      }

      return (data as GasStation[]) || [];
    } catch (error) {
      console.error('Error finding stations by coordinates:', error);
      throw new Error('Failed to find stations by coordinates');
    }
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
