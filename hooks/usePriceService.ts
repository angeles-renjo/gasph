// src/hooks/usePriceService.ts
import { useState, useEffect, useMemo } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { FuelPrice } from '@/core/models/FuelPrice';
import { filterPricesByFuelType } from '@/utils/filtering';

export function usePricesByArea(area: string) {
  const { priceService } = useServiceContext();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const data = await priceService.getPricesByArea(area);
        setPrices(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [area, priceService]);

  return { prices, loading, error };
}

export function useLatestPrices() {
  const { priceService } = useServiceContext();
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        const data = await priceService.getLatestPrices();
        setPrices(data);
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error('Unknown error occurred')
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, [priceService]);

  return { prices, loading, error };
}

export function usePricesByFuelType(fuelType: string) {
  // Use the existing hook to get all prices
  const { prices: allPrices, loading, error } = useLatestPrices();

  // Filter prices based on fuel type using your utility function
  const filteredPrices = useMemo(() => {
    return filterPricesByFuelType(allPrices, fuelType);
  }, [allPrices, fuelType]);

  return { prices: filteredPrices, loading, error };
}
