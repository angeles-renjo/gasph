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
      const { data, error } = await supabase.rpc('admin_start_new_cycle');

      if (error) {
        console.error('Error starting new price cycle:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('Error calling stored procedure:', error);
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
