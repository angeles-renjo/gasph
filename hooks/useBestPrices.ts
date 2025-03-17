// hooks/useBestPrices.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';

// Default Manila coordinates
const DEFAULT_COORDINATES = {
  latitude: 14.5995,
  longitude: 120.9842,
};

export interface BestPriceItem {
  id: string;
  fuelType: string;
  price: number;
  brand: string;
  stationName: string;
  stationId: string;
  area: string;
  distance?: number;
  source: 'doe' | 'community'; // New field
  confidence: number; // New field
}

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

  // Fetch and process combined prices
  const fetchBestPrices = useCallback(async () => {
    if (nearbyStations.length === 0) {
      console.log('No nearby stations available, skipping price fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Fetching combined prices...');

      // Query the combined_prices view
      const { data: combinedPrices, error } = await supabase
        .from('combined_prices')
        .select('*')
        .order('price');

      if (error) throw error;

      console.log(`Fetched ${combinedPrices.length} combined prices`);

      // Get all unique fuel types
      const fuelTypes = [
        ...new Set(combinedPrices.map((price: any) => price.fuel_type)),
      ];
      console.log(`Available fuel types: ${fuelTypes.join(', ')}`);

      // Create a map of brand+city to station for better lookups
      const stationMap: Record<string, GasStation> = {};
      nearbyStations.forEach((station) => {
        // Use lowercase for case-insensitive matching
        const key = `${station.brand.toLowerCase()}_${station.city.toLowerCase()}`;
        stationMap[key] = station;
      });

      // Process each fuel type
      const bestPricesByFuelType: Record<string, BestPriceItem[]> = {};

      for (const fuelType of fuelTypes) {
        // Get prices for this fuel type
        const pricesForType = combinedPrices.filter(
          (p: any) => p.fuel_type === fuelType
        );

        // Apply weighting: if confidence values are close, sort by price
        // Otherwise, prioritize higher confidence prices
        const weightedPrices = [...pricesForType].sort((a: any, b: any) => {
          // If confidence difference is significant
          if (Math.abs(a.confidence - b.confidence) > 0.3) {
            return b.confidence - a.confidence;
          }
          // Otherwise sort by price
          return a.price - b.price;
        });

        // Take the top 5 or fewer
        const topPrices = weightedPrices.slice(0, 5);

        // Map to best items with improved station matching
        const bestItems: BestPriceItem[] = topPrices.map((price: any) => {
          // For community prices that have a station_id, use that directly
          let matchingStation = null;

          if (price.source === 'community' && price.station_id) {
            // Find station by ID
            matchingStation = nearbyStations.find(
              (s) => s.id === price.station_id
            );
          } else {
            // Try to match by brand + area
            const key = `${price.brand.toLowerCase()}_${price.area.toLowerCase()}`;
            matchingStation = stationMap[key];
          }

          // If we found a matching station, use its name and ID
          // Otherwise create a descriptive name using brand and area
          const stationName = matchingStation
            ? matchingStation.name
            : `${price.brand} - ${price.area}`;

          return {
            id: price.id,
            fuelType: price.fuel_type,
            price: price.price,
            brand: price.brand,
            stationName: stationName,
            stationId: matchingStation?.id || '',
            area: price.area,
            distance: matchingStation?.distance,
            source: price.source,
            confidence: price.confidence,
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
  }, [nearbyStations]);

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
