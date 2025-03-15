// src/core/services/GooglePlacesService.ts
import {
  IGooglePlacesService,
  PlaceDetails,
  PlaceResult,
} from '@/core/interfaces/IGooglePlacesService';

export class GooglePlacesService implements IGooglePlacesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;

    if (!apiKey) {
      console.warn('GooglePlacesService initialized without API key');
    }
  }

  async searchGasStationsInCity(
    city: string,
    nextPageToken?: string
  ): Promise<{
    stations: PlaceResult[];
    nextPageToken?: string;
  }> {
    try {
      // Base URL for nearby search
      let url = 'https://maps.googleapis.com/maps/api/place/nearbysearch/json?';

      // If nextPageToken is provided, use it for pagination
      if (nextPageToken) {
        url += `pagetoken=${encodeURIComponent(nextPageToken)}&key=${
          this.apiKey
        }`;
      } else {
        // Location (geocode the city)
        const geocodeResult = await this.geocodeCity(city);
        if (!geocodeResult) {
          throw new Error(`Failed to geocode city: ${city}`);
        }

        // Search for gas stations near the city center
        url +=
          `location=${geocodeResult.lat},${geocodeResult.lng}` +
          `&radius=15000` + // 15km radius
          `&type=gas_station` +
          `&key=${this.apiKey}`;
      }

      console.log(`Fetching gas stations with URL: ${url}`);
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
        console.error(
          'Google Places API error:',
          data.status,
          data.error_message
        );
        throw new Error(
          `Google Places API error: ${data.status}${
            data.error_message ? ` - ${data.error_message}` : ''
          }`
        );
      }

      return {
        stations: data.results || [],
        nextPageToken: data.next_page_token,
      };
    } catch (error) {
      console.error('Error searching gas stations:', error);
      throw error;
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
        console.error(
          'Google Places Details API error:',
          data.status,
          data.error_message
        );
        throw new Error(
          `Google Places Details API error: ${data.status}${
            data.error_message ? ` - ${data.error_message}` : ''
          }`
        );
      }

      return data.result;
    } catch (error) {
      console.error('Error fetching place details:', error);
      throw error;
    }
  }

  private async geocodeCity(
    cityName: string
  ): Promise<{ lat: number; lng: number } | null> {
    try {
      // Add Philippines to make the search more accurate
      const searchAddress = `${cityName}, Philippines`;
      console.log(`Geocoding address: ${searchAddress}`);

      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?` +
        `address=${encodeURIComponent(searchAddress)}` +
        `&key=${this.apiKey}`;

      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        console.error('Geocoding error:', data.status, data.error_message);
        return null;
      }

      // Get location of the first result
      const location = data.results[0].geometry.location;
      console.log(`Geocoded ${cityName} to:`, location);

      return location;
    } catch (error) {
      console.error('Error geocoding city:', error);
      return null;
    }
  }
}
