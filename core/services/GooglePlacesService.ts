// core/services/GooglePlacesService.ts
import {
  IGooglePlacesService,
  PlaceDetails,
  PlaceResult,
} from '@/core/interfaces/IGooglePlacesService';

export class GooglePlacesService implements IGooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async searchGasStationsInCity(
    city: string,
    nextPageToken?: string
  ): Promise<{
    stations: PlaceResult[];
    nextPageToken?: string;
  }> {
    try {
      // Build the appropriate URL based on whether we have a page token
      const url = nextPageToken
        ? this.buildPageTokenUrl(nextPageToken)
        : await this.buildInitialSearchUrl(city);

      // Make the request and handle the response
      return await this.executeNearbySearchRequest(url);
    } catch (error) {
      throw error;
    }
  }

  private buildPageTokenUrl(nextPageToken: string): string {
    return (
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' +
      `pagetoken=${encodeURIComponent(nextPageToken)}&key=${this.apiKey}`
    );
  }

  private async buildInitialSearchUrl(city: string): Promise<string> {
    // Get the city location
    const geocodeResult = await this.geocodeCity(city);
    if (!geocodeResult) {
      throw new Error(`Failed to geocode city: ${city}`);
    }

    // Build the URL for searching gas stations
    return (
      'https://maps.googleapis.com/maps/api/place/nearbysearch/json?' +
      `location=${geocodeResult.lat},${geocodeResult.lng}` +
      `&radius=15000` + // 15km radius
      `&type=gas_station` +
      `&key=${this.apiKey}`
    );
  }

  private async executeNearbySearchRequest(url: string): Promise<{
    stations: PlaceResult[];
    nextPageToken?: string;
  }> {
    const response = await fetch(url);
    const data = await response.json();

    this.validatePlacesApiResponse(data);

    return {
      stations: data.results || [],
      nextPageToken: data.next_page_token,
    };
  }

  private validatePlacesApiResponse(data: any): void {
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(
        `Google Places API error: ${data.status}${
          data.error_message ? ` - ${data.error_message}` : ''
        }`
      );
    }
  }

  async getPlaceDetails(placeId: string): Promise<PlaceDetails> {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/place/details/json?` +
        `place_id=${placeId}` +
        `&fields=place_id,name,formatted_address,geometry,opening_hours,business_status,types,formatted_phone_number,website,address_components,vicinity` +
        `&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK') {
        throw new Error(
          `Google Places Details API error: ${data.status}${
            data.error_message ? ` - ${data.error_message}` : ''
          }`
        );
      }

      return data.result;
    } catch (error) {
      throw error;
    }
  }

  private async geocodeCity(
    cityName: string
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      // Add Philippines to make the search more accurate
      const searchAddress = `${cityName}, Philippines`;
      const url = this.buildGeocodeUrl(searchAddress);

      const response = await fetch(url);
      const data = await response.json();

      return this.extractGeocodeLocation(data);
    } catch (error) {
      return null;
    }
  }

  private buildGeocodeUrl(address: string): string {
    return (
      `https://maps.googleapis.com/maps/api/geocode/json?` +
      `address=${encodeURIComponent(address)}` +
      `&key=${this.apiKey}`
    );
  }

  private extractGeocodeLocation(
    data: any
  ): { lat: number; lng: number } | null {
    // First check if the status is OK
    if (data.status !== 'OK') {
      return null;
    }

    // Then check if we have results
    if (!data.results) {
      return null;
    }

    // Finally check if there's at least one result
    if (data.results.length === 0) {
      return null;
    }

    // Get location of the first result
    return data.results[0].geometry.location;
  }
}
