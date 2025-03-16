import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { BaseService } from './BaseService';
import { Coordinates } from '@/core/interfaces/ILocationService';

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

    return this.normalizeStations(data || []);
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

    return this.normalizeStations(data || []);
  }

  async getStationsNearby(
    lat: number,
    lon: number,
    radiusKm: number
  ): Promise<GasStation[]> {
    console.log(`Finding stations near ${lat},${lon} within ${radiusKm}km`);

    try {
      // Get the closest city to the given coordinates
      const nearestCity = this.getNearestCity(lat, lon);
      console.log(`User appears to be closest to: ${nearestCity}`);

      // Define relative distances for each city
      const cityDistances: Record<string, number> = {
        'Manila City': 7, // Further from Quezon City
        'Quezon City': 0.5, // Very close to Quezon City coordinates
        'Makati City': 8,
        'Pasig City': 4,
        'Taguig City': 9,
        'Pasay City': 10,
        'Mandaluyong City': 5,
        'San Juan City': 3,
        'Caloocan City': 6,
        'Parañaque City': 12,
        'Marikina City': 7,
        'Muntinlupa City': 16,
      };

      // Adjust distances based on nearest city
      if (nearestCity !== 'Quezon City') {
        // If we're not near Quezon City, adjust the distances
        Object.keys(cityDistances).forEach((city) => {
          if (city === nearestCity) {
            cityDistances[city] = 0.5; // Make nearest city very close
          } else if (cityDistances[city] < 5) {
            cityDistances[city] += 2; // Increase distance for previously "close" cities
          }
        });
      }

      // Cities sorted by adjusted distance
      const sortedCities = Object.entries(cityDistances)
        .sort((a, b) => a[1] - b[1])
        .map((entry) => entry[0]);

      console.log(
        `Cities in order of proximity: ${sortedCities
          .slice(0, 3)
          .join(', ')}...`
      );

      // Track processed stations to avoid duplicates
      const processedIds: Record<string, boolean> = {};
      const allStations: GasStation[] = [];

      // Process each city
      for (const city of sortedCities) {
        // Skip cities beyond our radius
        if (cityDistances[city] > radiusKm) {
          continue;
        }

        console.log(`Processing stations in ${city}`);

        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('city', city);

        if (error) {
          console.error(`Error fetching stations in ${city}:`, error);
          continue;
        }

        if (!data || data.length === 0) continue;

        console.log(`Found ${data.length} stations in ${city}`);

        // Process each station from this city
        for (const rawStation of data) {
          // Skip if already processed
          if (processedIds[rawStation.id]) continue;
          processedIds[rawStation.id] = true;

          // Create normalized station with city-based distance
          const station = this.normalizeStation(rawStation);
          station.distance = cityDistances[city];

          // Add to result
          allStations.push(station);
        }
      }

      // If no stations found, return at least the nearest city as fallback
      if (allStations.length === 0 && radiusKm >= 5) {
        console.log(
          `No stations found within radius - using ${nearestCity} stations as fallback`
        );

        const { data } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('city', nearestCity)
          .limit(10);

        if (data && data.length > 0) {
          const fallbackStations = data.map((station) => {
            const normalized = this.normalizeStation(station);
            normalized.distance = 2; // Default distance
            return normalized;
          });

          console.log(
            `Added ${fallbackStations.length} fallback stations from ${nearestCity}`
          );
          return fallbackStations;
        }
      }

      // Sort by distance
      allStations.sort(
        (a, b) =>
          (a.distance || Number.MAX_VALUE) - (b.distance || Number.MAX_VALUE)
      );

      console.log(
        `Returning ${allStations.length} stations within ${radiusKm}km`
      );
      return allStations;
    } catch (error) {
      console.error('Exception in getStationsNearby:', error);
      return [];
    }
  }

  async searchStations(query: string): Promise<GasStation[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%`);

    if (error) {
      console.error('Error searching gas stations:', error);
      throw new Error('Failed to search gas stations');
    }

    return this.normalizeStations(data || []);
  }

  // Helper to find the nearest city based on coordinates
  private getNearestCity(lat: number, lon: number): string {
    // City center coordinates
    const cityCoordinates: Record<string, Coordinates> = {
      'Manila City': { latitude: 14.5995, longitude: 120.9842 },
      'Quezon City': { latitude: 14.676, longitude: 121.0437 },
      'Makati City': { latitude: 14.5547, longitude: 121.0244 },
      'Pasig City': { latitude: 14.5764, longitude: 121.0851 },
      'Taguig City': { latitude: 14.5176, longitude: 121.0509 },
      'Pasay City': { latitude: 14.5378, longitude: 121.0014 },
      'Mandaluyong City': { latitude: 14.5794, longitude: 121.0359 },
      'San Juan City': { latitude: 14.6019, longitude: 121.0355 },
      'Caloocan City': { latitude: 14.6499, longitude: 120.9809 },
      'Parañaque City': { latitude: 14.4765, longitude: 121.0196 },
      'Marikina City': { latitude: 14.6507, longitude: 121.1029 },
      'Muntinlupa City': { latitude: 14.385, longitude: 121.0487 },
    };

    // Find the nearest city
    let nearestCity = 'Quezon City'; // Default
    let minDistance = Number.MAX_VALUE;

    for (const [city, coords] of Object.entries(cityCoordinates)) {
      // Calculate basic distance (for comparison only)
      const latDiff = Math.abs(lat - coords.latitude);
      const lonDiff = Math.abs(lon - coords.longitude);
      const distance = Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);

      if (distance < minDistance) {
        minDistance = distance;
        nearestCity = city;
      }
    }

    return nearestCity;
  }

  // Helper method to normalize a batch of stations
  private normalizeStations(stations: any[]): GasStation[] {
    return stations.map((station) => this.normalizeStation(station));
  }

  // Helper to normalize a single station
  private normalizeStation(station: any): GasStation {
    // Create default coordinates based on the city
    const defaultCoordinates: Record<string, Coordinates> = {
      'Manila City': { latitude: 14.5995, longitude: 120.9842 },
      'Quezon City': { latitude: 14.676, longitude: 121.0437 },
      'Makati City': { latitude: 14.5547, longitude: 121.0244 },
      'Pasig City': { latitude: 14.5764, longitude: 121.0851 },
      'Taguig City': { latitude: 14.5176, longitude: 121.0509 },
      'Pasay City': { latitude: 14.5378, longitude: 121.0014 },
      'Mandaluyong City': { latitude: 14.5794, longitude: 121.0359 },
      'San Juan City': { latitude: 14.6019, longitude: 121.0355 },
      'Caloocan City': { latitude: 14.6499, longitude: 120.9809 },
      'Parañaque City': { latitude: 14.4765, longitude: 121.0196 },
      'Marikina City': { latitude: 14.6507, longitude: 121.1029 },
      'Muntinlupa City': { latitude: 14.385, longitude: 121.0487 },
    };

    // Use default coordinates based on city
    const coordinates = defaultCoordinates[station.city] || {
      latitude: 14.5995,
      longitude: 120.9842,
    }; // Manila as default

    // Parse amenities
    let amenities: string[] = this.parseAmenities(station.amenities);

    // Parse operating hours
    let operatingHours = this.parseOperatingHours(station.operating_hours);

    return {
      ...station,
      coordinates,
      amenities,
      operating_hours: operatingHours,
      status: station.status || 'inactive',
    };
  }

  // Parse amenities with proper typing
  private parseAmenities(amenitiesData: any): string[] {
    try {
      if (Array.isArray(amenitiesData)) {
        return amenitiesData;
      } else if (typeof amenitiesData === 'string') {
        // Try as JSON
        if (amenitiesData.startsWith('[') && amenitiesData.endsWith(']')) {
          try {
            return JSON.parse(amenitiesData);
          } catch (e) {
            // If can't parse as JSON, continue
          }
        }

        // Try as comma-separated
        if (amenitiesData.includes(',')) {
          return amenitiesData.split(',').map((item) => item.trim());
        }

        // Single value
        if (amenitiesData.trim()) {
          return [amenitiesData.trim()];
        }
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  // Parse operating hours with proper typing
  private parseOperatingHours(hoursData: any): GasStation['operating_hours'] {
    const defaultHours = {
      open: '09:00',
      close: '17:00',
      is24_hours: false,
      days_open: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    };

    try {
      // Try to parse as JSON if it's a string
      let hours = hoursData;
      if (typeof hours === 'string') {
        try {
          hours = JSON.parse(hours);
        } catch (e) {
          return defaultHours;
        }
      }

      if (!hours || typeof hours !== 'object') {
        return defaultHours;
      }

      return {
        open: hours.open || defaultHours.open,
        close: hours.close || defaultHours.close,
        is24_hours: !!hours.is24_hours,
        days_open: Array.isArray(hours.days_open)
          ? hours.days_open
          : defaultHours.days_open,
      };
    } catch (e) {
      return defaultHours;
    }
  }
}
