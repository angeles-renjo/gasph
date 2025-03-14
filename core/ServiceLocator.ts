// src/core/ServiceLocator.ts
import { IFuelPriceRepository } from './interfaces/IFuelPriceRepository';
import { IGasStationRepository } from './interfaces/IGasStationRepository';
import { ILocationService } from './interfaces/ILocationService';
import { IPriceService } from './interfaces/IPriceService';
import { IStationService } from './interfaces/IStationService';
import { IUserService } from './interfaces/IUserService';

import { FuelPriceRepository } from '@/data/repositories/FuelPriceRepository';
import { GasStationRepository } from '@/data/repositories/GasStationRepository';
import { LocationService } from './services/LocationService';
import { PriceService } from './services/PriceService';
import { StationService } from './services/StationService';

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
