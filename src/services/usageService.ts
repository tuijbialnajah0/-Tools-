import { supabase } from '../lib/supabase';

export interface ToolUsage {
  tool_id: string;
  usage_count: number;
}

export const usageService = {
  /**
   * Increments the usage count for a specific tool.
   * This is a non-blocking call to ensure UX isn't affected by Supabase latency.
   */
  async incrementUsage(toolId: string) {
    try {
      // We use an RPC call to increment the counter atomically
      // This requires the 'increment_tool_usage' function to be defined in Supabase
      const { error } = await supabase.rpc('increment_tool_usage', { target_tool_id: toolId });
      
      if (error) {
        // If RPC fails (e.g. not defined yet), we fallback to a simple upsert
        // though RPC is preferred for atomic increments
        console.warn('RPC failed, falling back to upsert:', error.message);
        
        // Fetch current count
        const { data } = await supabase
          .from('tool_usage')
          .select('usage_count')
          .eq('tool_id', toolId)
          .single();
        
        const newCount = (data?.usage_count || 0) + 1;
        
        await supabase
          .from('tool_usage')
          .upsert({ tool_id: toolId, usage_count: newCount }, { onConflict: 'tool_id' });
      }
    } catch (err) {
      // Silently fail to not affect user experience
      console.error('Error incrementing usage:', err);
    }
  },

  /**
   * Fetches all tool usage counts.
   */
  async getAllUsage(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from('tool_usage')
        .select('tool_id, usage_count');
      
      if (error) throw error;

      const usageMap: Record<string, number> = {};
      data?.forEach((item: any) => {
        usageMap[item.tool_id] = item.usage_count;
      });
      return usageMap;
    } catch (err) {
      console.error('Error fetching usage:', err);
      return {};
    }
  }
};
