// hooks/useLocationStations.ts
import { useState, useEffect, useCallback } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { GasStation } from '@/core/models/GasStation';
import { SearchRadius } from '@/core/services/StationService';
import { Coordinates } from '@/core/interfaces/ILocationService';

export function useLocationStations(radiusKm: number = 5) {
  const { stationService, locationService } = useServiceContext();
  const [stations, setStations] = useState<GasStation[]>([]);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch stations function that can be called to refresh data
  const fetchStations = useCallback(async () => {
    try {
      setLoading(true);

      // Get current location
      const currentLocation = await locationService.getCurrentLocation();
      setLocation(currentLocation);

      // Create SearchRadius instance
      const searchRadius = SearchRadius.createSafe(radiusKm);

      // Get nearby stations
      const data = await stationService.getStationsNearby(
        currentLocation,
        searchRadius
      );

      // Sort by distance (closest first)
      const sortedStations = [...data].sort(
        (a, b) =>
          (a.distance || Number.MAX_VALUE) - (b.distance || Number.MAX_VALUE)
      );

      setStations(sortedStations);
      setError(null);
    } catch (err) {
      console.error('Error fetching nearby stations:', err);
      setError(
        err instanceof Error ? err : new Error('Unknown error occurred')
      );
    } finally {
      setLoading(false);
    }
  }, [radiusKm, stationService, locationService]);

  // Initial fetch
  useEffect(() => {
    fetchStations();
  }, [fetchStations]);

  return {
    stations,
    location,
    loading,
    error,
    refreshStations: fetchStations, // Expose the refresh function
  };
}
