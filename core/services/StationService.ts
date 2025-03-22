// core/services/StationService.ts
import { supabase } from '@/utils/supabase';
import { BaseService } from './BaseService';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';
import {
  findNearestCity,
  getCitiesWithinRadius,
  normalizeCityName,
} from '@/utils/cityProximity';

/**
 * SearchRadius domain class representing a search radius with validation
 */
export class SearchRadius {
  private readonly value: number;

  constructor(radiusKm: number) {
    // Validate radius is positive
    if (radiusKm <= 0) {
      throw new Error('Search radius must be positive');
    }
    this.value = radiusKm;
  }

  /**
   * Get the radius value in kilometers
   */
  get kilometers(): number {
    return this.value;
  }

  /**
   * Create a SearchRadius safely with fallback to default
   * @param radiusKm Radius in kilometers
   * @param defaultRadius Default radius to use if input is invalid
   * @returns A valid SearchRadius instance
   */
  static createSafe(radiusKm: number, defaultRadius: number = 5): SearchRadius {
    try {
      return new SearchRadius(radiusKm);
    } catch {
      return new SearchRadius(defaultRadius);
    }
  }
}

export class StationService extends BaseService<GasStation> {
  constructor() {
    super('gas_stations');
  }

  /**
   * Get stations by brand
   * @param brand The brand name to search for
   * @returns Array of gas stations matching the brand
   */
  async getStationsByBrand(brand: string): Promise<GasStation[]> {
    return this.executeQuery(
      supabase.from(this.tableName).select('*').eq('brand', brand),
      'Error fetching gas stations by brand:'
    );
  }

  /**
   * Get stations by city
   * @param city The city name to search for
   * @returns Array of gas stations in the specified city
   */
  async getStationsByCity(city: string): Promise<GasStation[]> {
    const normalizedCity = normalizeCityName(city);

    return this.executeQuery(
      supabase.from(this.tableName).select('*').eq('city', normalizedCity),
      'Error fetching gas stations by city:'
    );
  }

  /**
   * Search for stations based on a query string
   * @param query The search query
   * @returns Array of gas stations matching the query
   */
  async searchStations(query: string): Promise<GasStation[]> {
    return this.executeQuery(
      supabase
        .from(this.tableName)
        .select('*')
        .or(`name.ilike.%${query}%,address.ilike.%${query}%`),
      'Error searching gas stations:'
    );
  }

  /**
   * Get stations near a location within a specific radius
   * @param location Coordinates of the center point
   * @param radius Search radius
   * @returns Array of gas stations within the radius, sorted by distance
   */
  async getStationsNearby(
    location: Coordinates,
    radius: SearchRadius
  ): Promise<GasStation[]> {
    try {
      const radiusKm = radius.kilometers;

      // Find nearby cities within the radius
      const nearbyCities = getCitiesWithinRadius(
        location.latitude,
        location.longitude,
        radiusKm
      );

      // If no cities found, return empty array
      if (nearbyCities.length === 0) {
        console.log(`No cities found within ${radiusKm}km`);
        return [];
      }

      // Collect stations from nearby cities
      const stationsPromises = nearbyCities.map(async (city) => {
        const { data, error } = await supabase
          .from(this.tableName)
          .select('*')
          .eq('city', city.name);

        if (error) {
          console.error(`Error fetching stations for ${city.name}:`, error);
          return [];
        }

        return data || [];
      });

      // Wait for all city station queries
      const stationResults = await Promise.all(stationsPromises);

      // Flatten and normalize stations
      const allStations = stationResults.flat();
      const normalizedStations = this.normalizeStations(allStations).map(
        (station) => ({
          ...station,
          // Calculate actual distance from user location
          distance: this.calculateDistance(station.coordinates, location),
        })
      );

      // Sort by distance
      return normalizedStations.sort(
        (a, b) =>
          (a.distance || Number.MAX_VALUE) - (b.distance || Number.MAX_VALUE)
      );
    } catch (error) {
      console.error('Exception in getStationsNearby:', error);
      return [];
    }
  }

  // Private helper methods

  /**
   * Execute a query and process the results
   * @param query The Supabase query to execute
   * @param errorMessage Error message prefix for logging
   * @returns Normalized station data
   */
  private async executeQuery(
    query: any,
    errorMessage: string
  ): Promise<GasStation[]> {
    const { data, error } = await query;

    if (error) {
      console.error(errorMessage, error);
      throw new Error(errorMessage.replace(':', ''));
    }

    return this.normalizeStations(data || []);
  }

  /**
   * Normalize an array of station data
   * @param stations Raw station data
   * @returns Array of normalized GasStation objects
   */
  private normalizeStations(stations: any[]): GasStation[] {
    return stations.map((station) => this.normalizeStation(station));
  }

  /**
   * Normalize a single station object
   * @param station Raw station data
   * @returns Normalized GasStation object
   */
  private normalizeStation(station: any): GasStation {
    return {
      ...station,
      city: normalizeCityName(station.city),
      coordinates: this.getStationCoordinates(station),
      amenities: this.parseAmenities(station.amenities),
      operating_hours: this.parseOperatingHours(station.operating_hours),
      status: station.status || 'inactive',
    };
  }

  /**
   * Get coordinates for a station
   * @param station Station data
   * @returns Coordinates object
   */
  private getStationCoordinates(station: any): Coordinates {
    const nearestCity = findNearestCity(
      station.coordinates?.latitude,
      station.coordinates?.longitude
    );
    return nearestCity.coordinates;
  }

  /**
   * Calculate distance between two coordinate points
   * @param from Starting coordinates
   * @param to Ending coordinates
   * @returns Distance in kilometers
   */
  private calculateDistance(from: Coordinates, to: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(to.latitude - from.latitude);
    const dLon = this.toRadians(to.longitude - from.longitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(from.latitude)) *
        Math.cos(this.toRadians(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Convert degrees to radians
   * @param degrees Angle in degrees
   * @returns Angle in radians
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Parse amenities data from various formats
   * @param amenitiesData Raw amenities data
   * @returns Array of amenity strings
   */
  private parseAmenities(amenitiesData: any): string[] {
    if (!amenitiesData) {
      return [];
    }

    // Handle array data type
    if (Array.isArray(amenitiesData)) {
      return amenitiesData;
    }

    // Handle string data type
    if (typeof amenitiesData === 'string') {
      return this.parseAmenitiesFromString(amenitiesData);
    }

    return [];
  }

  /**
   * Parse amenities from string format
   * @param amenitiesString Amenities as string
   * @returns Array of amenity strings
   */
  private parseAmenitiesFromString(amenitiesString: string): string[] {
    const trimmed = amenitiesString.trim();

    if (!trimmed) {
      return [];
    }

    // Try parsing as JSON
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        return JSON.parse(trimmed);
      } catch {
        // Continue with other parsing methods if JSON parsing fails
      }
    }

    // Try as comma-separated values
    if (trimmed.includes(',')) {
      return trimmed.split(',').map((item) => item.trim());
    }

    // Single value
    return [trimmed];
  }

  /**
   * Parse operating hours with type safety
   * @param hoursData Operating hours data
   * @returns Structured operating hours object
   */
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
        } catch {
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
    } catch {
      return defaultHours;
    }
  }
}
