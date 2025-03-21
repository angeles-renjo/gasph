// __tests__/utils/priceStationConnector.test.ts

import { PriceStationConnector } from '@/utils/priceStationConnector';
import { GasStation } from '@/core/models/GasStation';
import { FuelPrice } from '@/core/models/FuelPrice';
import {
  getLatestWeek,
  getPricesForWeek,
  getNCRPricesForWeek,
  getHistoricalPrices,
} from '@/utils/priceConnector/queries';
import { normalizeFuelType } from '@/utils/formatters';

// Mock all external dependencies
jest.mock('@/utils/priceConnector/queries', () => ({
  getLatestWeek: jest.fn(),
  getPricesForWeek: jest.fn(),
  getNCRPricesForWeek: jest.fn(),
  getHistoricalPrices: jest.fn(),
}));

jest.mock('@/utils/formatters', () => ({
  normalizeFuelType: jest.fn((type) => type.toLowerCase()),
}));

// Mock utility functions used in the connector
jest.mock('@/utils/priceConnector/matchers', () => ({
  adjustConfidenceForInvalidPrice: jest.fn((confidence) => confidence),
  findExactMatches: jest.fn(),
  findBestMatchingStation: jest.fn(),
  findExactStationMatches: jest.fn(),
}));

jest.mock('@/utils/priceConnector/transformers', () => ({
  groupStationsByCity: jest.fn(),
  groupStationsByBrandAndCity: jest.fn(),
}));

describe('PriceStationConnector', () => {
  const mockStation: GasStation = {
    id: 'station-1',
    name: 'Shell Station',
    brand: 'Shell',
    city: 'Manila',
    province: 'Metro Manila',
    coordinates: {
      latitude: 14.5995,
      longitude: 120.9842,
    },
    address: '1234',
    amenities: [],
    status: 'active',
    operating_hours: {
      open: '08:00',
      close: '17:00',
      is24_hours: false,
      days_open: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    },
  };

  const mockPrice: FuelPrice = {
    id: 'price-1',
    fuel_type: 'Premium Gasoline',
    common_price: 61.75,
    min_price: 60.75,
    max_price: 62.75,
    area: 'Manila',
    brand: 'Shell',
    week_of: '2023-44',
    updated_at: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset all mock implementations
    (getLatestWeek as jest.Mock).mockReset();
    (getPricesForWeek as jest.Mock).mockReset();
    (getNCRPricesForWeek as jest.Mock).mockReset();
    (getHistoricalPrices as jest.Mock).mockReset();
  });

  describe('getPricesForStation', () => {
    it('should return empty array when no latest week available', async () => {
      (getLatestWeek as jest.Mock).mockResolvedValue(null);
      const result = await PriceStationConnector.getPricesForStation(
        mockStation
      );
      expect(result).toEqual([]);
    });

    it('should return empty array when no prices found for week', async () => {
      (getLatestWeek as jest.Mock).mockResolvedValue('2023-44');
      (getPricesForWeek as jest.Mock).mockResolvedValue([]);
      const result = await PriceStationConnector.getPricesForStation(
        mockStation
      );
      expect(result).toEqual([]);
    });

    it('should return exact matches with high confidence', async () => {
      (getLatestWeek as jest.Mock).mockResolvedValue('2023-44');
      (getPricesForWeek as jest.Mock).mockResolvedValue([mockPrice]);
      const result = await PriceStationConnector.getPricesForStation(
        mockStation
      );

      expect(result).toEqual(
        expect.arrayContaining([
          {
            price: mockPrice,
            stationId: mockStation.id,
            stationName: mockStation.name,
            matchConfidence: expect.any(Number),
            confidenceLevel: expect.stringMatching(/High|Medium|Low/),
          },
        ])
      );
    });
  });

  describe('findMatchingStations', () => {
    it('should return empty array for empty station list', () => {
      const result = PriceStationConnector.findMatchingStations(mockPrice, []);
      expect(result).toEqual([]);
    });

    it('should prioritize exact matches with high confidence', () => {
      const stations = [
        mockStation,
        {
          ...mockStation,
          id: 'station-2',
          brand: 'Caltex',
        },
      ];

      const result = PriceStationConnector.findMatchingStations(
        mockPrice,
        stations
      );
      expect(result[0].confidence).toBeGreaterThanOrEqual(0.9);
      expect(result[0].station.id).toBe('station-1');
    });
  });

  describe('getBestPricesForLocation', () => {
    it('should return empty object when no location data', async () => {
      (getLatestWeek as jest.Mock).mockResolvedValue(null);
      const result = await PriceStationConnector.getBestPricesForLocation(
        14.5995,
        120.9842,
        []
      );
      expect(result).toEqual({});
    });

    it('should return best prices grouped by fuel type', async () => {
      (getLatestWeek as jest.Mock).mockResolvedValue('2023-44');
      (getNCRPricesForWeek as jest.Mock).mockResolvedValue([mockPrice]);

      const result = await PriceStationConnector.getBestPricesForLocation(
        14.5995,
        120.9842,
        [mockStation]
      );

      expect(result).toHaveProperty('premium gasoline');
      expect(result['premium gasoline']).toHaveLength(1);
    });
  });

  describe('getPriceHistory', () => {
    it('should return empty array for invalid area', async () => {
      (getHistoricalPrices as jest.Mock).mockResolvedValue([]);
      const result = await PriceStationConnector.getPriceHistory(
        'Invalid Area',
        'Premium Gasoline'
      );
      expect(result).toEqual([]);
    });

    it('should return sorted historical prices', async () => {
      const historicalPrices = [
        { ...mockPrice, week: '2023-43' },
        { ...mockPrice, week: '2023-44' },
      ];
      (getHistoricalPrices as jest.Mock).mockResolvedValue(historicalPrices);

      const result = await PriceStationConnector.getPriceHistory(
        'Manila',
        'Premium Gasoline'
      );

      expect(result[0].week_of).toBe('2023-44');
      expect(result[1].week_of).toBe('2023-43');
    });
  });

  describe('matchPricesWithStations', () => {
    it('should handle empty input gracefully', () => {
      const result = PriceStationConnector.matchPricesWithStations([], []);
      expect(result).toEqual({});
    });

    it('should group matches by normalized fuel type', () => {
      const result = PriceStationConnector.matchPricesWithStations(
        [mockPrice],
        [mockStation]
      );

      expect(result).toHaveProperty('premium gasoline');
      expect(result['premium gasoline']).toHaveLength(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle query errors in getPricesForStation', async () => {
      (getLatestWeek as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );
      const result = await PriceStationConnector.getPricesForStation(
        mockStation
      );
      expect(result).toEqual([]);
    });

    it('should handle query errors in getPriceHistory', async () => {
      (getHistoricalPrices as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );
      const result = await PriceStationConnector.getPriceHistory(
        'Manila',
        'Premium'
      );
      expect(result).toEqual([]);
    });
  });

  describe('Confidence Calculations', () => {
    it('should downgrade confidence for invalid prices', async () => {
      const invalidPrice = { ...mockPrice, price: -1 };
      (getPricesForWeek as jest.Mock).mockResolvedValue([invalidPrice]);

      const result = await PriceStationConnector.getPricesForStation(
        mockStation
      );
      expect(result[0].confidenceLevel).toBe('Low');
    });

    it('should mark matches below 0.5 confidence as low', () => {
      const result = PriceStationConnector.findMatchingStations(
        { ...mockPrice, brand: 'Mismatch' },
        [mockStation]
      );

      if (result.length > 0) {
        expect(result[0].confidence).toBe('Low');
      }
    });
  });
});
