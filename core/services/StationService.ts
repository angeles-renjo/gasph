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
    const normalizedCity = normalizeCityName(city);

    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('city', normalizedCity);

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
    try {
      // Find nearby cities within the radius
      const nearbyCities = getCitiesWithinRadius(lat, lon, radiusKm);

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
          distance: this.calculateStationDistance(station, lat, lon),
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

  // Private helper methods
  private normalizeStations(stations: any[]): GasStation[] {
    return stations.map((station) => this.normalizeStation(station));
  }

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

  private getStationCoordinates(station: any): Coordinates {
    // Implementation similar to previous version but using cityProximity
    const nearestCity = findNearestCity(
      station.coordinates?.latitude,
      station.coordinates?.longitude
    );
    return nearestCity.coordinates;
  }

  private calculateStationDistance(
    station: GasStation,
    userLat: number,
    userLon: number
  ): number {
    const stationCoords = station.coordinates;
    const R = 6371; // Earth's radius in kilometers

    const dLat = this.toRadians(stationCoords.latitude - userLat);
    const dLon = this.toRadians(stationCoords.longitude - userLon);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(userLat)) *
        Math.cos(this.toRadians(stationCoords.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

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
