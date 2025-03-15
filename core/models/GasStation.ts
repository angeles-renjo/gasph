// /core/models/GasStation.ts
export interface GasStation {
  id: string;
  name: string;
  brand: string;
  address: string;
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
  // The distance field is calculated at query time and not stored in the database
  distance?: number;
}
