// services/PriceReportingService.ts
import { supabase } from '@/utils/supabase';
import { BaseService } from './BaseService';

// Duration for which a price report is considered valid (24 hours)
const PRICE_REPORT_VALIDITY_HOURS = 24;

export interface PriceReport {
  id: string;
  station_id: string;
  fuel_type: string;
  price: number;
  user_id: string;
  reported_at: string;
  expires_at: string;
  upvotes: number;
  downvotes: number;
}

export interface VerificationStats {
  confirmedCount: number;
  disputedCount: number;
  lastUpdated: string;
  expiresAt: string;
}

export interface DoeData {
  minPrice: number;
  maxPrice: number;
  commonPrice: number;
}

export interface StationPrice {
  fuelType: string;
  communityPrice: number;
  reportId: string;
  doeData: DoeData | null;
  verificationData: VerificationStats;
}

export interface IPriceReportingService {
  submitPriceReport(
    station_id: string,
    fuel_type: string,
    price: number,
    user_id: string
  ): Promise<PriceReport>;
  voteOnPriceReport(
    report_id: string,
    is_upvote: boolean,
    user_id: string
  ): Promise<PriceReport>;
  getVerifiedPrice(
    station_id: string,
    fuel_type: string
  ): Promise<PriceReport | null>;
  getVerificationStats(report_id: string): Promise<VerificationStats>;
  getStationPrices(station_id: string): Promise<StationPrice[]>;
}

/**
 * Service for managing community-reported fuel prices
 * Follows Single Responsibility Principle - only handles price reporting
 */
export class PriceReportingService
  extends BaseService<PriceReport>
  implements IPriceReportingService
{
  constructor() {
    super('user_price_reports');
  }

  /**
   * Submit a new price report for a station
   */
  async submitPriceReport(
    station_id: string,
    fuel_type: string,
    price: number,
    user_id: string
  ): Promise<PriceReport> {
    try {
      const newReport = this.createReportObject(
        station_id,
        fuel_type,
        price,
        user_id
      );
      const result = await this.saveNewReport(newReport);
      return result;
    } catch (error) {
      this.handleServiceError(error, 'submitting price report');
    }
  }

  /**
   * Update a user's vote on a price report
   */
  async voteOnPriceReport(
    report_id: string,
    is_upvote: boolean,
    user_id: string
  ): Promise<PriceReport> {
    try {
      // Get current report and existing vote in parallel
      const [report, existingVote] = await Promise.all([
        this.getReportById(report_id),
        this.getUserVote(report_id, user_id),
      ]);

      // Calculate vote changes
      const voteDeltas = this.calculateVoteChanges(existingVote, is_upvote);

      // Update or create vote record
      await this.saveUserVote(report_id, user_id, is_upvote, existingVote);

      // Update report vote counts
      return await this.updateReportVotes(
        report_id,
        report.upvotes + voteDeltas.upvoteDelta,
        report.downvotes + voteDeltas.downvoteDelta
      );
    } catch (error) {
      this.handleServiceError(error, 'voting on price report');
    }
  }

  /**
   * Get the most reliable community price for a station and fuel type
   */
  async getVerifiedPrice(
    station_id: string,
    fuel_type: string
  ): Promise<PriceReport | null> {
    try {
      // Get non-expired reports
      const reports = await this.getNonExpiredReports(station_id, fuel_type);

      if (this.isEmpty(reports)) {
        return null;
      }

      // Score and sort reports
      const scoredReports = this.scoreReportsByConfidence(reports);

      // Return highest confidence report
      return scoredReports[0];
    } catch (error) {
      this.handleServiceError(error, 'getting verified price');
    }
  }

  /**
   * Get verification statistics for a price report
   */
  async getVerificationStats(report_id: string): Promise<VerificationStats> {
    try {
      const reportData = await this.fetchReportBasicStats(report_id);
      const lastUpdatedText = this.formatTimeSince(reportData.reported_at);

      return {
        confirmedCount: reportData.upvotes,
        disputedCount: reportData.downvotes,
        lastUpdated: lastUpdatedText,
        expiresAt: reportData.expires_at,
      };
    } catch (error) {
      this.handleServiceError(error, 'getting verification stats');
    }
  }

  /**
   * Get all prices for a station with verification data
   */
  async getStationPrices(station_id: string): Promise<StationPrice[]> {
    try {
      // Get fuel types with active reports for this station
      const fuelTypes = await this.getActiveFuelTypes(station_id);

      if (this.isEmpty(fuelTypes)) {
        return [];
      }

      // Get DOE data for comparison
      const doeByFuelType = await this.getDoeDataByFuelType(station_id);

      // Process each fuel type
      const uniqueFuelTypes = this.extractUniqueFuelTypes(fuelTypes);
      return await this.buildPriceResults(
        station_id,
        uniqueFuelTypes,
        doeByFuelType
      );
    } catch (error) {
      this.handleServiceError(error, 'getting station prices');
    }
  }

  /**
   * Get all active price reports with good verification stats
   */
  async getActivePricesWithStats(): Promise<any[]> {
    try {
      const data = await this.fetchCombinedPricesData();
      return data || [];
    } catch (error) {
      this.handleServiceError(error, 'getting active prices with stats');
    }
  }

  // ----- Private Helper Methods -----

  /**
   * Create a new report object with expiration
   * @private
   */
  private createReportObject(
    station_id: string,
    fuel_type: string,
    price: number,
    user_id: string
  ): any {
    // Calculate expiration time
    const expires_at = new Date();
    expires_at.setHours(expires_at.getHours() + PRICE_REPORT_VALIDITY_HOURS);

    return {
      station_id,
      fuel_type,
      price,
      user_id,
      reported_at: new Date().toISOString(),
      expires_at: expires_at.toISOString(),
      upvotes: 1, // Start with the reporter's implicit upvote
      downvotes: 0,
    };
  }

  /**
   * Save a new price report to the database
   * @private
   */
  private async saveNewReport(reportObject: any): Promise<PriceReport> {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(reportObject)
      .select();

    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error('No data returned after insert');
    }

    return data[0] as PriceReport;
  }

  /**
   * Fetch a price report by ID
   * @private
   */
  private async getReportById(report_id: string): Promise<PriceReport> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', report_id)
      .single();

    if (error || !data) {
      throw new Error('Report not found');
    }

    return data as PriceReport;
  }

  /**
   * Check if user has already voted on a report
   * @private
   */
  private async getUserVote(report_id: string, user_id: string): Promise<any> {
    const { data } = await supabase
      .from('user_price_votes')
      .select('*')
      .eq('report_id', report_id)
      .eq('user_id', user_id)
      .single();

    return data; // Will be null if no vote exists
  }

  /**
   * Calculate vote delta values based on existing vote and new vote
   * @private
   */
  private calculateVoteChanges(
    existingVote: any,
    is_upvote: boolean
  ): { upvoteDelta: number; downvoteDelta: number } {
    // If no existing vote, simple case
    if (!existingVote) {
      return {
        upvoteDelta: is_upvote ? 1 : 0,
        downvoteDelta: is_upvote ? 0 : 1,
      };
    }

    // If vote exists but is changing
    if (existingVote.is_upvote !== is_upvote) {
      return {
        upvoteDelta: is_upvote ? 1 : -1,
        downvoteDelta: is_upvote ? -1 : 1,
      };
    }

    // Vote exists but unchanged (user clicked same button again)
    return { upvoteDelta: 0, downvoteDelta: 0 };
  }

  /**
   * Save user's vote to database
   * @private
   */
  private async saveUserVote(
    report_id: string,
    user_id: string,
    is_upvote: boolean,
    existingVote: any
  ): Promise<void> {
    if (existingVote) {
      // Only update if vote is changing
      if (existingVote.is_upvote !== is_upvote) {
        await supabase
          .from('user_price_votes')
          .update({ is_upvote })
          .eq('id', existingVote.id);
      }
    } else {
      // Create new vote
      await supabase.from('user_price_votes').insert({
        report_id,
        user_id,
        is_upvote,
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Update vote counts on a price report
   * @private
   */
  private async updateReportVotes(
    report_id: string,
    upvotes: number,
    downvotes: number
  ): Promise<PriceReport> {
    const { data, error } = await supabase
      .from(this.tableName)
      .update({ upvotes, downvotes })
      .eq('id', report_id)
      .select();

    // Check error first
    if (error) {
      throw new Error(`Failed to update report votes: ${error.message}`);
    }

    // Then validate data
    if (!this.isValidResponseData(data)) {
      throw new Error('No data returned after updating report votes');
    }

    return data[0] as PriceReport;
  }

  /**
   * Check if response data is valid and contains results
   * @private
   */
  private isValidResponseData(data: any[] | null): boolean {
    return !!data && data.length > 0;
  }

  /**
   * Get non-expired price reports for a station and fuel type
   * @private
   */
  private async getNonExpiredReports(
    station_id: string,
    fuel_type: string
  ): Promise<PriceReport[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('station_id', station_id)
      .eq('fuel_type', fuel_type)
      .gte('expires_at', new Date().toISOString())
      .order('reported_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Score reports by confidence based on votes and recency
   * @private
   */
  private scoreReportsByConfidence(
    reports: PriceReport[]
  ): (PriceReport & { confidenceScore: number })[] {
    type ScoredReport = PriceReport & { confidenceScore: number };

    // Calculate confidence scores
    const scoredReports: ScoredReport[] = reports.map((report) => {
      const confidenceScore = this.calculateReportConfidence(report);
      return { ...report, confidenceScore };
    });

    // Sort by confidence score, highest first
    return scoredReports.sort((a, b) => b.confidenceScore - a.confidenceScore);
  }

  /**
   * Calculate confidence score for a single report
   * @private
   */
  private calculateReportConfidence(report: PriceReport): number {
    // Calculate vote ratio (0-1)
    const totalVotes = report.upvotes + report.downvotes;
    const voteRatio = this.calculateVoteRatio(report.upvotes, totalVotes);

    // Calculate recency factor (0-1)
    const recencyFactor = this.calculateRecencyFactor(report.reported_at);

    // Weighted average (70% votes, 30% recency)
    return voteRatio * 0.7 + recencyFactor * 0.3;
  }

  /**
   * Calculate vote ratio with fallback for zero votes
   * @private
   */
  private calculateVoteRatio(upvotes: number, totalVotes: number): number {
    return totalVotes > 0 ? upvotes / totalVotes : 0;
  }

  /**
   * Calculate recency factor from reported date
   * @private
   */
  private calculateRecencyFactor(reportedAt: string): number {
    const ageInHours =
      (new Date().getTime() - new Date(reportedAt).getTime()) /
      (1000 * 60 * 60);

    return Math.max(0, 1 - ageInHours / PRICE_REPORT_VALIDITY_HOURS);
  }

  /**
   * Fetch basic statistics for a report
   * @private
   */
  private async fetchReportBasicStats(report_id: string): Promise<any> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('upvotes, downvotes, reported_at, expires_at')
      .eq('id', report_id)
      .single();

    if (error || !data) {
      throw new Error('Report not found');
    }

    return data;
  }

  /**
   * Format a relative time string (e.g., "5 minutes ago")
   * @private
   */
  private formatTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    // Less than an hour
    if (diffMinutes < 60) {
      return `${diffMinutes} minutes ago`;
    }

    // Less than a day
    if (diffMinutes < 24 * 60) {
      const hours = Math.floor(diffMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }

    // Days
    const days = Math.floor(diffMinutes / (24 * 60));
    return `${days} day${days > 1 ? 's' : ''} ago`;
  }

  /**
   * Get active fuel types for a station
   * @private
   */
  private async getActiveFuelTypes(station_id: string): Promise<string[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('fuel_type')
      .eq('station_id', station_id)
      .gte('expires_at', new Date().toISOString());

    if (error) throw error;
    return data?.map((item) => item.fuel_type) || [];
  }

  /**
   * Get DOE fuel price data for a station
   * @private
   */
  private async getDoeDataByFuelType(
    station_id: string
  ): Promise<Record<string, DoeData>> {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .eq('station_id', station_id);

    if (error) throw error;

    const doeByFuelType: Record<string, DoeData> = {};

    if (data) {
      data.forEach((item) => {
        doeByFuelType[item.fuel_type] = {
          minPrice: item.min_price,
          maxPrice: item.max_price,
          commonPrice: item.common_price,
        };
      });
    }

    return doeByFuelType;
  }

  /**
   * Extract unique fuel types from query result
   * @private
   */
  private extractUniqueFuelTypes(fuelTypes: string[]): string[] {
    return [...new Set(fuelTypes)];
  }

  /**
   * Build price results for each fuel type
   * @private
   */
  private async buildPriceResults(
    station_id: string,
    fuelTypes: string[],
    doeByFuelType: Record<string, DoeData>
  ): Promise<StationPrice[]> {
    const results: StationPrice[] = [];

    for (const fuelType of fuelTypes) {
      const verifiedPrice = await this.getVerifiedPrice(station_id, fuelType);

      if (verifiedPrice) {
        const verificationStats = await this.getVerificationStats(
          verifiedPrice.id
        );

        results.push({
          fuelType,
          communityPrice: verifiedPrice.price,
          reportId: verifiedPrice.id,
          doeData: doeByFuelType[fuelType] || null,
          verificationData: verificationStats,
        });
      }
    }

    return results;
  }

  /**
   * Fetch data from combined prices view
   * @private
   */
  private async fetchCombinedPricesData(): Promise<any[]> {
    const { data, error } = await supabase
      .from('combined_prices')
      .select('*')
      .order('confidence', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Check if array is empty
   * @private
   */
  private isEmpty<T>(array: T[] | null | undefined): boolean {
    return !array || array.length === 0;
  }

  /**
   * Centralized error handler for service methods
   * @private
   */
  private handleServiceError(error: any, context: string): never {
    console.error(`Error ${context}:`, error);
    throw error instanceof Error ? error : new Error(`Failed to ${context}`);
  }
}

// Export a singleton instance
export const priceReportingService = new PriceReportingService();
