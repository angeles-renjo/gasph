export interface FuelPrice {
  id: string;
  area: string;
  brand: string;
  fuel_type: string; // Changed from fuelType
  min_price: number; // Changed from minPrice
  max_price: number; // Changed from maxPrice
  common_price: number; // Changed from commonPrice
  week_of: Date; // Changed from weekOf
  updated_at: Date; // Changed from updatedAt
}
