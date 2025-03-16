// utils/testing/priceDataTester.ts
// A utility to verify price data handling

import { BestPriceItem } from '@/hooks/useBestPrices';
import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';
import { Coordinates } from '@/core/interfaces/ILocationService';

/**
 * Tests the matching between price data and stations
 * This can be used in development to verify logic is working correctly
 */
export function testPriceStationMatching(
  prices: FuelPrice[],
  stations: GasStation[],
  userLocation: Coordinates
): {
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number;
  bestPrices: Record<string, BestPriceItem[]>;
} {
  console.log('=== PRICE-STATION MATCHING TEST ===');
  console.log(
    `Testing with ${prices.length} prices and ${stations.length} stations`
  );

  // Group stations by brand and city for quick lookup
  const stationMap: Record<string, GasStation> = {};
  stations.forEach((station) => {
    const key = `${station.brand.toLowerCase()}_${station.city.toLowerCase()}`;
    stationMap[key] = station;
  });

  // Group prices by fuel type
  const pricesByType: Record<string, FuelPrice[]> = {};
  prices.forEach((price) => {
    if (!pricesByType[price.fuel_type]) {
      pricesByType[price.fuel_type] = [];
    }
    pricesByType[price.fuel_type].push(price);
  });

  // Process each fuel type
  const bestPricesByType: Record<string, BestPriceItem[]> = {};
  let matchedCount = 0;
  let totalProcessed = 0;

  for (const [fuelType, pricesForType] of Object.entries(pricesByType)) {
    // Sort by price
    const sortedPrices = [...pricesForType].sort(
      (a, b) => a.common_price - b.common_price
    );

    // Take top 5
    const topPrices = sortedPrices.slice(0, 5);

    // Map to best items
    const bestItems: BestPriceItem[] = topPrices.map((price) => {
      totalProcessed++;

      // Try to find matching station
      const key = `${price.brand.toLowerCase()}_${price.area.toLowerCase()}`;
      const matchingStation = stationMap[key];

      if (matchingStation) {
        matchedCount++;
      }

      return {
        id: price.id,
        fuelType: price.fuel_type,
        price: price.common_price,
        brand: price.brand,
        stationName: matchingStation?.name || price.brand,
        stationId: matchingStation?.id || '',
        area: price.area,
        distance: matchingStation?.distance,
      };
    });

    bestPricesByType[fuelType] = bestItems;
  }

  // Calculate match rate
  const matchRate =
    totalProcessed > 0 ? (matchedCount / totalProcessed) * 100 : 0;

  // Log results
  console.log(
    `Matched ${matchedCount} out of ${totalProcessed} top prices (${matchRate.toFixed(
      1
    )}%)`
  );

  // Log station distribution by city
  const cityCount: Record<string, number> = {};
  stations.forEach((station) => {
    cityCount[station.city] = (cityCount[station.city] || 0) + 1;
  });

  console.log('Stations by city:');
  Object.entries(cityCount)
    .sort((a, b) => b[1] - a[1])
    .forEach(([city, count]) => {
      console.log(`- ${city}: ${count} stations`);
    });

  // Log fuel type distribution
  console.log('Fuel types available:');
  Object.keys(bestPricesByType).forEach((fuelType) => {
    console.log(
      `- ${fuelType}: ${bestPricesByType[fuelType].length} best prices`
    );
  });

  console.log('=== TEST COMPLETED ===');

  return {
    matchedCount,
    unmatchedCount: totalProcessed - matchedCount,
    matchRate,
    bestPrices: bestPricesByType,
  };
}

/**
 * Tests the distance calculation and sorting based on user location
 */
export function testDistanceSorting(
  stations: GasStation[],
  userLocation: Coordinates
): {
  closestCity: string;
  stationsByDistance: Array<{ station: GasStation; distance: number }>;
} {
  console.log('=== DISTANCE SORTING TEST ===');
  console.log(
    `Testing with ${stations.length} stations and user at ${userLocation.latitude}, ${userLocation.longitude}`
  );

  // Group stations by city
  const stationsByCity: Record<string, GasStation[]> = {};
  stations.forEach((station) => {
    if (!stationsByCity[station.city]) {
      stationsByCity[station.city] = [];
    }
    stationsByCity[station.city].push(station);
  });

  // Count stations by city
  console.log('Stations by city:');
  Object.entries(stationsByCity)
    .sort((a, b) => b[1].length - a[1].length)
    .forEach(([city, cityStations]) => {
      console.log(`- ${city}: ${cityStations.length} stations`);
    });

  // Sort all stations by distance
  const stationsByDistance = stations
    .map((station) => ({
      station,
      distance: station.distance || 999,
    }))
    .sort((a, b) => a.distance - b.distance);

  // Find closest city
  const cityDistances: Record<string, number> = {};
  Object.keys(stationsByCity).forEach((city) => {
    const cityStations = stationsByCity[city];
    const avgDistance =
      cityStations.reduce((sum, station) => sum + (station.distance || 0), 0) /
      cityStations.length;
    cityDistances[city] = avgDistance;
  });

  const closestCities = Object.entries(cityDistances)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  console.log('Closest cities:');
  closestCities.forEach(([city, avgDistance]) => {
    console.log(`- ${city}: avg ${avgDistance.toFixed(1)} km`);
  });

  const closestCity = closestCities[0][0];

  console.log('Top 5 closest stations:');
  stationsByDistance.slice(0, 5).forEach((item, index) => {
    console.log(
      `${index + 1}. ${item.station.name} (${
        item.station.city
      }): ${item.distance.toFixed(1)} km`
    );
  });

  console.log('=== TEST COMPLETED ===');

  return {
    closestCity,
    stationsByDistance: stationsByDistance.slice(0, 10), // Return top 10
  };
}

// To use these tests in a component or hook:
//
// import { testPriceStationMatching, testDistanceSorting } from '@/utils/testing/priceDataTester';
//
// // In your component or hook:
// useEffect(() => {
//   if (prices.length > 0 && stations.length > 0) {
//     testPriceStationMatching(prices, stations, userLocation);
//     testDistanceSorting(stations, userLocation);
//   }
// }, [prices, stations, userLocation]);
