import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});

export const getWorkers = async () => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .order('name');

  if (error) return [];
  return data || [];
};

export const getJobs = async () => {
  const { data: jobs, error } = await supabase
    .from('jobs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !jobs) return [];

  const { data: secondaryWorkers } = await supabase
    .from('job_secondary_workers')
    .select('*');

  return jobs.map(job => ({
    ...job,
    start_date: job.start_date || null,
    end_date: job.end_date || null,
    status: job.status || 'Awaiting Order',
    tile_color: job.tile_color || '#3b82f6',
    secondary_worker_ids: (secondaryWorkers || [])
      .filter(sw => sw.job_id === job.id)
      .map(sw => sw.worker_id)
  }));
};

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  const { secondary_worker_ids, ...jobData } = job as any;

  const { data: newJob, error } = await supabase
    .from('jobs')
    .insert([jobData])
    .select()
    .single();

  if (error) throw error;

  if (secondary_worker_ids?.length) {
    await supabase.from('job_secondary_workers').insert(
      secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }))
    );
  }

  return { ...newJob, secondary_worker_ids: secondary_worker_ids || [] };
};

export const updateJob = async (id: string, updates: Partial<Database['public']['Tables']['jobs']['Update']>) => {
  const { secondary_worker_ids, ...jobUpdates } = updates as any;

  const { data: updatedJob, error } = await supabase
    .from('jobs')
    .update(jobUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  if (secondary_worker_ids !== undefined) {
    await supabase.from('job_secondary_workers').delete().eq('job_id', id);
    if (secondary_worker_ids?.length) {
      await supabase.from('job_secondary_workers').insert(
        secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }))
      );
    }
  }

  const { data: currentSecondaryWorkers } = await supabase
    .from('job_secondary_workers')
    .select('worker_id')
    .eq('job_id', id);

  return {
    ...updatedJob,
    secondary_worker_ids: (currentSecondaryWorkers || []).map(sw => sw.worker_id)
  };
};

export const deleteJob = async (id: string) => {
  const { error } = await supabase.from('jobs').delete().eq('id', id);
  if (error) throw error;
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('workers')
    .insert([{ ...worker, role: 'admin' }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteWorker = async (id: string) => {
  await supabase.from('jobs').update({ worker_id: null }).eq('worker_id', id);
  await supabase.from('job_secondary_workers').delete().eq('worker_id', id);
  const { error } = await supabase.from('workers').delete().eq('id', id);
  if (error) throw error;
};

export const getCurrentWorker = async (email: string) => {
  const { data, error } = await supabase
    .from('workers')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (error) return null;
  if (!data) return await createWorkerProfile(email);
  return data;
};

export const createWorkerProfile = async (email: string, name?: string) => {
  const { data, error } = await supabase
    .from('workers')
    .upsert(
      {
        name: name || email.split('@')[0],
        email,
        role: 'admin'
      },
      { onConflict: 'email' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUserId)
    .single();

  if (existingUser) return existingUser;

  const { data, error } = await supabase
    .from('users')
    .insert([{
      id: authUserId,
      name: name || email.split('@')[0],
      email,
      role: 'admin'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};