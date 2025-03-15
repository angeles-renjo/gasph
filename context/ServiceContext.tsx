import React, { createContext, useContext } from 'react';
import {
  priceService,
  stationService,
  locationService,
  googlePlacesService,
  gasStationImportService,
} from '@/core/services';

interface ServiceContextType {
  priceService: typeof priceService;
  stationService: typeof stationService;
  locationService: typeof locationService;
  googlePlacesService: typeof googlePlacesService;
  gasStationImportService: typeof gasStationImportService;
}

const ServiceContext = createContext<ServiceContextType | undefined>(undefined);

export const ServiceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ServiceContext.Provider
      value={{
        priceService,
        stationService,
        locationService,
        googlePlacesService,
        gasStationImportService,
      }}
    >
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
