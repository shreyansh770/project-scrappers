import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing Supabase env vars. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in dashboard/.env'
  );
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// ─── Scrapers ───

export async function fetchScrapers() {
  const { data, error } = await supabase
    .from('v_scraper_overview')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

export async function updateScraperStatus(id, status) {
  const { error } = await supabase
    .from('scrapers')
    .update({ status })
    .eq('id', id);
  if (error) throw error;
}

export async function createScraper({ name, display_name, website, schedule }) {
  const { data, error } = await supabase
    .from('scrapers')
    .insert({
      name,
      display_name,
      website,
      schedule,
      status: 'paused',
      file_path: `scrapers/${name}.py`,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Runs ───

export async function fetchRuns({ limit = 50, scraperId = null } = {}) {
  let query = supabase
    .from('v_run_history')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (scraperId) {
    query = query.eq('scraper_id', scraperId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ─── Results (sample data for a run) ───

export async function fetchRunResults(runId, limit = 20) {
  const { data, error } = await supabase
    .from('scraper_results')
    .select('id, data, scraped_at')
    .eq('run_id', runId)
    .order('scraped_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ─── Stats ───

export async function fetchStats() {
  const { data: scrapers } = await supabase
    .from('scrapers')
    .select('id, status');

  const { count: totalRuns } = await supabase
    .from('scraper_runs')
    .select('*', { count: 'exact', head: true });

  const { count: failedRuns } = await supabase
    .from('scraper_runs')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'failed')
    .gte('started_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  const { data: recentResults } = await supabase
    .from('scraper_runs')
    .select('records_count')
    .eq('status', 'success')
    .order('started_at', { ascending: false })
    .limit(20);

  const totalRecords = (recentResults || []).reduce((sum, r) => sum + (r.records_count || 0), 0);

  return {
    totalScrapers: scrapers?.length || 0,
    activeScrapers: scrapers?.filter((s) => s.status === 'active').length || 0,
    failedLast24h: failedRuns || 0,
    totalRecordsRecent: totalRecords,
  };
}
