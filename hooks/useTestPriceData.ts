// hooks/useTestPriceData.ts
import { useState, useEffect } from 'react';
import { useServiceContext } from '@/context/ServiceContext';
import {
  testPriceStationMatching,
  testDistanceSorting,
} from '@/utils/testing/priceDataTester';
import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';

/**
 * A hook that runs tests on price and station data
 * Use this hook in development to verify data handling
 */
export function useTestPriceData() {
  const { priceService, stationService, locationService } = useServiceContext();
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, any>>({});

  // Run the tests
  const runTests = async () => {
    if (isRunningTests) return;

    try {
      setIsRunningTests(true);

      // Get user location
      const userLocation = await locationService.getCurrentLocation();
      console.log(
        '🧪 Running price data tests with user location:',
        userLocation
      );

      // Get prices
      const prices = await priceService.getLatestPrices();
      console.log(`🧪 Retrieved ${prices.length} prices for testing`);

      // Get nearby stations
      const stations = await stationService.getStationsNearby(
        userLocation.latitude,
        userLocation.longitude,
        10 // 10km radius
      );
      console.log(`🧪 Retrieved ${stations.length} stations for testing`);

      if (prices.length === 0 || stations.length === 0) {
        console.log('❌ Cannot run tests - missing prices or stations data');
        setTestResults({
          success: false,
          error: 'Missing data for testing',
        });
        return;
      }

      // Run the tests
      const matchingResults = testPriceStationMatching(
        prices,
        stations,
        userLocation
      );
      const distanceResults = testDistanceSorting(stations, userLocation);

      // Store test results
      setTestResults({
        success: true,
        matchingResults,
        distanceResults,
        timestamp: new Date().toISOString(),
      });

      console.log('✅ Tests completed successfully');
    } catch (error) {
      console.error('❌ Error running tests:', error);
      setTestResults({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  return {
    runTests,
    isRunningTests,
    testResults,
  };
}

/**
 * Example usage in a component:
 *
 * function DevToolsScreen() {
 *   const { runTests, isRunningTests, testResults } = useTestPriceData();
 *
 *   return (
 *     <View>
 *       <Button
 *         title={isRunningTests ? "Running Tests..." : "Run Price Data Tests"}
 *         onPress={runTests}
 *         disabled={isRunningTests}
 *       />
 *       {testResults.success && (
 *         <View>
 *           <Text>Match rate: {testResults.matchingResults.matchRate.toFixed(1)}%</Text>
 *           <Text>Closest city: {testResults.distanceResults.closestCity}</Text>
 *         </View>
 *       )}
 *     </View>
 *   );
 * }
 */
