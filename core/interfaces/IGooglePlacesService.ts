// src/core/interfaces/IGooglePlacesService.ts
export interface IGooglePlacesService {
  searchGasStationsInCity(
    city: string,
    nextPageToken?: string
  ): Promise<{
    stations: PlaceResult[];
    nextPageToken?: string;
  }>;
  getPlaceDetails(placeId: string): Promise<PlaceDetails>;
}

// Place result from Google Places Nearby Search API
export interface PlaceResult {
  place_id: string;
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  business_status?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
    html_attributions: string[];
  }>;
  plus_code?: {
    compound_code: string;
    global_code: string;
  };
  price_level?: number;
  opening_hours?: {
    open_now: boolean;
  };
}

// Place details from Google Places Details API
export interface PlaceDetails {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  rating?: number;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  opening_hours?: {
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
    weekday_text: string[];
  };
  business_status?: string;
  types: string[];
  address_components?: Array<{
    long_name: string;
    short_name: string;
    types: string[];
  }>;
  vicinity?: string;
  url?: string;
}
