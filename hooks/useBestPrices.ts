// hooks/useBestPrices.ts
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/utils/supabase';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';
import { PriceStationConnector } from '@/utils/priceStationConnector';

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
  source: 'doe' | 'community'; // Retain source information
  confidence?: number; // Keep internally but don't display
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

  // Fetch and process combined prices using enhanced PriceStationConnector
  const fetchBestPrices = useCallback(async () => {
    if (nearbyStations.length === 0) {
      console.log('No nearby stations available, skipping price fetch');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(
        'Fetching and matching prices with enhanced confidence scoring...'
      );

      // Use the enhanced PriceStationConnector to get best prices
      const matchedPrices =
        await PriceStationConnector.getBestPricesForLocation(
          userLocation.latitude,
          userLocation.longitude,
          nearbyStations
        );

      // Prepare result object
      const bestPricesByFuelType: Record<string, BestPriceItem[]> = {};

      // Process each fuel type's matched prices
      Object.entries(matchedPrices).forEach(([fuelType, priceMatches]) => {
        const bestItems: BestPriceItem[] = priceMatches.map((match) => {
          // Find the matching station if available
          const matchingStation = match.stationId
            ? nearbyStations.find((s) => s.id === match.stationId)
            : undefined;

          return {
            id: match.price.id,
            fuelType: match.price.fuel_type,
            price: match.price.common_price,
            brand: match.price.brand,
            stationName: match.stationName || match.price.brand,
            stationId: match.stationId || '',
            area: match.price.area,
            distance: matchingStation?.distance,
            source: 'doe',
            confidence: match.matchConfidence, // Keep confidence but don't display it
          };
        });

        // Sort bestItems primarily by price, then by distance if prices are similar
        bestItems.sort((a, b) => {
          // Primary sort by price (always show cheaper first)
          const priceDiff = a.price - b.price;
          if (Math.abs(priceDiff) > 0.01) return priceDiff;

          // Secondary sort by distance (closer first)
          const distA = a.distance ?? Number.MAX_VALUE;
          const distB = b.distance ?? Number.MAX_VALUE;
          return distA - distB;
        });

        bestPricesByFuelType[fuelType] = bestItems;
      });

      console.log(
        'Processed best prices for fuel types:',
        Object.keys(bestPricesByFuelType).join(', ')
      );
      setBestPrices(bestPricesByFuelType);

      // Also fetch community prices and merge them
      try {
        const { data: communityPrices } = await supabase
          .from('combined_prices')
          .select('*')
          .eq('source', 'community')
          .order('price');

        if (communityPrices && communityPrices.length > 0) {
          console.log(
            `Found ${communityPrices.length} community prices to integrate`
          );

          // Process each community price
          communityPrices.forEach((communityPrice: any) => {
            const fuelType = communityPrice.fuel_type;

            if (!bestPricesByFuelType[fuelType]) {
              bestPricesByFuelType[fuelType] = [];
            }

            // Find matching station for this community price
            const matchingStation = communityPrice.station_id
              ? nearbyStations.find((s) => s.id === communityPrice.station_id)
              : undefined;

            // Only include community prices for stations that are nearby
            if (matchingStation) {
              const communityItem: BestPriceItem = {
                id: communityPrice.id,
                fuelType: communityPrice.fuel_type,
                price: communityPrice.price,
                brand: communityPrice.brand,
                stationName: matchingStation.name,
                stationId: matchingStation.id,
                area: communityPrice.area,
                distance: matchingStation.distance,
                source: 'community',
                confidence: communityPrice.confidence,
              };

              bestPricesByFuelType[fuelType].push(communityItem);

              // Re-sort by price first, then by distance
              bestPricesByFuelType[fuelType].sort((a, b) => {
                // Primary sort by price
                const priceDiff = a.price - b.price;
                if (Math.abs(priceDiff) > 0.01) return priceDiff;

                // Secondary sort by distance
                const distA = a.distance ?? Number.MAX_VALUE;
                const distB = b.distance ?? Number.MAX_VALUE;
                return distA - distB;
              });

              // Keep top 5 after including community prices
              if (bestPricesByFuelType[fuelType].length > 5) {
                bestPricesByFuelType[fuelType] = bestPricesByFuelType[
                  fuelType
                ].slice(0, 5);
              }
            }
          });

          setBestPrices(bestPricesByFuelType);
        }
      } catch (communityError) {
        console.error('Error fetching community prices:', communityError);
        // Don't fail the whole operation if community prices fail
      }
    } catch (err) {
      console.error('Error fetching best prices:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, [nearbyStations, userLocation]);

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
