// src/core/services/LocationService.ts
import {
  ILocationService,
  Coordinates,
} from '@/core/interfaces/ILocationService';
import * as Location from 'expo-location';

export class LocationService implements ILocationService {
  async getCurrentLocation(): Promise<Coordinates> {
    // For development/testing we'll attempt to get the simulator's location
    // instead of using hardcoded values
    try {
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.log(
          'Location permission not granted, using fallback coordinates'
        );
        // Fallback to hardcoded coordinates if permissions aren't granted
        return {
          latitude: 14.65,
          longitude: 120.98,
        };
      }

      // Get current position (from simulator in dev mode, or device in production)
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
      console.log('Using fallback coordinates due to error');
      // Fallback to hardcoded coordinates on error
      return {
        latitude: 14.65,
        longitude: 120.98,
      };
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
