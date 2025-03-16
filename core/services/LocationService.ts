// core/services/LocationService.ts
import {
  ILocationService,
  Coordinates,
} from '@/core/interfaces/ILocationService';
import * as Location from 'expo-location';

export class LocationService implements ILocationService {
  // Default Manila coordinates (for fallback)
  private DEFAULT_COORDINATES: Coordinates = {
    latitude: 14.5995,
    longitude: 120.9842, // Manila coordinates
  };

  async getCurrentLocation(): Promise<Coordinates> {
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log(
          'Location permission not granted, using Manila coordinates'
        );
        return this.DEFAULT_COORDINATES;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('Retrieved location:', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      console.log('Using Manila coordinates due to error');
      return this.DEFAULT_COORDINATES;
    }
  }

  // Get location name for display purposes
  async getLocationName(coordinates: Coordinates): Promise<string> {
    try {
      // Check if these are the default Manila coordinates
      if (
        coordinates.latitude === this.DEFAULT_COORDINATES.latitude &&
        coordinates.longitude === this.DEFAULT_COORDINATES.longitude
      ) {
        return 'Manila';
      }

      // Try to do reverse geocoding
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        return (
          location.city ||
          location.subregion ||
          location.region ||
          'Unknown location'
        );
      }

      return 'Unknown location';
    } catch (error) {
      console.error('Error getting location name:', error);
      return 'Unknown location';
    }
  }

  calculateDistance(from: Coordinates, to: Coordinates): number {
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

  async getAddressFromCoordinates(coordinates: Coordinates): Promise<string> {
    try {
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (reverseGeocode.length > 0) {
        const location = reverseGeocode[0];
        return [
          location.street,
          location.city,
          location.region,
          location.postalCode,
          location.country,
        ]
          .filter(Boolean)
          .join(', ');
      }

      return 'Unknown location';
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      throw new Error('Failed to get address from coordinates');
    }
  }

  async getCoordinatesFromAddress(address: string): Promise<Coordinates> {
    try {
      const geocode = await Location.geocodeAsync(address);

      if (geocode.length > 0) {
        return {
          latitude: geocode[0].latitude,
          longitude: geocode[0].longitude,
        };
      }

      throw new Error('No coordinates found for the given address');
    } catch (error) {
      console.error('Error in geocoding:', error);
      throw new Error('Failed to get coordinates from address');
    }
  }
}
