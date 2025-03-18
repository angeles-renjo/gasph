export interface GasStation {
  id: string;
  name: string;
  brand: string;
  address: string;
  city: string;
  province?: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  amenities: string[];
  operating_hours: {
    open: string;
    close: string;
    is24_hours: boolean;
    days_open: string[];
  };
  status: 'active' | 'inactive' | 'temporary_closed' | 'permanently_closed';
  distance?: number;
}
