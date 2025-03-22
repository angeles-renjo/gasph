// hooks/usePriceService.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/utils/supabase';
import { GasStation } from '@/core/models/GasStation';
import { PriceReportData } from '@/components/price/PriceReportingModal';
import { formatTime } from '@/utils/formatters';
import { StationPrice } from '@/core/services/PriceReportingService';

// Adjusted interface for UI needs

// Mock user for testing without authentication
const MOCK_USER = {
  id: '9ccbda11-9ae7-4da5-9ca0-3608447c3efc',
  email: 'test@example.com',
};

/**
 * Custom hook for managing price reporting functionality
 */
export function usePriceReporting(currentUser?: any) {
  // State management
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [currentStation, setCurrentStation] = useState<GasStation | null>(null);
  const [currentFuelType, setCurrentFuelType] = useState<string | null>(null);
  const [initialPrice, setInitialPrice] = useState('');
  const [stationPrices, setStationPrices] = useState<StationPrice[]>([]);
  const [user, setUser] = useState<any>(MOCK_USER);

  // We'll keep this commented out until authentication is implemented
  /*
  useEffect(() => {
    if (!currentUser) {
      const getUser = async () => {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUser(data.user);
        }
      };
      
      getUser();
    } else {
      setUser(currentUser);
    }
  }, [currentUser]);
  */

  // Reset modal state when closed
  useEffect(() => {
    if (!isReportModalVisible) {
      setCurrentStation(null);
      setCurrentFuelType(null);
      setInitialPrice('');
    }
  }, [isReportModalVisible]);

  // Modal management functions
  const openReportModal = useCallback(
    (
      station: GasStation,
      fuelType: string | null = null,
      price: number | string = ''
    ) => {
      setCurrentStation(station);
      setCurrentFuelType(fuelType);
      setInitialPrice(price.toString());
      setIsReportModalVisible(true);
    },
    []
  );

  const closeReportModal = useCallback(() => {
    setIsReportModalVisible(false);
  }, []);

  // Get the latest DOE prices for a station
  const fetchDoePrices = async (
    stationId: string
  ): Promise<Record<string, any>> => {
    try {
      // Get the latest week first
      const { data: latestWeek } = await supabase
        .from('fuel_prices')
        .select('week_of')
        .order('week_of', { ascending: false })
        .limit(1)
        .single();

      // Get station info for brand and city
      const { data: station } = await supabase
        .from('gas_stations')
        .select('*')
        .eq('id', stationId)
        .single();

      if (!station || !latestWeek?.week_of) {
        return {};
      }

      // Get DOE prices for this station's brand and city
      const { data: doePrices } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('week_of', latestWeek.week_of)
        .eq('area', station.city)
        .ilike('brand', station.brand);

      // Create lookup map
      const doeByFuelType: Record<string, any> = {};
      (doePrices || []).forEach((price) => {
        doeByFuelType[price.fuel_type] = {
          minPrice: price.min_price,
          maxPrice: price.max_price,
          commonPrice: price.common_price,
        };
      });

      return doeByFuelType;
    } catch (error) {
      console.error('Error fetching DOE prices:', error);
      return {};
    }
  };

  // Get community prices for a station
  const fetchCommunityPrices = async (stationId: string): Promise<any[]> => {
    try {
      const { data } = await supabase
        .from('user_price_reports')
        .select('*')
        .eq('station_id', stationId)
        .gte('expires_at', new Date().toISOString())
        .order('reported_at', { ascending: false });

      return data || [];
    } catch (error) {
      console.error('Error fetching community prices:', error);
      return [];
    }
  };

  // Process the price data for UI display
  // Process the price data for UI display
  const processPriceData = (
    doePrices: Record<string, any>,
    communityPrices: any[]
  ): StationPrice[] => {
    // Collect all fuel types from both sources
    const fuelTypes = new Set<string>();
    Object.keys(doePrices).forEach((type) => fuelTypes.add(type));
    communityPrices.forEach((price) => fuelTypes.add(price.fuel_type));

    const results: StationPrice[] = [];

    fuelTypes.forEach((fuelType) => {
      // Find community prices for this fuel type
      const pricesForType = communityPrices.filter(
        (p) => p.fuel_type === fuelType
      );

      if (pricesForType.length > 0) {
        // Sort by most recent first
        pricesForType.sort(
          (a, b) =>
            new Date(b.reported_at).getTime() -
            new Date(a.reported_at).getTime()
        );

        // Get most recent price
        const latestPrice = pricesForType[0];

        // Format time ago for display
        const reportTime = new Date(latestPrice.reported_at);
        const now = new Date();
        const diffMinutes = Math.floor(
          (now.getTime() - reportTime.getTime()) / (1000 * 60)
        );

        let lastUpdatedText: string;
        if (diffMinutes < 60) {
          lastUpdatedText = `${diffMinutes} minutes ago`;
        } else if (diffMinutes < 24 * 60) {
          const hours = Math.floor(diffMinutes / 60);
          lastUpdatedText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
          const days = Math.floor(diffMinutes / (24 * 60));
          lastUpdatedText = `${days} day${days > 1 ? 's' : ''} ago`;
        }

        // Add to results with properly populated community price data
        results.push({
          fuelType,
          communityPrice: latestPrice.price, // Use actual price value
          reportId: latestPrice.id, // Use actual report ID
          doeData: doePrices[fuelType] || null,
          verificationData: {
            confirmedCount: latestPrice.upvotes,
            disputedCount: latestPrice.downvotes,
            lastUpdated: lastUpdatedText,
            expiresAt: latestPrice.expires_at,
          },
        });
      } else {
        // No community price, just DOE data
        results.push({
          fuelType,
          communityPrice: null,
          reportId: null,
          doeData: doePrices[fuelType] || null,
          verificationData: null,
        });
      }
    });

    return results;
  };

  // Submit a price report
  const submitPriceReport = useCallback(
    async (reportData: PriceReportData) => {
      if (!reportData.stationId) {
        return;
      }

      setIsLoading(true);

      try {
        const userId = user?.id || MOCK_USER.id;
        console.log('Submitting price report for user:', userId);

        // Calculate expiration time (24 hours from now)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create the report
        const { data, error } = await supabase
          .from('user_price_reports')
          .insert({
            station_id: reportData.stationId,
            fuel_type: reportData.fuelType,
            price: reportData.price,
            user_id: userId,
            reported_at: new Date().toISOString(),
            expires_at: expiresAt.toISOString(),
            upvotes: 1, // Start with 1 (the reporter's implicit upvote)
            downvotes: 0,
          })
          .select();

        if (error) {
          console.error('Error inserting price report:', error);
          throw error;
        }

        console.log('Price report submitted successfully:', data);

        Alert.alert(
          'Thank You!',
          'Your price report has been submitted. It helps keep the community informed.'
        );

        // Refresh prices after submission
        if (currentStation) {
          await getStationPrices(currentStation.id);
        }

        setIsReportModalVisible(false);
      } catch (error) {
        Alert.alert(
          'Error',
          'There was a problem submitting your report. Please try again.'
        );
        console.error('Error submitting price report:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentStation]
  );

  // Vote on a price
  const voteOnPrice = useCallback(
    async (reportId: string, isUpvote: boolean) => {
      const userId = user?.id || MOCK_USER.id;
      setIsLoading(true);

      try {
        console.log(
          'Voting on price:',
          reportId,
          'upvote:',
          isUpvote,
          'user:',
          userId
        );

        // Step 1: Check if user has already voted
        const { data: existingVote, error: voteError } = await supabase
          .from('user_price_votes')
          .select('*')
          .eq('report_id', reportId)
          .eq('user_id', userId)
          .single();

        if (voteError && voteError.code !== 'PGRST116') {
          console.error('Error checking existing votes:', voteError);
        }

        // Step 2: Get current report state
        const { data: report, error: reportError } = await supabase
          .from('user_price_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (reportError) {
          console.error('Error fetching report:', reportError);
          throw reportError;
        }

        if (!report) {
          throw new Error('Report not found');
        }

        // Step 3: Calculate vote changes
        let upvoteDelta = 0;
        let downvoteDelta = 0;

        if (existingVote) {
          // If vote exists but is changing
          if (existingVote.is_upvote !== isUpvote) {
            upvoteDelta = isUpvote ? 1 : -1;
            downvoteDelta = isUpvote ? -1 : 1;

            // Update vote record
            const { error: updateError } = await supabase
              .from('user_price_votes')
              .update({ is_upvote: isUpvote })
              .eq('id', existingVote.id);

            if (updateError) {
              console.error('Error updating vote:', updateError);
              throw updateError;
            }
          }
        } else {
          // New vote
          upvoteDelta = isUpvote ? 1 : 0;
          downvoteDelta = isUpvote ? 0 : 1;

          // Create vote record
          const { error: insertError } = await supabase
            .from('user_price_votes')
            .insert({
              report_id: reportId,
              user_id: userId,
              is_upvote: isUpvote,
            });

          if (insertError) {
            console.error('Error inserting vote:', insertError);
            throw insertError;
          }
        }

        // Step 4: Update report vote counts
        const { error: updateReportError } = await supabase
          .from('user_price_reports')
          .update({
            upvotes: report.upvotes + upvoteDelta,
            downvotes: report.downvotes + downvoteDelta,
          })
          .eq('id', reportId);

        if (updateReportError) {
          console.error('Error updating report counts:', updateReportError);
          throw updateReportError;
        }

        // Step 5: Refresh prices
        if (currentStation) {
          await getStationPrices(currentStation.id);
        }
      } catch (error) {
        Alert.alert(
          'Error',
          'There was a problem recording your vote. Please try again.'
        );
        console.error('Error voting on price:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [user, currentStation]
  );

  // Get prices for a station
  const getStationPrices = useCallback(
    async (stationId: string): Promise<StationPrice[]> => {
      setIsLoading(true);

      try {
        console.log('Getting prices for station:', stationId);

        // Fetch DOE and community prices in parallel
        const [doePrices, communityPrices] = await Promise.all([
          fetchDoePrices(stationId),
          fetchCommunityPrices(stationId),
        ]);

        console.log('Found community prices:', communityPrices.length || 0);

        // Process the combined data
        const prices = processPriceData(doePrices, communityPrices);

        console.log('Station prices processed:', prices.length);
        setStationPrices(prices);
        return prices;
      } catch (error) {
        console.error('Error getting station prices:', error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Return the hook public interface
  return {
    isLoading,
    isReportModalVisible,
    currentStation,
    currentFuelType,
    initialPrice,
    stationPrices,
    openReportModal,
    closeReportModal,
    submitPriceReport,
    voteOnPrice,
    getStationPrices,
  };
}
