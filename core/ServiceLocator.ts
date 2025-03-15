// src/core/ServiceLocator.ts
import { IFuelPriceRepository } from './interfaces/IFuelPriceRepository';
import { IGasStationRepository } from './interfaces/IGasStationRepository';
import { ILocationService } from './interfaces/ILocationService';
import { IPriceService } from './interfaces/IPriceService';
import { IStationService } from './interfaces/IStationService';
import { IUserService } from './interfaces/IUserService';
import { IGooglePlacesService } from './interfaces/IGooglePlacesService';
import { IGasStationImportService } from './interfaces/IGasStationImportService';

import { FuelPriceRepository } from '@/data/repositories/FuelPriceRepository';
import { GasStationRepository } from '@/data/repositories/GasStationRepository';
import { LocationService } from './services/LocationService';
import { PriceService } from './services/PriceService';
import { StationService } from './services/StationService';
import { GooglePlacesService } from './services/GooglePlacesService';
import { GasStationImportService } from './services/GasStationImportService';

import Constants from 'expo-constants';

// This is a simple service locator pattern
// In a larger app, you might want to use a more sophisticated DI container
class ServiceLocator {
  private static instance: ServiceLocator;
  private services: Map<string, any> = new Map();

  private constructor() {
    // Initialize repositories
    this.services.set('fuelPriceRepository', new FuelPriceRepository());
    this.services.set('gasStationRepository', new GasStationRepository());

    // Initialize services
    this.services.set('locationService', new LocationService());
    this.services.set(
      'priceService',
      new PriceService(this.get<IFuelPriceRepository>('fuelPriceRepository'))
    );
    this.services.set(
      'stationService',
      new StationService(
        this.get<IGasStationRepository>('gasStationRepository')
      )
    );

    // Get Google API key from environment variables or Constants
    const googleApiKey =
      process.env.EXPO_PUBLIC_GOOGLE_API_KEY ||
      (Constants.expoConfig?.extra?.googleApiKey as string) ||
      '';

    if (!googleApiKey) {
      console.warn(
        'No Google API key found. Google Places features will not work.'
      );
    }

    // Initialize Google Places API service
    this.services.set(
      'googlePlacesService',
      new GooglePlacesService(googleApiKey)
    );

    // Initialize Gas Station Import service
    this.services.set(
      'gasStationImportService',
      new GasStationImportService(
        this.get<IGooglePlacesService>('googlePlacesService'),
        this.get<IGasStationRepository>('gasStationRepository')
      )
    );
  }

  public static getInstance(): ServiceLocator {
    if (!ServiceLocator.instance) {
      ServiceLocator.instance = new ServiceLocator();
    }
    return ServiceLocator.instance;
  }

  public get<T>(serviceKey: string): T {
    const service = this.services.get(serviceKey);
    if (!service) {
      throw new Error(`Service ${serviceKey} not found`);
    }
    return service as T;
  }

  // For testing: register a mock implementation
  public register<T>(serviceKey: string, implementation: T): void {
    this.services.set(serviceKey, implementation);
  }
}

// Export convenience functions
export function useServices() {
  const locator = ServiceLocator.getInstance();

  return {
    priceService: locator.get<IPriceService>('priceService'),
    stationService: locator.get<IStationService>('stationService'),
    locationService: locator.get<ILocationService>('locationService'),
    googlePlacesService: locator.get<IGooglePlacesService>(
      'googlePlacesService'
    ),
    gasStationImportService: locator.get<IGasStationImportService>(
      'gasStationImportService'
    ),
    gasStationRepository: locator.get<IGasStationRepository>(
      'gasStationRepository'
    ),
  };
}

// For testing
export function registerMock<T>(
  serviceKey: string,
  mockImplementation: T
): void {
  const locator = ServiceLocator.getInstance();
  locator.register(serviceKey, mockImplementation);
}
