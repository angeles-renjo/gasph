// hooks/usePriceCycle.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';

interface PriceCycle {
  id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  doe_import_date: string;
  created_at: string;
}

export function usePriceCycle() {
  const [currentCycle, setCurrentCycle] = useState<PriceCycle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentCycle = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('price_reporting_cycles')
          .select('*')
          .eq('is_active', true)
          .single();

        if (error) {
          console.error('Error fetching current price cycle:', error);
          setError(error.message);
          return;
        }

        setCurrentCycle(data);
        setError(null);
      } catch (err) {
        console.error('Error in usePriceCycle:', err);
        setError('Failed to fetch current price cycle');
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentCycle();
  }, []);

  // Function to calculate days remaining in current cycle
  const getDaysRemaining = (): number => {
    if (!currentCycle) return 0;

    const endDate = new Date(currentCycle.end_date);
    const now = new Date();

    // Calculate difference in days
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  };

  return {
    currentCycle,
    loading,
    error,
    daysRemaining: getDaysRemaining(),
  };
}
