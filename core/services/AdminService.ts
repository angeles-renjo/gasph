// core/services/AdminService.ts

import { supabase } from '@/utils/supabase';

/**
 * Service for admin-specific functions
 */
export class AdminService {
  /**
   * Manually start a new price reporting cycle
   */
  // In your AdminService.ts
  async startNewPriceCycle(): Promise<boolean> {
    try {
      console.log('Attempting direct implementation of price cycle reset...');

      // Step 1: Mark all current cycles as inactive
      const { error: updateError } = await supabase
        .from('price_reporting_cycles')
        .update({ is_active: false })
        .eq('is_active', true); // This already has a WHERE clause, good

      if (updateError) {
        console.error('Error deactivating current cycles:', updateError);
        throw updateError;
      }

      // Step 2: Create a new cycle
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);

      const { error: insertError } = await supabase
        .from('price_reporting_cycles')
        .insert({
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          is_active: true,
          doe_import_date: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating new cycle:', insertError);
        throw insertError;
      }

      // Step 3: Expire all community prices - ADD A WHERE CLAUSE HERE
      const { error: priceError } = await supabase
        .from('user_price_reports')
        .update({ expires_at: new Date(Date.now() - 60000).toISOString() })
        .gt('id', '0'); // This WHERE clause will match all rows (since all UUIDs are greater than '0')

      if (priceError) {
        console.error('Error expiring price reports:', priceError);
        throw priceError;
      }

      console.log('Direct implementation completed successfully');
      return true;
    } catch (error) {
      console.error('Error starting new price cycle:', error);
      return false;
    }
  }

  /**
   * Get active community prices for debugging
   */
  async getActiveCommunityPrices(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('user_price_reports')
        .select('*')
        .gt('expires_at', new Date().toISOString());

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting active community prices:', error);
      return [];
    }
  }
}

// Export a singleton instance
export const adminService = new AdminService();
