// src/utils/filtering.ts
import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';

/**
 * Filter fuel prices by brand
 */
export const filterPricesByBrand = (
  prices: FuelPrice[],
  brand: string
): FuelPrice[] => {
  if (!brand) return prices;
  return prices.filter(
    (price) => price.brand.toLowerCase() === brand.toLowerCase()
  );
};

/**
 * Filter fuel prices by fuel type
 */
export const filterPricesByFuelType = (
  prices: FuelPrice[],
  fuelType: string
): FuelPrice[] => {
  if (!fuelType) return prices;
  return prices.filter(
    (price) => price.fuelType.toLowerCase() === fuelType.toLowerCase()
  );
};

/**
 * Filter stations by status
 */
export const filterStationsByStatus = (
  stations: GasStation[],
  status: GasStation['status']
): GasStation[] => {
  if (!status) return stations;
  return stations.filter((station) => station.status === status);
};

/**
 * Filter stations by amenity
 */
export const filterStationsByAmenity = (
  stations: GasStation[],
  amenity: string
): GasStation[] => {
  if (!amenity) return stations;
  return stations.filter(
    (station) =>
      station.amenities &&
      station.amenities.some((a) =>
        a.toLowerCase().includes(amenity.toLowerCase())
      )
  );
};
