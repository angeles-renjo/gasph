// hooks/useBestPrices.ts
import { useState, useEffect, useCallback } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { FuelPrice } from '@/core/models/FuelPrice';
import { Coordinates } from '@/core/interfaces/ILocationService';

export interface BestPriceItem {
  id: string;
  fuelType: string;
  price: number;
  brand: string;
  stationName: string;
  stationId: string;
  area: string;
  // Remove distance to simplify implementation
}

// Default Manila coordinates
const DEFAULT_COORDINATES = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export function useBestPrices() {
  const serviceContext = useServiceContext();
  const { priceService, stationService, locationService } = serviceContext;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestPrices, setBestPrices] = useState<Record<string, BestPriceItem[]>>(
    {}
  );
  const [userLocation, setUserLocation] =
    useState<Coordinates>(DEFAULT_COORDINATES);
  const [locationName, setLocationName] = useState<string>('Manila');

  // Get user location once on mount
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        setUserLocation(location);

        // Get location name
        const name = await locationService.getLocationName(location);
        setLocationName(name);
      } catch (err) {
        console.error('Error getting user location:', err);
        // Keep using default Manila coordinates
      }
    };

    getUserLocation();
  }, []); // Empty dependency array to run only once

  // Fetch all prices and find best deals
  const fetchBestPrices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the latest prices directly
      let latestPrices: FuelPrice[] = [];
      try {
        latestPrices = await priceService.getLatestPrices();
        console.log(`Fetched ${latestPrices.length} prices`);
      } catch (priceErr) {
        setError(
          `Error fetching prices: ${
            priceErr instanceof Error ? priceErr.message : 'Unknown error'
          }`
        );
        return;
      }

      // Group by fuel type
      const pricesByFuelType: Record<string, FuelPrice[]> = {};

      latestPrices.forEach((price) => {
        if (!pricesByFuelType[price.fuel_type]) {
          pricesByFuelType[price.fuel_type] = [];
        }
        pricesByFuelType[price.fuel_type].push(price);
      });

      // Find best prices for each fuel type
      const bestPricesByFuelType: Record<string, BestPriceItem[]> = {};

      for (const [fuelType, prices] of Object.entries(pricesByFuelType)) {
        // Sort by price (lowest first)
        const sortedPrices = [...prices].sort(
          (a, b) => a.common_price - b.common_price
        );

        // Take the top 5 or fewer
        const topPrices = sortedPrices.slice(0, 5);

        // Map directly to best items without station matching for now
        const bestItems: BestPriceItem[] = topPrices.map((price) => ({
          id: price.id,
          fuelType: price.fuel_type,
          price: price.common_price,
          brand: price.brand,
          stationName: price.brand, // Just use brand name for now
          stationId: '', // Empty for now
          area: price.area,
        }));

        bestPricesByFuelType[fuelType] = bestItems;
      }

      setBestPrices(bestPricesByFuelType);
    } catch (err) {
      console.error('Error fetching best prices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [priceService]);

  // Fetch best prices on component mount only
  useEffect(() => {
    fetchBestPrices();
  }, [fetchBestPrices]);

  return {
    bestPrices,
    loading,
    error,
    locationName,
    userLocation,
    refreshPrices: fetchBestPrices,
  };
}
