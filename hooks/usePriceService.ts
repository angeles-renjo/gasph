import { useState, useEffect, useMemo } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import { FuelPrice } from '@/core/models/FuelPrice';
import { filterPricesByFuelType } from '@/utils/filtering';
import { useFetch } from './useFetch';

export function usePricesByArea(area: string) {
  const { priceService } = useServiceContext();
  return useFetch(() => priceService.getPricesByArea(area), [area]);
}

export function useLatestPrices() {
  const { priceService } = useServiceContext();
  return useFetch(() => priceService.getLatestPrices(), []);
}

export function usePricesByFuelType(fuelType: string) {
  // Use the existing hook to get all prices
  const { data: allPrices, loading, error } = useLatestPrices();

  // Filter prices based on fuel type using your utility function
  const filteredPrices = useMemo(() => {
    if (!allPrices) return [];
    return filterPricesByFuelType(allPrices, fuelType);
  }, [allPrices, fuelType]);

  return { prices: filteredPrices, loading, error };
}
