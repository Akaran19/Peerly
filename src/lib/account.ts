import { supabase } from '@/integrations/supabase/client';

export type Tier = 'free' | 'pro' | 'lab';

export async function getTier(): Promise<Tier> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 'free';

  const { data, error } = await supabase
    .from('profiles')
    .select('tier')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching user tier:', error);
    return 'free';
  }

  return (data as any)?.tier ?? 'free';
}

export async function recordExportEvent() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase
    .from('usage_events' as any)
    .insert({
      user_id: user.id,
      kind: 'export'
    });

  if (error) {
    console.error('Error recording export event:', error);
  }
}

export async function getMonthlyExportCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  const since = new Date();
  since.setMonth(since.getMonth() - 1);

  const { count, error } = await supabase
    .from('usage_events' as any)
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('kind', 'export')
    .gte('created_at', since.toISOString());

  if (error) {
    console.error('Error fetching monthly export count:', error);
    return 0;
  }

  return count ?? 0;
}
