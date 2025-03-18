// utils/brandNormalization.ts
// Utility for standardizing brand names and calculating brand similarities

/**
 * Brand aliases for common gas station brands
 * Key = standardized name, Values = alternative spellings/variations
 */
export const BRAND_ALIASES: Record<string, string[]> = {
  Petron: ['Petron Corp', 'Petron Corporation', 'Petron Gas'],
  Shell: ['Shell Pilipinas', 'Shell Philippines', 'Pilipinas Shell'],
  Caltex: ['Chevron', 'Caltex Philippines', 'Chevron Philippines'],
  Phoenix: ['Phoenix Petroleum', 'Phoenix Fuels'],
  Seaoil: ['Seaoil Philippines', 'Sea Oil'],
  Total: ['TotalEnergies', 'Total Philippines'],
  PTT: ['PTT Philippines', 'PTT Oil'],
  Unioil: ['Unioil Petroleum', 'UNI Oil'],
  Jetti: ['Jetti Petroleum', 'Jetti Gas'],
  'Flying V': ['FlyingV'],
  Petrotrade: ['Petro Trade'],
  CleanFuel: ['Clean Fuel'],
  'Insular Oil': ['Insular'],
};

/**
 * Normalize brand name to standard form
 * @param brandName Input brand name
 * @returns Standardized brand name
 */
export function normalizeBrandName(brandName: string): string {
  if (!brandName) return '';

  const input = brandName.trim().toLowerCase();

  // Check direct match with standard names
  for (const [standard, aliases] of Object.entries(BRAND_ALIASES)) {
    if (standard.toLowerCase() === input) {
      return standard;
    }

    // Check if input matches any alias
    if (aliases.some((alias) => alias.toLowerCase() === input)) {
      return standard;
    }
  }

  // Check for partial matches (e.g., if input contains standard name or alias)
  for (const [standard, aliases] of Object.entries(BRAND_ALIASES)) {
    if (input.includes(standard.toLowerCase())) {
      return standard;
    }

    if (aliases.some((alias) => input.includes(alias.toLowerCase()))) {
      return standard;
    }

    // Check if standard or alias contains input (for short forms)
    if (
      input.length > 3 &&
      (standard.toLowerCase().includes(input) ||
        aliases.some((alias) => alias.toLowerCase().includes(input)))
    ) {
      return standard;
    }
  }

  // If no match found, return original with first letter capitalized
  return brandName.charAt(0).toUpperCase() + brandName.slice(1);
}

/**
 * Calculate similarity between two brand names (0-1)
 * @param brand1 First brand name
 * @param brand2 Second brand name
 * @returns Similarity score (0-1)
 */
export function calculateBrandSimilarity(
  brand1: string,
  brand2: string
): number {
  if (!brand1 || !brand2) return 0;

  const norm1 = brand1.toLowerCase().trim();
  const norm2 = brand2.toLowerCase().trim();

  // Exact match
  if (norm1 === norm2) return 1;

  // Check normalized versions
  const normalized1 = normalizeBrandName(brand1).toLowerCase();
  const normalized2 = normalizeBrandName(brand2).toLowerCase();

  if (normalized1 === normalized2) return 1;

  // Contains check
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.9;
  if (normalized1.includes(normalized2) || normalized2.includes(normalized1))
    return 0.8;

  // Word matching (check if any words match)
  const words1 = norm1.split(/\s+/);
  const words2 = norm2.split(/\s+/);

  const commonWords = words1.filter(
    (word) => word.length > 2 && words2.includes(word)
  );

  if (commonWords.length > 0) {
    return (
      0.5 + (0.3 * commonWords.length) / Math.max(words1.length, words2.length)
    );
  }

  // Letter similarity (basic implementation)
  let matchingChars = 0;
  const minLength = Math.min(norm1.length, norm2.length);

  for (let i = 0; i < minLength; i++) {
    if (norm1[i] === norm2[i]) matchingChars++;
  }

  if (matchingChars > 3) {
    return 0.3 + (0.2 * matchingChars) / minLength;
  }

  return 0.1; // Very low similarity
}
