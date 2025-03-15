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
  operating_hours: {
    open: string;
    close: string;
    is24_hours: boolean; // Changed from is24Hours
    days_open: string[]; // Changed from daysOpen
  };
  status: 'active' | 'inactive' | 'temporary_closed' | 'permanently_closed';
  distance?: number;
}
