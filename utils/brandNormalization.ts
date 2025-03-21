// utils/brandNormalization.ts

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

// Precompute alias map and sorted keys
const aliasToStandard: Record<string, string> = {};
const standardBrands = new Set<string>();

for (const [standard, aliases] of Object.entries(BRAND_ALIASES)) {
  const lowerStandard = standard.toLowerCase();
  aliasToStandard[lowerStandard] = standard;
  standardBrands.add(lowerStandard);
  for (const alias of aliases) {
    const lowerAlias = alias.toLowerCase();
    aliasToStandard[lowerAlias] = standard;
  }
}

const sortedKeys = Object.keys(aliasToStandard).sort(
  (a, b) => b.length - a.length
);

/**
 * Normalize brand name to standard form
 * @param brandName Input brand name
 * @returns Standardized brand name
 */
export function normalizeBrandName(brandName: string): string {
  if (!brandName) return '';
  const input = brandName.trim().toLowerCase();

  if (aliasToStandard[input]) return aliasToStandard[input];

  for (const key of sortedKeys) {
    if (new RegExp(`\\b${key}\\b`, 'i').test(input)) {
      return aliasToStandard[key];
    }
  }

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

  const norm1 = normalizeBrandName(brand1);
  const norm2 = normalizeBrandName(brand2);

  if (norm1 === norm2) return 1;

  const lowerNorm1 = norm1.toLowerCase();
  const lowerNorm2 = norm2.toLowerCase();

  if (standardBrands.has(lowerNorm1) && standardBrands.has(lowerNorm2))
    return 0;

  const words1 = new Set(lowerNorm1.split(/\s+/));
  const words2 = new Set(lowerNorm2.split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}
