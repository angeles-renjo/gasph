import { IGasStationImportService } from '@/core/interfaces/IGasStationImportService';
import {
  IGooglePlacesService,
  PlaceDetails,
  PlaceResult,
} from '@/core/interfaces/IGooglePlacesService';
import { GasStation } from '@/core/models/GasStation';
import { BRANDS } from '@/utils/constants';
import { StationService } from './StationService';

// Define clear interfaces for data structures
interface OperatingHours {
  open: string;
  close: string;
  is24_hours: boolean;
  days_open: string[];
}

// Make StationData compatible with GasStation
interface StationData extends Omit<GasStation, 'id' | 'coordinates'> {
  coordinates: { latitude: number; longitude: number };
  city: string;
  province: string;
  operating_hours: OperatingHours;
}

export class GasStationImportService implements IGasStationImportService {
  constructor(
    private googlePlacesService: IGooglePlacesService,
    private stationService: StationService
  ) {}

  /**
   * Main orchestrator method for importing gas stations from a city
   */
  async importGasStationsFromCity(city: string): Promise<number> {
    let importedCount = 0;
    let nextPageToken: string | undefined;

    try {
      do {
        // Process a single batch of stations
        const batchResult = await this.processBatch(city, nextPageToken);
        importedCount += batchResult.importedCount;
        nextPageToken = batchResult.nextPageToken;
      } while (nextPageToken);

      return importedCount;
    } catch (error) {
      console.error('Station import failed:', error);
      throw error;
    }
  }

  /**
   * Process a single batch of station results
   */
  private async processBatch(
    city: string,
    pageToken?: string
  ): Promise<{ importedCount: number; nextPageToken?: string }> {
    // Apply delay for subsequent page requests
    if (pageToken) {
      await this.delayRequest();
    }

    // Fetch the batch of stations
    const result = await this.googlePlacesService.searchGasStationsInCity(
      city,
      pageToken
    );

    // Process each station in the batch
    let batchImportCount = 0;
    for (let i = 0; i < result.stations.length; i++) {
      // Apply rate limiting
      if (i > 0 && i % 3 === 0) {
        await this.delayRequest(2000);
      }

      // Import a single station
      try {
        const wasImported = await this.importSingleStation(
          result.stations[i],
          city
        );
        if (wasImported) {
          batchImportCount++;
        }
      } catch (stationError) {
        console.error(`Error importing station: ${stationError}`);
      }
    }

    return {
      importedCount: batchImportCount,
      nextPageToken: result.nextPageToken,
    };
  }

  /**
   * Import a single station
   */
  private async importSingleStation(
    station: PlaceResult,
    city: string
  ): Promise<boolean> {
    // Prepare the station data
    const stationData = await this.prepareStationData(station, city);

    // Check if it's a new station before saving
    if (await this.isNewStation(stationData)) {
      await this.stationService.create(stationData);
      return true;
    }

    return false;
  }

  /**
   * Prepare station data with basic and detailed information
   */
  private async prepareStationData(
    station: PlaceResult,
    city: string
  ): Promise<StationData> {
    // Parse coordinates
    const coordinates = {
      latitude: station.geometry.location.lat,
      longitude: station.geometry.location.lng,
    };

    // Create basic station data
    const baseData: StationData = {
      name: station.name,
      brand: this.detectBrand(station.name),
      address: station.vicinity || `${station.name}, ${city}`,
      city: city,
      province: 'NCR',
      coordinates: coordinates,
      amenities: this.detectAmenities(station.types || []),
      operating_hours: this.getDefaultOperatingHours(),
      status: this.mapBusinessStatus(station.business_status),
    };

    // Try to enhance with detailed information
    try {
      await this.delayRequest(500);
      const details = await this.googlePlacesService.getPlaceDetails(
        station.place_id
      );
      return this.enhanceWithDetails(baseData, details);
    } catch {
      // Return base data if details fetch fails
      return baseData;
    }
  }

  /**
   * Check if the station is new based on name and coordinates
   */
  private async isNewStation(stationData: StationData): Promise<boolean> {
    const existingStations = await this.stationService.findByFilter({
      name: stationData.name,
    });

    // No need to continue checks if no stations with this name exist
    if (existingStations.length === 0) {
      return true;
    }

    // Check if any existing station has similar coordinates
    return !existingStations.some((existing) =>
      this.areCoordinatesClose(existing.coordinates, stationData.coordinates)
    );
  }

  /**
   * Enhance basic station data with details from place details
   */
  private enhanceWithDetails(
    baseData: StationData,
    details: PlaceDetails
  ): StationData {
    // Clone the base data to avoid mutation
    const enhancedData = { ...baseData };

    // Update with better address if available
    if (details.formatted_address) {
      enhancedData.address = details.formatted_address;
    }

    // Add better hours if available
    if (details.opening_hours) {
      enhancedData.operating_hours = this.extractOperatingHours(
        details.opening_hours
      );
    }

    return enhancedData;
  }

  /**
   * Check if two sets of coordinates are close to each other
   */
  private areCoordinatesClose(
    coord1: { latitude: number; longitude: number },
    coord2: { latitude: number; longitude: number }
  ): boolean {
    // Consider coordinates close if within ~50 meters
    const CLOSE_THRESHOLD = 0.0005;
    return (
      Math.abs(coord1.latitude - coord2.latitude) < CLOSE_THRESHOLD &&
      Math.abs(coord1.longitude - coord2.longitude) < CLOSE_THRESHOLD
    );
  }

  /**
   * Create a delay for rate limiting
   */
  private delayRequest(ms: number = 3000): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Detect the brand of a gas station from its name
   */
  private detectBrand(name: string): string {
    if (!name) return 'Others';

    const lowerName = name.toLowerCase();

    // First check against known brands list
    const knownBrand = this.findKnownBrand(lowerName);
    if (knownBrand) return knownBrand;

    // Then check against common brand names not in BRANDS
    const commonBrand = this.findCommonBrand(lowerName);
    if (commonBrand) return commonBrand;

    // Default to "Others" if no match
    return 'Others';
  }

  /**
   * Find a match in the BRANDS constant
   */
  private findKnownBrand(lowerName: string): string | null {
    for (const brand of BRANDS) {
      if (lowerName.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return null;
  }

  /**
   * Find a match in common brand names not in the BRANDS constant
   */
  private findCommonBrand(lowerName: string): string | null {
    const brandMap: Record<string, string> = {
      petron: 'Petron',
      shell: 'Shell',
      caltex: 'Caltex',
      phoenix: 'Phoenix',
      seaoil: 'Seaoil',
      total: 'Total',
      ptt: 'PTT',
      unioil: 'Unioil',
      jetti: 'Jetti',
      'flying v': 'Flying V',
    };

    for (const [key, brand] of Object.entries(brandMap)) {
      if (lowerName.includes(key)) {
        return brand;
      }
    }

    return null;
  }

  /**
   * Detect amenities based on place types
   */
  private detectAmenities(types: string[]): string[] {
    const amenities: string[] = [];

    // Map of place types to amenities
    const amenityMap: Record<string, string> = {
      convenience_store: 'Convenience Store',
      atm: 'ATM',
      car_wash: 'Car Wash',
      restaurant: 'Food Stall',
      food: 'Food Stall',
    };

    // Add amenities based on place types
    for (const [placeType, amenity] of Object.entries(amenityMap)) {
      if (types.includes(placeType) && !amenities.includes(amenity)) {
        amenities.push(amenity);
      }
    }

    // Common gas station amenities that we can reasonably assume
    if (Math.random() > 0.2) {
      // 80% of gas stations likely have restrooms
      amenities.push('Restroom');
    }

    if (Math.random() > 0.5) {
      // 50% of gas stations likely have air pumps
      amenities.push('Air Pump');
    }

    return amenities;
  }

  /**
   * Get default operating hours (24/7)
   */
  private getDefaultOperatingHours(): OperatingHours {
    return {
      open: '00:00',
      close: '23:59',
      is24_hours: true,
      days_open: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
    };
  }

  /**
   * Extract operating hours from place details
   */
  private extractOperatingHours(
    hours?: PlaceDetails['opening_hours']
  ): OperatingHours {
    if (!hours || !hours.periods) {
      return {
        open: '09:00',
        close: '17:00',
        is24_hours: false,
        days_open: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      };
    }

    // Check if open 24/7 (has one period with no close time)
    const is24Hours = hours.periods.some((p) => !p.close);

    // Get opening and closing times
    const { openTime, closeTime } = this.extractBusinessHours(hours.periods);

    // Parse which days are open
    const daysOpen = this.extractBusinessDays(hours.periods, is24Hours);

    return {
      open: openTime,
      close: closeTime,
      is24_hours: is24Hours,
      days_open: daysOpen,
    };
  }

  /**
   * Extract business hours from periods
   */
  private extractBusinessHours(
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>
  ): { openTime: string; closeTime: string } {
    // Default times
    let openTime = '09:00';
    let closeTime = '17:00';

    // Extract from first period if available
    if (periods.length > 0 && periods[0].open) {
      openTime = this.formatTime(periods[0].open.time);

      if (periods[0].close) {
        closeTime = this.formatTime(periods[0].close.time);
      }
    }

    return { openTime, closeTime };
  }

  /**
   * Format time from HHMM to HH:MM
   */
  private formatTime(time: string): string {
    return time.slice(0, 2) + ':' + time.slice(2);
  }

  /**
   * Extract business days from periods
   */
  private extractBusinessDays(
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>,
    is24Hours: boolean
  ): string[] {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    // If 24 hours, return all days
    if (is24Hours) {
      return [...dayNames];
    }

    // Convert periods to days
    const daysOpen: string[] = [];
    periods.forEach((period) => {
      const day = this.getDayFromPeriod(period, dayNames);
      if (day && !daysOpen.includes(day)) {
        daysOpen.push(day);
      }
    });

    return daysOpen;
  }

  /**
   * Extract day name from a period
   */
  private getDayFromPeriod(
    period: {
      open: { day: number; time: string };
      close?: { day: number; time: string };
    },
    dayNames: string[]
  ): string | null {
    // Check if the day index is valid
    if (!this.isValidDayIndex(period.open.day)) {
      return null;
    }

    return dayNames[period.open.day];
  }

  /**
   * Check if a day index is valid (0-6)
   */
  private isValidDayIndex(dayIndex: number): boolean {
    return dayIndex >= 0 && dayIndex < 7;
  }

  /**
   * Map business status from Google Places to internal format
   */
  private mapBusinessStatus(status?: string): GasStation['status'] {
    if (!status) return 'active';

    const statusMap: Record<string, GasStation['status']> = {
      OPERATIONAL: 'active',
      CLOSED_TEMPORARILY: 'temporary_closed',
      CLOSED_PERMANENTLY: 'permanently_closed',
    };

    return statusMap[status] || 'active';
  }

  /**
   * Map a Google Place to a GasStation model
   */
  mapPlaceToGasStation(placeDetails: PlaceDetails): Partial<GasStation> {
    const operatingHours = this.extractOperatingHours(
      placeDetails.opening_hours
    );
    const brand = this.detectBrand(placeDetails.name);
    const amenities = this.detectAmenities(placeDetails.types);
    const status = this.mapBusinessStatus(placeDetails.business_status);
    const city = this.extractCity(placeDetails.address_components);

    return {
      name: placeDetails.name,
      brand: brand,
      address: placeDetails.formatted_address,
      city: city,
      coordinates: {
        latitude: placeDetails.geometry.location.lat,
        longitude: placeDetails.geometry.location.lng,
      },
      amenities: amenities,
      operating_hours: operatingHours,
      status: status,
    };
  }

  /**
   * Extract city from address components
   */
  private extractCity(
    addressComponents?: PlaceDetails['address_components']
  ): string {
    if (!addressComponents) return '';

    const cityComponent = addressComponents.find(
      (comp) =>
        comp.types.includes('locality') ||
        comp.types.includes('administrative_area_level_3')
    );

    return cityComponent ? cityComponent.long_name : '';
  }
}
