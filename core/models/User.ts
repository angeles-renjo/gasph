export interface User {
  id: string;
  email: string;
  display_name: string; // Changed from displayName
  favorite_stations: string[]; // Changed from favoriteStations
  preferences: {
    default_fuel_type: string; // Changed from defaultFuelType
    notifications_enabled: boolean; // Changed from notificationsEnabled
    radius_preference: number; // Changed from radiusPreference
  };
}
