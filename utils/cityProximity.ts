// utils/cityProximity.ts
import { Coordinates } from '@/core/interfaces/ILocationService';

// Define a more flexible city configuration interface
export interface CityConfig {
  name: string;
  coordinates: Coordinates;
  region?: string;
  aliases?: string[];
  proximityWeight?: number;
}

// Centralized city configuration
export const CITY_COORDINATES: CityConfig[] = [
  {
    name: 'Manila City',
    coordinates: { latitude: 14.5995, longitude: 120.9842 },
    region: 'NCR',
    aliases: ['Manila', 'City of Manila'],
    proximityWeight: 1.0,
  },
  {
    name: 'Quezon City',
    coordinates: { latitude: 14.676, longitude: 121.0437 },
    region: 'NCR',
    aliases: ['QC'],
    proximityWeight: 1.2,
  },
  // Add more cities with their configurations
  {
    name: 'Makati City',
    coordinates: { latitude: 14.5547, longitude: 121.0244 },
    region: 'NCR',
    aliases: ['Makati'],
    proximityWeight: 0.9,
  },
  // ... other cities
];

/**
 * Calculate distance between two geographical points
 * @param from Starting coordinates
 * @param to Ending coordinates
 * @returns Distance in kilometers
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Find the nearest city to given coordinates
 * @param lat Latitude
 * @param lon Longitude
 * @returns Nearest city configuration
 */
export function findNearestCity(lat: number, lon: number): CityConfig {
  const userLocation: Coordinates = { latitude: lat, longitude: lon };

  return CITY_COORDINATES.reduce((nearest, city) => {
    const currentDistance = calculateDistance(userLocation, city.coordinates);
    const nearestDistance = nearest
      ? calculateDistance(userLocation, nearest.coordinates)
      : Number.MAX_VALUE;

    return currentDistance < nearestDistance ? city : nearest;
  }, CITY_COORDINATES[0]); // Default to first city if no match
}

/**
 * Get cities within a specified radius
 * @param lat Latitude of center point
 * @param lon Longitude of center point
 * @param radiusKm Search radius in kilometers
 * @returns Array of cities within the radius
 */
export function getCitiesWithinRadius(
  lat: number,
  lon: number,
  radiusKm: number
): CityConfig[] {
  const userLocation: Coordinates = { latitude: lat, longitude: lon };

  return CITY_COORDINATES.filter(
    (city) => calculateDistance(userLocation, city.coordinates) <= radiusKm
  ).sort(
    (a, b) =>
      calculateDistance(userLocation, a.coordinates) -
      calculateDistance(userLocation, b.coordinates)
  );
}

/**
 * Normalize city name, handling aliases
 * @param cityName Input city name
 * @returns Standardized city name
 */
export function normalizeCityName(cityName: string): string {
  const matchedCity = CITY_COORDINATES.find(
    (city) =>
      city.name.toLowerCase() === cityName.toLowerCase() ||
      city.aliases?.some(
        (alias) => alias.toLowerCase() === cityName.toLowerCase()
      )
  );

  return matchedCity ? matchedCity.name : cityName;
}
