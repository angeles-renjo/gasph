// src/hooks/useLocation.ts
import { useState, useEffect } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { Coordinates } from '@/core/interfaces/ILocationService';

export function useCurrentLocation() {
  const { locationService } = useServiceContext();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLoading(true);
        const currentLocation = await locationService.getCurrentLocation();
        setLocation(currentLocation);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [locationService]);

  return { location, loading, error };
}

export function useAddressFromCoordinates(coordinates: Coordinates | null) {
  const { locationService } = useServiceContext();
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!coordinates) {
      setAddress(null);
      return;
    }

    const fetchAddress = async () => {
      try {
        setLoading(true);
        const addressData = await locationService.getAddressFromCoordinates(
          coordinates
        );
        setAddress(addressData);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchAddress();
  }, [coordinates, locationService]);

  return { address, loading, error };
}
