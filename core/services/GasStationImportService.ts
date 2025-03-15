// src/core/services/GasStationImportService.ts
import { IGasStationImportService } from '@/core/interfaces/IGasStationImportService';
import { IGasStationRepository } from '@/core/interfaces/IGasStationRepository';
import {
  IGooglePlacesService,
  PlaceDetails,
} from '@/core/interfaces/IGooglePlacesService';
import { GasStation } from '@/core/models/GasStation';
import { BRANDS, AMENITIES } from '@/utils/constants';

export class GasStationImportService implements IGasStationImportService {
  private googlePlacesService: IGooglePlacesService;
  private gasStationRepository: IGasStationRepository;

  constructor(
    googlePlacesService: IGooglePlacesService,
    gasStationRepository: IGasStationRepository
  ) {
    this.googlePlacesService = googlePlacesService;
    this.gasStationRepository = gasStationRepository;
  }

  async importGasStationsFromCity(city: string): Promise<number> {
    let importedCount = 0;
    let nextPageToken: string | undefined;

    try {
      console.log(`Starting import for gas stations in ${city}`);

      do {
        // If using a page token, wait longer before making the request
        if (nextPageToken) {
          console.log('Waiting for 3 seconds before fetching next page...');
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        // Fetch gas stations page by page
        console.log(
          `Fetching page of gas stations${nextPageToken ? ' with token' : ''}`
        );
        const result = await this.googlePlacesService.searchGasStationsInCity(
          city,
          nextPageToken
        );
        nextPageToken = result.nextPageToken;

        console.log(`Found ${result.stations.length} stations in this page`);

        // Process each station with a delay between each
        for (let i = 0; i < result.stations.length; i++) {
          const station = result.stations[i];
          try {
            console.log(
              `Processing station (${i + 1}/${result.stations.length}): ${
                station.name
              } (${station.place_id})`
            );

            // Important: Add a longer delay every few stations to avoid rate limits
            if (i > 0 && i % 3 === 0) {
              console.log('Taking a short break to avoid rate limits...');
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
                is24Hours: true,
                daysOpen: [
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
              console.log(
                `Couldn't get additional details, using basic data: ${
                  error instanceof Error ? error.message : String(error)
                }`
              );
            }

            // Check if station already exists - use model format for the query
            const gasStationName = dbData.name;
            const existingStations =
              await this.gasStationRepository.findByFilter({
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
                    console.log(
                      `Found existing station with similar coordinates: ${existing.name}`
                    );
                    break;
                  }
                }
              }
            }

            if (existingStations.length === 0 || !coordinateMatch) {
              console.log(`Importing new station: ${dbData.name}`);

              // Pass data directly in database format - repository will handle it
              await this.gasStationRepository.create(dbData);
              importedCount++;
            } else {
              console.log(`Station already exists: ${dbData.name} - skipping`);
            }
          } catch (error) {
            console.error(`Error processing station ${station.name}:`, error);
            // Continue with next station instead of failing the whole batch
          }
        }
      } while (nextPageToken);

      console.log(
        `Import completed. Imported ${importedCount} new stations in ${city}`
      );
      return importedCount;
    } catch (error) {
      console.error(`Error importing gas stations from ${city}:`, error);
      throw error;
    }
  }

  // Map Google Places data directly to database format (snake_case and proper types)
  mapPlaceToDatabase(placeDetails: PlaceDetails, city: string): any {
    // Extract operating hours
    const operatingHours = this.extractOperatingHours(
      placeDetails.opening_hours
    );

    // Detect brand from name
    const brand = this.detectBrand(placeDetails.name);

    // Extract amenities based on types and common features
    const amenities = this.detectAmenities(placeDetails.types);

    // Map status
    const status = this.mapBusinessStatus(placeDetails.business_status);

    // Extract province from address components if available
    let province = 'NCR'; // Default to NCR (Metro Manila) for Philippines
    if (placeDetails.address_components) {
      const provinceComponent = placeDetails.address_components.find(
        (comp) =>
          comp.types.includes('administrative_area_level_2') ||
          comp.types.includes('administrative_area_level_1')
      );
      if (provinceComponent) {
        province = provinceComponent.long_name;
      }
    }

    // Format coordinates as PostgreSQL POINT
    const coordinates = `POINT(${placeDetails.geometry.location.lng} ${placeDetails.geometry.location.lat})`;

    // Return the mapped data in snake_case format matching the database schema
    return {
      name: placeDetails.name,
      brand: brand,
      address: placeDetails.formatted_address,
      city: city,
      province: province,
      coordinates: coordinates,
      amenities: amenities,
      operating_hours: operatingHours, // Note: snake_case for database
      status: status,
      // created_at and updated_at will be handled by the database defaults
    };
  }

  // This returns the JavaScript object that will be stored as JSONB
  private extractOperatingHours(hours?: PlaceDetails['opening_hours']): any {
    if (!hours || !hours.periods) {
      return {
        open: '09:00',
        close: '17:00',
        is24Hours: false,
        daysOpen: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
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
      is24Hours,
      daysOpen,
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

  mapPlaceToGasStation(placeDetails: PlaceDetails): Partial<GasStation> {
    // This is used for the TypeScript model in memory, not for database storage
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
      operatingHours: operatingHours,
      status: status,
    };
  }
}
