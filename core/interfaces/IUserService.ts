// core/interfaces/IUserService.ts
import { User } from '../models/User';

export interface IUserService {
  getCurrentUser(): Promise<User | null>;
  updateUserPreferences(
    preferences: Partial<User['preferences']>
  ): Promise<void>;
  addFavoriteStation(stationId: string): Promise<void>;
  removeFavoriteStation(stationId: string): Promise<void>;
  getFavoriteStations(): Promise<string[]>;
}

// src/core/interfaces/IPdfParserService.ts
import { FuelPrice } from '../models/FuelPrice';

export interface IPdfParserService {
  parsePdfFile(fileUri: string): Promise<FuelPrice[]>;
  extractTabularData(pdfContent: Uint8Array): Promise<any[][]>;
  mapToFuelPrices(rawData: any[][], weekOf: Date): FuelPrice[];
}
