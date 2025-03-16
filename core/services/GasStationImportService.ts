// src/core/services/GasStationImportService.ts
import { IGasStationImportService } from '@/core/interfaces/IGasStationImportService';
import {
  IGooglePlacesService,
  PlaceDetails,
} from '@/core/interfaces/IGooglePlacesService';
import { GasStation } from '@/core/models/GasStation';
import { BRANDS } from '@/utils/constants';
import { StationService } from './StationService';

export class GasStationImportService implements IGasStationImportService {
  private googlePlacesService: IGooglePlacesService;
  private stationService: StationService;

  constructor(
    googlePlacesService: IGooglePlacesService,
    stationService: StationService
  ) {
    this.googlePlacesService = googlePlacesService;
    this.stationService = stationService;
  }

  async importGasStationsFromCity(city: string): Promise<number> {
    let importedCount = 0;
    let nextPageToken: string | undefined;

    try {
      do {
        // If using a page token, wait longer before making the request
        if (nextPageToken) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // Fetch gas stations page by page
        const result = await this.googlePlacesService.searchGasStationsInCity(
          city,
          nextPageToken
        );
        nextPageToken = result.nextPageToken;

        // Process each station with a delay between each
        for (let i = 0; i < result.stations.length; i++) {
          const station = result.stations[i];
          try {
            // Important: Add a longer delay every few stations to avoid rate limits
            if (i > 0 && i % 3 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            // Prepare station data in database format
            const dbData: any = {
              name: station.name,
              brand: this.detectBrand(station.name),
              address: station.vicinity || `${station.name}, ${city}`,
              city: city,
              province: 'NCR',
              coordinates: `POINT(${station.geometry.location.lng} ${station.geometry.location.lat})`,
              amenities: this.detectAmenities(station.types || []),
              operating_hours: {
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
              },
              status:
                station.business_status === 'OPERATIONAL'
                  ? 'active'
                  : 'inactive',
            };

            // Try to get more details only if we really need them
            try {
              // Add a short delay before details request
              await new Promise((resolve) => setTimeout(resolve, 500));

              const details = await this.googlePlacesService.getPlaceDetails(
                station.place_id
              );

              // If we got details, enhance our basic data
              if (details) {
                // Update with better address
                if (details.formatted_address) {
                  dbData.address = details.formatted_address;
                }

                // Add better hours if available
                if (details.opening_hours) {
                  dbData.operating_hours = this.extractOperatingHours(
                    details.opening_hours
                  );
                }
              }
            } catch (error) {
              // If details request fails, just continue with basic data
            }

            // Check if station already exists - use model format for the query
            const gasStationName = dbData.name;
            const existingStations = await this.stationService.findByFilter({
              name: gasStationName,
            });

            // Check for coordinate match
            let coordinateMatch = false;
            if (existingStations.length > 0) {
              for (const existing of existingStations) {
                // Extract lat/lng from the POINT string
                const pointStr = dbData.coordinates;
                const match = pointStr.match(/POINT\(([^ ]+) ([^)]+)\)/);

                if (match) {
                  const lng = parseFloat(match[1]);
                  const lat = parseFloat(match[2]);

                  const latDiff = Math.abs(existing.coordinates.latitude - lat);
                  const lngDiff = Math.abs(
                    existing.coordinates.longitude - lng
                  );

                  // If coordinates are very close (within ~50 meters), consider it a match
                  if (latDiff < 0.0005 && lngDiff < 0.0005) {
                    coordinateMatch = true;
                    break;
                  }
                }
              }
            }

            if (existingStations.length === 0 || !coordinateMatch) {
              // Use stationService.create instead of repository
              await this.stationService.create(dbData);
              importedCount++;
            }
          } catch (error) {
            // Continue with next station instead of failing the whole batch
          }
        }
      } while (nextPageToken);

      return importedCount;
    } catch (error) {
      throw error;
    }
  }

  mapPlaceToGasStation(placeDetails: PlaceDetails): Partial<GasStation> {
    const operatingHours = this.extractOperatingHours(
      placeDetails.opening_hours
    );
    const brand = this.detectBrand(placeDetails.name);
    const amenities = this.detectAmenities(placeDetails.types);
    const status = this.mapBusinessStatus(placeDetails.business_status);

    let city = '';
    if (placeDetails.address_components) {
      const cityComponent = placeDetails.address_components.find(
        (comp) =>
          comp.types.includes('locality') ||
          comp.types.includes('administrative_area_level_3')
      );
      if (cityComponent) {
        city = cityComponent.long_name;
      }
    }

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

  private extractOperatingHours(hours?: PlaceDetails['opening_hours']): any {
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

    // Default times (in case we can't parse them)
    let openTime = '09:00';
    let closeTime = '17:00';

    // Get the first period's open/close times as default if available
    if (hours.periods.length > 0 && hours.periods[0].open) {
      openTime =
        hours.periods[0].open.time.slice(0, 2) +
        ':' +
        hours.periods[0].open.time.slice(2);
      if (hours.periods[0].close) {
        closeTime =
          hours.periods[0].close.time.slice(0, 2) +
          ':' +
          hours.periods[0].close.time.slice(2);
      }
    }

    // Parse which days are open
    const daysOpen: string[] = [];
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    if (is24Hours) {
      // If 24 hours, assume open every day
      daysOpen.push(...dayNames);
    } else {
      // For each period, add the day it starts on
      hours.periods.forEach((period) => {
        if (period.open && period.open.day >= 0 && period.open.day < 7) {
          daysOpen.push(dayNames[period.open.day]);
        }
      });
    }

    return {
      open: openTime,
      close: closeTime,
      is24_hours: is24Hours,
      days_open: daysOpen,
    };
  }

  private detectBrand(name: string): string {
    // Check for known brands in station name
    const lowerName = name.toLowerCase();

    for (const brand of BRANDS) {
      if (lowerName.includes(brand.toLowerCase())) {
        return brand;
      }
    }

    // Common brand prefixes/identifiers not in our constants
    if (lowerName.includes('petron')) return 'Petron';
    if (lowerName.includes('shell')) return 'Shell';
    if (lowerName.includes('caltex')) return 'Caltex';
    if (lowerName.includes('phoenix')) return 'Phoenix';
    if (lowerName.includes('seaoil')) return 'Seaoil';
    if (lowerName.includes('total')) return 'Total';
    if (lowerName.includes('ptt')) return 'PTT';
    if (lowerName.includes('unioil')) return 'Unioil';
    if (lowerName.includes('jetti')) return 'Jetti';
    if (lowerName.includes('flying v')) return 'Flying V';

    // Default to "Others" if no match
    return 'Others';
  }

  private detectAmenities(types: string[]): string[] {
    const amenities: string[] = [];

    // Map Google place types to our amenities
    if (types.includes('convenience_store'))
      amenities.push('Convenience Store');
    if (types.includes('atm')) amenities.push('ATM');
    if (types.includes('car_wash')) amenities.push('Car Wash');
    if (types.includes('restaurant') || types.includes('food'))
      amenities.push('Food Stall');

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

  private mapBusinessStatus(status?: string): GasStation['status'] {
    if (!status) return 'active';

    switch (status) {
      case 'OPERATIONAL':
        return 'active';
      case 'CLOSED_TEMPORARILY':
        return 'temporary_closed';
      case 'CLOSED_PERMANENTLY':
        return 'permanently_closed';
      default:
        return 'active';
    }
  }
}
