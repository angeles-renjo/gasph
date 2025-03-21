// utils/areaMapping.ts
// Utilities for mapping and matching geographic areas

/**
 * Type definitions for domain concepts
 */
export type CityName = string;
export type AreaName = string;

/**
 * City object with standard name and aliases
 */
export interface City {
  standardName: CityName;
  aliases: string[];
}

/**
 * Area object with name and associated cities
 */
export interface Area {
  name: AreaName;
  cities: CityName[];
}

/**
 * Confidence score for area-city matching
 */
export type ConfidenceScore = number;

/**
 * Known areas and their cities
 */
export const AREAS: Area[] = [
  {
    name: 'NCR',
    cities: [
      'Quezon City',
      'Manila City',
      'Makati City',
      'Pasig City',
      'Taguig City',
      'Pasay City',
      'Caloocan City',
      'Parañaque City',
      'Mandaluyong City',
      'Las Piñas City',
      'Marikina City',
      'Muntinlupa City',
      'San Juan City',
      'Valenzuela City',
      'Navotas City',
      'Malabon City',
      'Pateros',
    ],
  },
  {
    name: 'Metro Manila',
    cities: [
      'Quezon City',
      'Manila City',
      'Makati City',
      'Pasig City',
      'Taguig City',
      'Pasay City',
      'Caloocan City',
      'Parañaque City',
      'Mandaluyong City',
      'Las Piñas City',
      'Marikina City',
      'Muntinlupa City',
      'San Juan City',
      'Valenzuela City',
      'Navotas City',
      'Malabon City',
      'Pateros',
    ],
  },
];

/**
 * Known city aliases
 */
export const CITIES: City[] = [
  {
    standardName: 'Manila City',
    aliases: ['Manila', 'City of Manila'],
  },
  {
    standardName: 'Quezon City',
    aliases: ['QC'],
  },
  {
    standardName: 'Makati City',
    aliases: ['Makati', 'City of Makati'],
  },
  {
    standardName: 'Taguig City',
    aliases: ['Taguig', 'BGC', 'Bonifacio Global City'],
  },
  {
    standardName: 'Pasig City',
    aliases: ['Pasig'],
  },
  {
    standardName: 'Pasay City',
    aliases: ['Pasay'],
  },
  {
    standardName: 'Caloocan City',
    aliases: ['Caloocan', 'North Caloocan', 'South Caloocan'],
  },
  {
    standardName: 'Parañaque City',
    aliases: ['Parañaque', 'Paranaque City', 'Paranaque'],
  },
];

// For backward compatibility
export const AREA_MAPPING: Record<string, string[]> = AREAS.reduce(
  (map, area) => ({ ...map, [area.name]: area.cities }),
  {}
);

export const CITY_ALIASES: Record<string, string[]> = CITIES.reduce(
  (map, city) => ({ ...map, [city.standardName]: city.aliases }),
  {}
);

// Create maps for efficient lookups
const cityByStandardName = new Map<string, City>(
  CITIES.map((city) => [city.standardName.toLowerCase(), city])
);

const cityByAlias = new Map<string, City>();
CITIES.forEach((city) => {
  city.aliases.forEach((alias) => {
    cityByAlias.set(alias.toLowerCase(), city);
  });
});

const areaByName = new Map<string, Area>(
  AREAS.map((area) => [area.name.toLowerCase(), area])
);

/**
 * Get parent area for a city
 * @param cityName City name
 * @returns Parent area name or null if not found
 */
export function getParentArea(cityName: CityName): AreaName | null {
  if (!cityName) return null;

  const normalizedCity = normalizeCityName(cityName);

  for (const area of AREAS) {
    if (
      area.cities.some((city) => normalizeCityName(city) === normalizedCity)
    ) {
      return area.name;
    }
  }

  return null;
}

/**
 * Get all cities in an area
 * @param areaName Area name (e.g., NCR)
 * @returns Array of city names in the area
 */
export function getCitiesInArea(areaName: AreaName): CityName[] {
  if (!areaName) return [];

  // Try direct match
  const normalizedAreaName = areaName.toLowerCase().trim();
  const area = areaByName.get(normalizedAreaName);

  if (area) {
    return area.cities;
  }

  return [];
}

/**
 * Find city by standard name or alias
 * @param input City name input
 * @returns City object if found, null otherwise
 */
function findCityByExactMatch(input: string): City | null {
  const lowerInput = input.toLowerCase();

  // Check standard names
  const cityByStandard = cityByStandardName.get(lowerInput);
  if (cityByStandard) {
    return cityByStandard;
  }

  // Check aliases
  const cityByAliasMatch = cityByAlias.get(lowerInput);
  if (cityByAliasMatch) {
    return cityByAliasMatch;
  }

  return null;
}

/**
 * Find city by matching substrings
 * @param input Normalized city name input
 * @returns City object if found, null otherwise
 */
function findCityBySubstring(input: string): City | null {
  // Create a flat array of search patterns
  const patterns = CITIES.flatMap((city) => {
    // Start with the standard name
    const allPatterns = [
      {
        pattern: city.standardName.toLowerCase(),
        city,
      },
    ];

    // Add all aliases
    city.aliases.forEach((alias) => {
      allPatterns.push({
        pattern: alias.toLowerCase(),
        city,
      });
    });

    return allPatterns;
  });

  // Find first matching pattern
  const match = patterns.find((item) => input.includes(item.pattern));
  return match ? match.city : null;
}

/**
 * Fix city name format for names ending with "city"
 * @param input City name input
 * @returns Properly formatted city name
 */
function formatCityName(input: string): CityName | null {
  if (input.toLowerCase().endsWith('city') && !input.endsWith(' City')) {
    const baseName = input
      .substring(0, input.toLowerCase().lastIndexOf('city'))
      .trim();
    return `${baseName} City`;
  }

  return null;
}

/**
 * Normalize city name to handle variations
 * @param cityName City name to normalize
 * @returns Standardized city name
 */
export function normalizeCityName(cityName: CityName): CityName {
  if (!cityName) return '';

  // Normalize input
  const input = cityName.trim();
  const lowerInput = input.toLowerCase();

  // Strategy 1: Check for exact matches
  const exactMatch = findCityByExactMatch(lowerInput);
  if (exactMatch) {
    return exactMatch.standardName;
  }

  // Strategy 2: Check if input contains a known city name
  const substringMatch = findCityBySubstring(lowerInput);
  if (substringMatch) {
    return substringMatch.standardName;
  }

  // Strategy 3: Check for city formatting issues
  const formattedCity = formatCityName(input);
  if (formattedCity) {
    return formattedCity;
  }

  // Default: return the input as is
  return input;
}

/**
 * Match result with confidence score
 */
interface MatchResult {
  confidence: ConfidenceScore;
  strategy: string;
}

/**
 * Check for direct match between normalized area and city
 */
function checkDirectMatch(
  normalizedArea: string,
  normalizedCity: string
): MatchResult | null {
  if (normalizedArea === normalizedCity) {
    return { confidence: 1, strategy: 'direct-match' };
  }
  return null;
}

/**
 * Check if city is in the area's mapping
 */
function checkAreaMapping(
  areaName: AreaName,
  normalizedCity: string
): MatchResult | null {
  const citiesInArea = getCitiesInArea(areaName);

  if (
    citiesInArea.some(
      (city) => normalizeCityName(city).toLowerCase() === normalizedCity
    )
  ) {
    return { confidence: 0.9, strategy: 'area-mapping' };
  }

  return null;
}

/**
 * Check if area contains city or vice versa
 */
function checkContainment(
  normalizedArea: string,
  normalizedCity: string
): MatchResult | null {
  if (
    normalizedArea.includes(normalizedCity) ||
    normalizedCity.includes(normalizedArea)
  ) {
    return { confidence: 0.8, strategy: 'containment' };
  }

  return null;
}

/**
 * Check for common words between area and city
 */
function checkCommonWords(
  areaWords: string[],
  cityWords: string[]
): MatchResult | null {
  const commonWords = areaWords.filter((word) => cityWords.includes(word));

  if (commonWords.length > 0) {
    const score =
      0.5 +
      (0.2 * commonWords.length) / Math.max(areaWords.length, cityWords.length);
    return { confidence: score, strategy: 'common-words' };
  }

  return null;
}

/**
 * Check for NCR area and city match
 */
function checkNCRMatch(
  normalizedArea: string,
  normalizedCity: string
): MatchResult | null {
  const ncrAreas = ['ncr', 'metro manila'];

  if (ncrAreas.includes(normalizedArea)) {
    const ncrCity = AREAS[0].cities.some(
      (city) => normalizeCityName(city).toLowerCase() === normalizedCity
    );

    if (ncrCity) {
      return { confidence: 0.7, strategy: 'ncr-match' };
    }
  }

  return null;
}

/**
 * Calculate geographic match confidence between area and city
 * @param areaName Area name (from price data)
 * @param cityName City name (from station data)
 * @returns Confidence score (0-1)
 */
export function calculateAreaCityMatchConfidence(
  areaName: AreaName,
  cityName: CityName
): ConfidenceScore {
  if (!areaName || !cityName) return 0;

  // Normalize inputs
  const normalizedArea = areaName.trim().toLowerCase();
  const normalizedCity = normalizeCityName(cityName).toLowerCase();

  // Run all matching strategies
  const strategies = [
    checkDirectMatch(normalizedArea, normalizedCity),
    checkAreaMapping(areaName, normalizedCity),
    checkContainment(normalizedArea, normalizedCity),
    checkCommonWords(normalizedArea.split(/\s+/), normalizedCity.split(/\s+/)),
    checkNCRMatch(normalizedArea, normalizedCity),
  ];

  // Find best matching strategy
  const bestMatch = strategies
    .filter((result) => result !== null)
    .sort((a, b) => b!.confidence - a!.confidence)[0];

  // Return best confidence or default low confidence
  return bestMatch ? bestMatch.confidence : 0.1;
}
