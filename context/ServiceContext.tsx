// src/context/ServiceContext.tsx
import React, { createContext, useContext } from 'react';
import { useServices } from '@/core/ServiceLocator';
import { IPriceService } from '@/core/interfaces/IPriceService';
import { IStationService } from '@/core/interfaces/IStationService';
import { ILocationService } from '@/core/interfaces/ILocationService';
import { IGooglePlacesService } from '@/core/interfaces/IGooglePlacesService';
import { IGasStationImportService } from '@/core/interfaces/IGasStationImportService';
import { IGasStationRepository } from '@/core/interfaces/IGasStationRepository';

interface ServiceContextType {
  priceService: IPriceService;
  stationService: IStationService;
  locationService: ILocationService;
  googlePlacesService: IGooglePlacesService;
  gasStationImportService: IGasStationImportService;
  gasStationRepository: IGasStationRepository;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const services = useServices();

  return (
    <ServiceContext.Provider value={services}>
      {children}
    </ServiceContext.Provider>
  );
};

export const useServiceContext = () => {
  const context = useContext(ServiceContext);
  if (context === undefined) {
    throw new Error('useServiceContext must be used within a ServiceProvider');
  }
  return context;
};
