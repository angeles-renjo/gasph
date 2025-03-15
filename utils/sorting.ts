import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';
import { calculateDistance } from './geo';

/**
 * Sort fuel prices by price (ascending or descending)
 */
export const sortPricesByPrice = (
  prices: FuelPrice[],
  ascending: boolean = true
): FuelPrice[] => {
  return [...prices].sort((a, b) => {
    return ascending
      ? a.common_price - b.common_price
      : b.common_price - a.common_price;
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
  // Calculate distance for each station and sort
  return [...stations]
    .map((station) => ({
      ...station,
      distance: calculateDistance(from, station.coordinates),
    }))
    .sort((a, b) => (a.distance || 0) - (b.distance || 0));
};
