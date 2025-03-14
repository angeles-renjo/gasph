// /core/models/User.ts
export interface User {
  id: string;
  email: string;
  displayName: string;
  favoriteStations: string[];
  preferences: {
    defaultFuelType: string;
    notificationsEnabled: boolean;
    radiusPreference: number; // in kilometers
  };
}
