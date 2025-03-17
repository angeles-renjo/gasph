// utils/priceWeighting.ts

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
