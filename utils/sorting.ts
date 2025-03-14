// src/utils/sorting.ts
import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';

/**
 * Sort fuel prices by price (ascending or descending)
 */
export const sortPricesByPrice = (
  prices: FuelPrice[],
  ascending: boolean = true
): FuelPrice[] => {
  return [...prices].sort((a, b) => {
    return ascending
      ? a.commonPrice - b.commonPrice
      : b.commonPrice - a.commonPrice;
  });
};

/**
 * Sort fuel prices by brand alphabetically
 */
export const sortPricesByBrand = (
  prices: FuelPrice[],
  ascending: boolean = true
): FuelPrice[] => {
  return [...prices].sort((a, b) => {
    const comparison = a.brand.localeCompare(b.brand);
    return ascending ? comparison : -comparison;
  });
};

/**
 * Sort stations by distance from a point
 */
export const sortStationsByDistance = (
  stations: GasStation[],
  from: Coordinates
): GasStation[] => {
  // Helper function to calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (from: Coordinates, to: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(to.latitude - from.latitude);
    const dLon = toRad(to.longitude - from.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(from.latitude)) *
        Math.cos(toRad(to.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const toRad = (value: number): number => {
    return (value * Math.PI) / 180;
  };

  // Calculate distance for each station and sort
  return [...stations]
    .map((station) => ({
      ...station,
      distance: calculateDistance(from, station.coordinates),
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
};
