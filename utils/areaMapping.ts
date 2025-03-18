// utils/areaMapping.ts
// Utilities for mapping and matching geographic areas

/**
 * Hierarchical mapping of DOE areas to cities
 * This helps match DOE price data (which often uses broader areas) to specific cities
 * For now, we're focusing only on NCR/Metro Manila
 */
export const AREA_MAPPING: Record<string, string[]> = {
  NCR: [
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
  'Metro Manila': [
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
};

/**
 * City aliases to handle variations in city names
 */
export const CITY_ALIASES: Record<string, string[]> = {
  'Manila City': ['Manila', 'City of Manila'],
  'Quezon City': ['QC'],
  'Makati City': ['Makati', 'City of Makati'],
  'Taguig City': ['Taguig', 'BGC', 'Bonifacio Global City'],
  'Pasig City': ['Pasig'],
  'Pasay City': ['Pasay'],
  'Caloocan City': ['Caloocan', 'North Caloocan', 'South Caloocan'],
  'Parañaque City': ['Parañaque', 'Paranaque City', 'Paranaque'],
};

/**
 * Get parent area for a city
 * @param city City name
 * @returns Parent area name (e.g., NCR)
 */
export function getParentArea(city: string): string | null {
  if (!city) return null;

  const normalizedCity = normalizeCityName(city);

  for (const [area, cities] of Object.entries(AREA_MAPPING)) {
    if (cities.some((c) => normalizeCityName(c) === normalizedCity)) {
      return area;
    }
  }

  return null;
}

/**
 * Get all cities in an area
 * @param area Area name (e.g., NCR)
 * @returns Array of city names in the area
 */
export function getCitiesInArea(area: string): string[] {
  if (!area) return [];

  // Try direct match
  if (AREA_MAPPING[area]) {
    return AREA_MAPPING[area];
  }

  // Try case-insensitive match
  const normalizedArea = area.toLowerCase().trim();
  for (const [mappedArea, cities] of Object.entries(AREA_MAPPING)) {
    if (mappedArea.toLowerCase() === normalizedArea) {
      return cities;
    }
  }

  return [];
}

/**
 * Normalize city name to handle variations
 * @param cityName City name to normalize
 * @returns Standardized city name
 */
export function normalizeCityName(cityName: string): string {
  if (!cityName) return '';

  const input = cityName.trim();

  // Check for direct matches in city aliases
  for (const [standard, aliases] of Object.entries(CITY_ALIASES)) {
    if (standard.toLowerCase() === input.toLowerCase()) {
      return standard;
    }

    if (aliases.some((alias) => alias.toLowerCase() === input.toLowerCase())) {
      return standard;
    }
  }

  // Check if input contains city name
  for (const [standard, aliases] of Object.entries(CITY_ALIASES)) {
    if (input.toLowerCase().includes(standard.toLowerCase())) {
      return standard;
    }

    if (
      aliases.some((alias) => input.toLowerCase().includes(alias.toLowerCase()))
    ) {
      return standard;
    }
  }

  // For any city that ends with " City", make sure it's properly formatted
  if (input.toLowerCase().endsWith('city') && !input.endsWith(' City')) {
    const baseName = input
      .substring(0, input.toLowerCase().lastIndexOf('city'))
      .trim();
    return `${baseName} City`;
  }

  return input;
}

/**
 * Calculate geographic match confidence between area and city
 * @param area Area name (from price data)
 * @param city City name (from station data)
 * @returns Confidence score (0-1)
 */
export function calculateAreaCityMatchConfidence(
  area: string,
  city: string
): number {
  if (!area || !city) return 0;

  const normalizedArea = area.trim().toLowerCase();
  const normalizedCity = normalizeCityName(city).toLowerCase();

  // Direct match - city name equals area name
  if (normalizedArea === normalizedCity) return 1;

  // City is in area's mapping
  const citiesInArea = getCitiesInArea(area);
  if (
    citiesInArea.some(
      (c) => normalizeCityName(c).toLowerCase() === normalizedCity
    )
  ) {
    return 0.9;
  }

  // Area contains city name or vice versa
  if (
    normalizedArea.includes(normalizedCity) ||
    normalizedCity.includes(normalizedArea)
  ) {
    return 0.8;
  }

  // Check word matches
  const areaWords = normalizedArea.split(/\s+/);
  const cityWords = normalizedCity.split(/\s+/);

  const commonWords = areaWords.filter((word) => cityWords.includes(word));
  if (commonWords.length > 0) {
    return (
      0.5 +
      (0.2 * commonWords.length) / Math.max(areaWords.length, cityWords.length)
    );
  }

  // For NCR cities, return a moderate confidence by default
  if (
    (normalizedArea === 'ncr' || normalizedArea === 'metro manila') &&
    Object.values(AREA_MAPPING['NCR']).some(
      (c) => normalizeCityName(c).toLowerCase() === normalizedCity
    )
  ) {
    return 0.7;
  }

  return 0.1; // Low confidence
}
