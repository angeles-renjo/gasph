// hooks/use_price_reporting.ts
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { priceReportingService } from '@/core/services';
import { StationPrice } from '@/core/services/PriceReportingService';
import { GasStation } from '@/core/models/GasStation';
import { PriceReportData } from '@/components/price/PriceReportingModal';

// For demonstration - in a real app, you'd use an auth hook
interface User {
  id: string;
  email: string;
  display_name: string;
}

/**
 * Custom hook for managing price reporting functionality
 * Follows Single Responsibility and Dependency Inversion principles
 */
export function usePriceReporting(currentUser?: User | null) {
  const [isLoading, setIsLoading] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [currentStation, setCurrentStation] = useState<GasStation | null>(null);
  const [currentFuelType, setCurrentFuelType] = useState<string | null>(null);
  const [initialPrice, setInitialPrice] = useState('');
  const [stationPrices, setStationPrices] = useState<StationPrice[]>([]);

  // Reset modal state when closed
  useEffect(() => {
    if (!isReportModalVisible) {
      setCurrentStation(null);
      setCurrentFuelType(null);
      setInitialPrice('');
    }
  }, [isReportModalVisible]);

  /**
   * Check if user is logged in and show alert if not
   */
  const checkUserLoggedIn = useCallback((): boolean => {
    if (!currentUser) {
      Alert.alert('Login Required', 'You need to log in to use this feature.', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Log In',
          onPress: () => {
            // Navigate to login screen
            // This would need to be implemented with your navigation system
          },
        },
      ]);
      return false;
    }
    return true;
  }, [currentUser]);

  /**
   * Open price reporting modal
   */
  const openReportModal = useCallback(
    (
      station: GasStation,
      fuelType: string | null = null,
      price: number | string = ''
    ) => {
      if (!checkUserLoggedIn()) return;

      setCurrentStation(station);
      setCurrentFuelType(fuelType);
      setInitialPrice(price.toString());
      setIsReportModalVisible(true);
    },
    [checkUserLoggedIn]
  );

  /**
   * Close price reporting modal
   */
  const closeReportModal = useCallback(() => {
    setIsReportModalVisible(false);
  }, []);

  /**
   * Submit a new price report
   */
  const submitPriceReport = useCallback(
    async (reportData: PriceReportData) => {
      if (!currentUser || !reportData.stationId) {
        return;
      }

      setIsLoading(true);

      try {
        await priceReportingService.submitPriceReport(
          reportData.stationId,
          reportData.fuelType,
          reportData.price,
          currentUser.id
        );

        Alert.alert(
          'Thank You!',
          'Your price report has been submitted. It helps keep the community informed.'
        );

        // Refresh prices after submission
        if (currentStation) {
          const updatedPrices = await priceReportingService.getStationPrices(
            currentStation.id
          );
          setStationPrices(updatedPrices);
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
    [currentUser, currentStation]
  );

  /**
   * Vote on an existing price report
   */
  const voteOnPrice = useCallback(
    async (reportId: string, isUpvote: boolean) => {
      if (!checkUserLoggedIn()) return;

      setIsLoading(true);

      try {
        await priceReportingService.voteOnPriceReport(
          reportId,
          isUpvote,
          currentUser!.id // Safe to use ! here as we just checked with checkUserLoggedIn
        );

        // Refresh prices after voting
        if (currentStation) {
          const updatedPrices = await priceReportingService.getStationPrices(
            currentStation.id
          );
          setStationPrices(updatedPrices);
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
    [currentUser, currentStation, checkUserLoggedIn]
  );

  /**
   * Get community prices for a station
   */
  const getStationPrices = useCallback(
    async (stationId: string): Promise<StationPrice[]> => {
      setIsLoading(true);

      try {
        const prices = await priceReportingService.getStationPrices(stationId);
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
