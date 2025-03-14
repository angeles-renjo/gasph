// /core/models/FuelPrice.ts
export interface FuelPrice {
  id: string;
  area: string;
  brand: string;
  fuelType: string;
  minPrice: number;
  maxPrice: number;
  commonPrice: number;
  weekOf: Date;
  updatedAt: Date;
}
