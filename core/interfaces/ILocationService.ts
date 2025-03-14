// /core/interfaces/ILocationService.ts
export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface ILocationService {
  getCurrentLocation(): Promise<Coordinates>;
  calculateDistance(from: Coordinates, to: Coordinates): number;
  getAddressFromCoordinates(coordinates: Coordinates): Promise<string>;
  getCoordinatesFromAddress(address: string): Promise<Coordinates>;
}
