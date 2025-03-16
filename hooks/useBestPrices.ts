// hooks/useBestPrices.ts
import { useState, useEffect, useCallback } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { FuelPrice } from '@/core/models/FuelPrice';
import { Coordinates } from '@/core/interfaces/ILocationService';
import { GasStation } from '@/core/models/GasStation';

export interface BestPriceItem {
  id: string;
  fuelType: string;
  price: number;
  brand: string;
  stationName: string;
  stationId: string;
  area: string;
  distance?: number;
}

// Default Manila coordinates
const DEFAULT_COORDINATES = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export function useBestPrices() {
  const { priceService, stationService, locationService } = useServiceContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bestPrices, setBestPrices] = useState<Record<string, BestPriceItem[]>>(
    {}
  );
  const [userLocation, setUserLocation] =
    useState<Coordinates>(DEFAULT_COORDINATES);
  const [locationName, setLocationName] = useState<string>('Manila');
  const [nearbyStations, setNearbyStations] = useState<GasStation[]>([]);

  // Initial location setup
  useEffect(() => {
    let isMounted = true;

    const getUserLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        if (isMounted) {
          console.log('Retrieved user location:', location);
          setUserLocation(location);

          const name = await locationService.getLocationName(location);
          setLocationName(name);
          console.log('Location name:', name);
        }
      } catch (err) {
        console.error('Error getting user location:', err);
      }
    };

    getUserLocation();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [locationService]);

  // Fetch nearby stations when user location is available
  useEffect(() => {
    let isMounted = true;

    const fetchNearbyStations = async () => {
      try {
        setLoading(true);
        console.log('Fetching nearby stations...');

        // Get stations within a reasonable radius
        const radius = 10; // 10km radius to get enough stations
        const stations = await stationService.getStationsNearby(
          userLocation.latitude,
          userLocation.longitude,
          radius
        );

        if (isMounted) {
          console.log(
            `Found ${stations.length} nearby stations within ${radius}km`
          );
          setNearbyStations(stations);
        }
      } catch (err) {
        console.error('Error fetching nearby stations:', err);
        if (isMounted) {
          setError('Failed to fetch nearby stations');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNearbyStations();

    return () => {
      isMounted = false;
    };
  }, [userLocation, stationService]);

  // Fetch and process prices when we have nearby stations
  const fetchBestPrices = useCallback(async () => {
    if (nearbyStations.length === 0) {
      console.log('No nearby stations available, skipping price fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching latest fuel prices...');
      const latestPrices = await priceService.getLatestPrices();
      console.log(`Fetched ${latestPrices.length} prices`);

      // Get all unique fuel types
      const fuelTypes = [
        ...new Set(latestPrices.map((price) => price.fuel_type)),
      ];
      console.log(`Available fuel types: ${fuelTypes.join(', ')}`);

      // Create a map of brand+city to station for efficient lookups
      const stationMap: Record<string, GasStation> = {};
      nearbyStations.forEach((station) => {
        const key = `${station.brand.toLowerCase()}_${station.city.toLowerCase()}`;
        stationMap[key] = station;
      });

      // Process each fuel type
      const bestPricesByFuelType: Record<string, BestPriceItem[]> = {};

      for (const fuelType of fuelTypes) {
        // Get prices for this fuel type
        const pricesForType = latestPrices.filter(
          (p) => p.fuel_type === fuelType
        );

        // Sort by price (lowest first)
        const sortedPrices = [...pricesForType].sort(
          (a, b) => a.common_price - b.common_price
        );

        // Take the top 5 or fewer
        const topPrices = sortedPrices.slice(0, 5);

        // Map to best items with station matching
        const bestItems: BestPriceItem[] = topPrices.map((price) => {
          // Try to find a matching nearby station
          const key = `${price.brand.toLowerCase()}_${price.area.toLowerCase()}`;
          const matchingStation = stationMap[key];

          return {
            id: price.id,
            fuelType: price.fuel_type,
            price: price.common_price,
            brand: price.brand,
            stationName: matchingStation?.name || price.brand,
            stationId: matchingStation?.id || '',
            area: price.area,
            distance: matchingStation?.distance,
          };
        });

        bestPricesByFuelType[fuelType] = bestItems;
      }

      setBestPrices(bestPricesByFuelType);
    } catch (err) {
      console.error('Error fetching best prices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [priceService, nearbyStations]);

  // Fetch prices when nearby stations are available
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
