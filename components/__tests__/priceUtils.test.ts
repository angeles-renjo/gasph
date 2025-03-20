// __tests__/utils/priceUtils.test.ts
import {
  deduplicatePrices,
  countValidPrices,
  hasValidPriceData,
} from '../../utils/priceUtils';
import {
  normalizeFuelType,
  getShortFuelTypeName,
  isValidPrice,
} from '../../utils/formatters';
import { FuelPrice } from '../../core/models/FuelPrice';

// Helper function to create a price object with customizable parameters
const createTestPrice = (overrides: Partial<FuelPrice> = {}): FuelPrice => ({
  id: '1',
  fuel_type: 'Diesel',
  min_price: 0,
  common_price: 0,
  max_price: 0,
  brand: 'Shell',
  area: 'Quezon City',
  week_of: new Date(),
  updated_at: new Date(),
  ...overrides,
});

// Sample test data
const createSamplePrices = (): FuelPrice[] => [
  createTestPrice({
    id: '1',
    fuel_type: 'Diesel',
    min_price: 50.25,
    common_price: 52.3,
    max_price: 54.4,
    brand: 'Shell',
  }),
  createTestPrice({
    id: '2',
    fuel_type: 'Diesel Plus',
    min_price: 52.8,
    common_price: 54.9,
    max_price: 56.7,
    brand: 'Shell',
  }),
  createTestPrice({
    id: '3',
    fuel_type: 'diesel', // lowercase to test normalization
    min_price: 0,
    common_price: 51.2,
    max_price: 0,
    brand: 'Petron',
    area: 'Makati City',
  }),
  createTestPrice({
    id: '4',
    fuel_type: 'Gasoline (RON 95)',
    min_price: 60.1,
    common_price: 62.25,
    max_price: 64.4,
    brand: 'Shell',
  }),
  createTestPrice({
    id: '5',
    fuel_type: 'Diesel', // Duplicate fuel type
    min_price: 0,
    common_price: 0, // Invalid price
    max_price: 0,
    brand: 'Caltex',
  }),
];

// Create matched prices sample
const createMatchedPrices = () => [
  {
    price: createSamplePrices()[0],
    matchConfidence: 0.9,
    stationId: 'station-1',
  },
  {
    price: createSamplePrices()[2],
    matchConfidence: 0.75,
    stationId: 'station-2',
  },
];

describe('priceUtils', () => {
  describe('deduplicatePrices', () => {
    it('should deduplicate prices by normalized fuel type', () => {
      const prices = createSamplePrices();
      const result = deduplicatePrices(prices);

      // Should only have 3 fuel types after deduplication
      expect(result.length).toBe(3);

      // Check that we have the expected normalized types
      const fuelTypes = result.map((p) => p.normalized_type);
      expect(fuelTypes).toContain('Diesel');
      expect(fuelTypes).toContain('Diesel Plus');
      expect(fuelTypes).toContain('Gasoline (RON 95)');
    });

    it('should prioritize prices with valid data', () => {
      const prices = createSamplePrices();
      const result = deduplicatePrices(prices);

      // Find the diesel price
      const dieselPrice = result.find((p) => p.normalized_type === 'Diesel');

      // It should choose the Shell one with valid data
      expect(dieselPrice).toBeDefined();
      expect(dieselPrice?.brand).toBe('Shell');
      expect(dieselPrice?.common_price).toBe(52.3);
    });

    it('should handle match result objects correctly', () => {
      const matchedPrices = createMatchedPrices();
      const result = deduplicatePrices(matchedPrices);

      // Should have 1 result after deduplication
      expect(result.length).toBe(1);
      expect(result[0].normalized_type).toBe('Diesel');
    });

    it('should handle empty arrays', () => {
      const result = deduplicatePrices([]);
      expect(result).toEqual([]);
    });

    it('should handle null or undefined input', () => {
      // @ts-ignore - testing null input
      expect(deduplicatePrices(null)).toEqual([]);
      // @ts-ignore - testing undefined input
      expect(deduplicatePrices(undefined)).toEqual([]);
    });
  });

  describe('hasValidPriceData', () => {
    it.each([
      {
        scenario: 'valid min price',
        price: createTestPrice({ min_price: 50.25 }),
        expected: true,
      },
      {
        scenario: 'valid common price',
        price: createTestPrice({ common_price: 52.3 }),
        expected: true,
      },
      {
        scenario: 'valid max price',
        price: createTestPrice({ max_price: 54.4 }),
        expected: true,
      },
      {
        scenario: 'invalid price object',
        price: createTestPrice(),
        expected: false,
      },
    ])('should handle $scenario', ({ price, expected }) => {
      expect(hasValidPriceData(price)).toBe(expected);
    });
  });

  describe('countValidPrices', () => {
    it('should count prices with valid data', () => {
      const prices = createSamplePrices();
      // Only 4 out of 5 prices have valid data
      expect(countValidPrices(prices)).toBe(4);
    });

    it('should return 0 for empty array', () => {
      expect(countValidPrices([])).toBe(0);
    });
  });
});
