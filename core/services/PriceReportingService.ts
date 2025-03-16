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
      // Calculate expiration time (24 hours from now)
      const expires_at = new Date();
      expires_at.setHours(expires_at.getHours() + PRICE_REPORT_VALIDITY_HOURS);

      const { data, error } = await supabase
        .from(this.tableName)
        .insert({
          station_id,
          fuel_type,
          price,
          user_id,
          reported_at: new Date().toISOString(),
          expires_at: expires_at.toISOString(),
          upvotes: 1, // Start with the reporter's implicit upvote
          downvotes: 0,
        })
        .select();

      if (error) throw error;
      if (!data || data.length === 0)
        throw new Error('No data returned after insert');

      return data[0] as PriceReport;
    } catch (error) {
      console.error('Error submitting price report:', error);
      throw error;
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
      // Check if user has already voted
      const { data: existingVote } = await supabase
        .from('user_price_votes')
        .select('*')
        .eq('report_id', report_id)
        .eq('user_id', user_id)
        .single();

      // Get current report state
      const { data: report } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', report_id)
        .single();

      if (!report) {
        throw new Error('Report not found');
      }

      // Calculate vote changes
      let upvoteDelta = 0;
      let downvoteDelta = 0;

      if (existingVote) {
        // Changing vote?
        if (existingVote.is_upvote !== is_upvote) {
          upvoteDelta = is_upvote ? 1 : -1;
          downvoteDelta = is_upvote ? -1 : 1;

          // Update vote record
          await supabase
            .from('user_price_votes')
            .update({ is_upvote })
            .eq('id', existingVote.id);
        }
      } else {
        // New vote
        upvoteDelta = is_upvote ? 1 : 0;
        downvoteDelta = is_upvote ? 0 : 1;

        // Create vote record
        await supabase.from('user_price_votes').insert({
          report_id,
          user_id,
          is_upvote,
          created_at: new Date().toISOString(),
        });
      }

      // Update report vote counts
      const { data: updatedReport, error } = await supabase
        .from(this.tableName)
        .update({
          upvotes: report.upvotes + upvoteDelta,
          downvotes: report.downvotes + downvoteDelta,
        })
        .eq('id', report_id)
        .select();

      if (error) throw error;
      if (!updatedReport || updatedReport.length === 0)
        throw new Error('No data returned after update');

      return updatedReport[0] as PriceReport;
    } catch (error) {
      console.error('Error voting on price report:', error);
      throw error;
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
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('station_id', station_id)
        .eq('fuel_type', fuel_type)
        .gte('expires_at', new Date().toISOString())
        .order('reported_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return null;

      // Score reports by votes and recency
      type ScoredReport = PriceReport & { confidenceScore: number };

      const scoredReports: ScoredReport[] = data.map((report) => {
        const totalVotes = report.upvotes + report.downvotes;
        const voteRatio = totalVotes > 0 ? report.upvotes / totalVotes : 0;

        // Recency factor
        const ageInHours =
          (new Date().getTime() - new Date(report.reported_at).getTime()) /
          (1000 * 60 * 60);
        const recencyFactor = Math.max(
          0,
          1 - ageInHours / PRICE_REPORT_VALIDITY_HOURS
        );

        // Combined score
        const confidenceScore = voteRatio * 0.7 + recencyFactor * 0.3;

        return {
          ...report,
          confidenceScore,
        };
      });

      // Return highest confidence report
      scoredReports.sort((a, b) => b.confidenceScore - a.confidenceScore);
      return scoredReports[0];
    } catch (error) {
      console.error('Error getting verified price:', error);
      throw error;
    }
  }

  /**
   * Get verification statistics for a price report
   */
  async getVerificationStats(report_id: string): Promise<VerificationStats> {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('upvotes, downvotes, reported_at, expires_at')
        .eq('id', report_id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Report not found');

      // Format last updated time
      const lastUpdated = new Date(data.reported_at);
      const now = new Date();
      const diffMinutes = Math.floor(
        (now.getTime() - lastUpdated.getTime()) / (1000 * 60)
      );

      let lastUpdatedText: string;
      if (diffMinutes < 60) {
        lastUpdatedText = `${diffMinutes} minutes ago`;
      } else if (diffMinutes < 24 * 60) {
        const hours = Math.floor(diffMinutes / 60);
        lastUpdatedText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else {
        const days = Math.floor(diffMinutes / (24 * 60));
        lastUpdatedText = `${days} day${days > 1 ? 's' : ''} ago`;
      }

      return {
        confirmedCount: data.upvotes,
        disputedCount: data.downvotes,
        lastUpdated: lastUpdatedText,
        expiresAt: data.expires_at,
      };
    } catch (error) {
      console.error('Error getting verification stats:', error);
      throw error;
    }
  }

  /**
   * Get all prices for a station with verification data
   */
  async getStationPrices(station_id: string): Promise<StationPrice[]> {
    try {
      // Get fuel types with active reports for this station
      const { data: fuelTypes, error: typesError } = await supabase
        .from(this.tableName)
        .select('fuel_type')
        .eq('station_id', station_id)
        .gte('expires_at', new Date().toISOString());

      if (typesError) throw typesError;
      if (!fuelTypes || fuelTypes.length === 0) return [];

      // Get DOE data for comparison
      const { data: doeData, error: doeError } = await supabase
        .from('fuel_prices')
        .select('*')
        .eq('station_id', station_id);

      if (doeError) throw doeError;

      // Create DOE data lookup by fuel type
      const doeByFuelType: Record<string, DoeData> = {};
      if (doeData) {
        doeData.forEach((item) => {
          doeByFuelType[item.fuel_type] = {
            minPrice: item.min_price,
            maxPrice: item.max_price,
            commonPrice: item.common_price,
          };
        });
      }

      // Process each fuel type
      const uniqueFuelTypes = [...new Set(fuelTypes.map((ft) => ft.fuel_type))];
      const results: StationPrice[] = [];

      for (const fuelType of uniqueFuelTypes) {
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
    } catch (error) {
      console.error('Error getting station prices:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const priceReportingService = new PriceReportingService();
