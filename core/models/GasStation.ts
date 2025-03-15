// /core/models/GasStation.ts - UPDATED
export interface GasStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  distance: number;
  city: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  amenities: string[];
  operatingHours: {
    open: string;
    close: string;
    is24Hours: boolean;
    daysOpen: string[];
  };
  status: 'active' | 'inactive' | 'temporary_closed' | 'permanently_closed';
}
