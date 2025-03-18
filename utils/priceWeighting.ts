// utils/priceWeighting.ts
import { calculateBrandSimilarity } from './brandNormalization';
import { calculateAreaCityMatchConfidence } from './areaMapping';
import { FuelPrice } from '@/core/models/FuelPrice';
import { GasStation } from '@/core/models/GasStation';

/**
 * Calculate confidence score for a price report
 * @param upvotes Number of upvotes
 * @param downvotes Number of downvotes
 * @param reportedAt When the price was reported
 * @returns Confidence score (0-1)
 */
export function calculatePriceConfidence(
  upvotes: number,
  downvotes: number,
  reportedAt: string
): number {
  // Calculate vote ratio (with a minimum to avoid division by zero)
  const totalVotes = upvotes + downvotes;
  const voteRatio = totalVotes > 0 ? upvotes / totalVotes : 0.5;

  // Calculate recency (0-1 scale, 1 being newest)
  const ageInHours =
    (Date.now() - new Date(reportedAt).getTime()) / (1000 * 60 * 60);
  const maxAge = 168; // 1 week in hours
  const recencyScore = Math.max(0, 1 - ageInHours / maxAge);

  // Calculate vote volume weight (more votes = more reliable)
  const voteVolume = Math.min(1, totalVotes / 10); // Max out at 10 votes

  // Combined weight (adjust multipliers as needed)
  return voteRatio * 0.5 + recencyScore * 0.3 + voteVolume * 0.2;
}

/**
 * Determine if a community price should be considered reliable
 * @param confidence Confidence score (0-1)
 * @param voteDifferential Difference between upvotes and downvotes
 * @returns Boolean indicating if the price is reliable
 */
export function isPriceReliable(
  confidence: number,
  voteDifferential: number
): boolean {
  // Price is reliable if it has high confidence
  if (confidence >= 0.8) return true;

  // Price is reliable if it has medium confidence and positive votes
  if (confidence >= 0.5 && voteDifferential > 0) return true;

  // Price is not reliable if it has low confidence or negative votes
  return false;
}

/**
 * Calculate match confidence between price and station
 * @param price Fuel price data
 * @param station Gas station data
 * @returns Match confidence score (0-1)
 */
export function calculatePriceStationMatchConfidence(
  price: FuelPrice,
  station: GasStation
): number {
  // Calculate brand similarity
  const brandConfidence = calculateBrandSimilarity(price.brand, station.brand);

  // Calculate area/city match confidence
  const areaConfidence = calculateAreaCityMatchConfidence(
    price.area,
    station.city
  );

  // Weight the factors (brand match is more important than area)
  const weightedConfidence = brandConfidence * 0.7 + areaConfidence * 0.3;

  return weightedConfidence;
}

/**
 * Determine if a price-station match should be considered valid
 * @param confidence Match confidence score (0-1)
 * @returns Boolean indicating if the match is valid
 */
export function isPriceStationMatchValid(confidence: number): boolean {
  return confidence >= 0.5; // Threshold for valid matches
}

/**
 * Calculate overall confidence for a price-station combination
 * Combines price reliability with match confidence
 * @param priceConfidence Confidence in price accuracy
 * @param matchConfidence Confidence in price-station match
 * @returns Combined confidence score (0-1)
 */
export function calculateOverallConfidence(
  priceConfidence: number,
  matchConfidence: number
): number {
  // Weight the source confidence more than match confidence
  return priceConfidence * 0.6 + matchConfidence * 0.4;
}

/**
 * Get confidence level label based on confidence score
 * @param confidence Confidence score (0-1)
 * @returns Confidence level label
 */
export function getConfidenceLevel(
  confidence: number
): 'High' | 'Medium' | 'Low' {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

/**
 * Get confidence level color based on confidence score
 * @param confidence Confidence score (0-1)
 * @returns Color code for the confidence level
 */
export function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return '#4caf50'; // Green for high confidence
  if (confidence >= 0.5) return '#ff9800'; // Orange for medium confidence
  return '#f44336'; // Red for low confidence
}
