import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase credentials');
  }
} catch (error) {
  console.error('Error loading Supabase credentials:', error);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

export const isSupabaseInitialized = () => {
  return Boolean(supabaseUrl && supabaseAnonKey);
};

// Add function to check auth status
export const checkAuthStatus = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) {
    console.error('Auth check failed:', error);
    return null;
  }
  return session;
};

export const getWorkers = async () => {
  try {
    const session = await checkAuthStatus();
    if (!session) {
      console.error('getWorkers: No active session');
      return [];
    }

    console.log('getWorkers: Fetching with auth:', {
      user_id: session.user.id,
      user_email: session.user.email
    });

    // Direct debug query to verify database access
    const { count: workerCount, error: countError } = await supabase
      .from('workers')
      .select('*', { count: 'exact', head: true });
      
    console.log('getWorkers: Database check -', {
      total_count: workerCount,
      error: countError ? countError.message : null
    });

    // Try using the admin function first (bypasses RLS)
    console.log('getWorkers: Attempting to use admin function');
    const { data: adminData, error: adminError } = await supabase
      .rpc('admin_get_all_workers');

    if (!adminError && adminData && adminData.length > 0) {
      console.log('getWorkers: Success using admin function', {
        count: adminData.length,
        first_worker: adminData[0]?.name || 'none'
      });
      return adminData;
    } else if (adminError) {
      console.log('getWorkers: Admin function failed:', adminError.message);
    }

    // Fall back to regular query
    console.log('getWorkers: Falling back to regular query');
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .order('name');

    if (error) {
      console.error('getWorkers: Query failed:', error);
      throw error;
    }

    console.log('getWorkers: Success', {
      count: data?.length || 0,
      status,
      first_worker: data?.[0]?.name || 'none'
    });

    return data || [];
  } catch (error) {
    console.error('getWorkers: Failed:', error);
    throw error;
  }
};

export const getJobs = async () => {
  try {
    const session = await checkAuthStatus();
    if (!session) {
      console.error('getJobs: No active session');
      return [];
    }

    console.log('getJobs: Fetching with auth:', {
      user_id: session.user.id,
      user_email: session.user.email
    });

    // Direct debug query to verify database access
    const { count: jobCount, error: countError } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true });
      
    console.log('getJobs: Database check -', {
      total_count: jobCount,
      error: countError ? countError.message : null
    });

    // Try using the admin function first (bypasses RLS)
    console.log('getJobs: Attempting to use admin function');
    const { data: adminData, error: adminError } = await supabase
      .rpc('admin_get_all_jobs');

    if (!adminError && adminData && adminData.length > 0) {
      console.log('getJobs: Success using admin function', {
        count: adminData.length,
        first_job: adminData[0]?.address || 'none'
      });
      
      // Get secondary workers using admin function
      const { data: adminSecondaryData, error: adminSecondaryError } = await supabase
        .rpc('admin_get_all_secondary_workers');
        
      if (adminSecondaryError) {
        console.error('getJobs: Admin secondary workers query failed:', adminSecondaryError);
      }
      
      const jobsWithSecondaryWorkers = adminData.map(job => ({
        ...job,
        secondary_worker_ids: (adminSecondaryError ? [] : adminSecondaryData || [])
          .filter((sw: any) => sw.job_id === job.id)
          .map((sw: any) => sw.worker_id)
      }));
      
      return jobsWithSecondaryWorkers;
    } else if (adminError) {
      console.log('getJobs: Admin function failed:', adminError.message);
    }

    // First get all jobs - add debugging
    console.log('getJobs: Attempting to fetch all jobs');
    const { data: jobs, error: jobsError, status: jobsStatus } = await supabase
      .from('jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('getJobs: Jobs query failed:', jobsError);
      throw jobsError;
    }

    console.log('getJobs: Jobs query response:', {
      status: jobsStatus,
      count: jobs?.length || 0,
      first_job: jobs?.[0]?.address || 'none'
    });

    // Then get secondary workers
    const { data: secondaryWorkers, error: secondaryError } = await supabase
      .from('job_secondary_workers')
      .select('*');

    if (secondaryError) {
      console.error('getJobs: Secondary workers query failed:', secondaryError);
      throw secondaryError;
    }

    const jobsWithSecondaryWorkers = jobs.map(job => ({
      ...job,
      secondary_worker_ids: secondaryWorkers
        .filter(sw => sw.job_id === job.id)
        .map(sw => sw.worker_id)
    }));

    console.log('getJobs: Success', {
      jobs_count: jobs.length,
      secondary_assignments: secondaryWorkers.length,
      first_job: jobs[0]?.address || 'none'
    });

    return jobsWithSecondaryWorkers;
  } catch (error) {
    console.error('getJobs: Failed:', error);
    throw error;
  }
};

export const createJob = async (job: Omit<Database['public']['Tables']['jobs']['Insert'], 'id' | 'created_at'>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('createJob: Creating new job:', job);
    const { secondary_worker_ids, ...jobData } = job as any;
    
    const { data: newJob, error: jobError } = await supabase
      .from('jobs')
      .insert([jobData])
      .select()
      .single();
    
    if (jobError) {
      console.error('Error creating job:', jobError);
      throw jobError;
    }

    console.log('createJob: Job created successfully:', newJob);
    
    if (secondary_worker_ids?.length) {
      const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
        job_id: newJob.id,
        worker_id
      }));

      console.log('createJob: Adding secondary workers:', secondaryWorkerData);
      const { error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .insert(secondaryWorkerData);

      if (secondaryError) {
        console.error('Error adding secondary workers:', secondaryError);
        throw secondaryError;
      }
    }
    
    return {
      ...newJob,
      secondary_worker_ids: secondary_worker_ids || []
    };
  } catch (error) {
    console.error('Error in createJob:', error);
    throw error;
  }
};

export const updateJob = async (id: string, updates: Partial<Database['public']['Tables']['jobs']['Update']>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('updateJob: Updating job:', { id, updates });
    
    const { secondary_worker_ids, ...jobUpdates } = updates as any;
    
    const { data: updatedJob, error: jobError } = await supabase
      .from('jobs')
      .update(jobUpdates)
      .eq('id', id)
      .select()
      .single();
    
    if (jobError) {
      console.error('Error updating job:', jobError);
      throw jobError;
    }

    console.log('updateJob: Job updated successfully:', updatedJob);

    if (secondary_worker_ids !== undefined) {
      const { error: deleteError } = await supabase
        .from('job_secondary_workers')
        .delete()
        .eq('job_id', id);

      if (deleteError) {
        console.error('Error deleting secondary workers:', deleteError);
        throw deleteError;
      }

      if (secondary_worker_ids?.length) {
        const secondaryWorkerData = secondary_worker_ids.map(worker_id => ({
          job_id: id,
          worker_id
        }));

        console.log('updateJob: Adding new secondary workers:', secondaryWorkerData);
        const { error: insertError } = await supabase
          .from('job_secondary_workers')
          .insert(secondaryWorkerData);

        if (insertError) {
          console.error('Error adding secondary workers:', insertError);
          throw insertError;
        }
      }
    }

    const { data: currentSecondaryWorkers, error: fetchError } = await supabase
      .from('job_secondary_workers')
      .select('worker_id')
      .eq('job_id', id);

    if (fetchError) {
      console.error('Error fetching current secondary workers:', fetchError);
      throw fetchError;
    }

    const finalJob = {
      ...updatedJob,
      secondary_worker_ids: currentSecondaryWorkers.map(sw => sw.worker_id)
    };
    
    return finalJob;
  } catch (error) {
    console.error('Error in updateJob:', error);
    throw error;
  }
};

export const deleteJob = async (id: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('deleteJob: Deleting job:', id);
    const { error } = await supabase
      .from('jobs')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting job:', error);
      throw error;
    }
    
    console.log('deleteJob: Job deleted successfully');
  } catch (error) {
    console.error('Error in deleteJob:', error);
    throw error;
  }
};

export const createWorker = async (worker: Omit<Database['public']['Tables']['workers']['Insert'], 'id' | 'created_at'>) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('createWorker: Creating worker:', worker);
    const { data, error } = await supabase
      .from('workers')
      .insert([worker])
      .select()
      .single();

    if (error) {
      console.error('Error creating worker:', error);
      throw error;
    }

    console.log('createWorker: Worker created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in createWorker:', error);
    throw error;
  }
};

export const getWorkerJobs = async (workerId: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getWorkerJobs: Fetching jobs for worker:', workerId);
    const { data, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('worker_id', workerId);

    if (error) {
      console.error('Error fetching worker jobs:', error);
      throw error;
    }

    console.log(`getWorkerJobs: Found ${data?.length || 0} jobs for worker ${workerId}`);
    return data || [];
  } catch (error) {
    console.error('Error in getWorkerJobs:', error);
    throw error;
  }
};

export const deleteWorker = async (id: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('deleteWorker: Deleting worker:', id);
    const { error } = await supabase.rpc('delete_worker_with_jobs', {
      worker_id: id
    });

    if (error) {
      console.error('Error in deleteWorker:', error);
      throw error;
    }

    console.log('deleteWorker: Worker deleted successfully');
    return true;
  } catch (error) {
    console.error('Error in deleteWorker:', error);
    throw error;
  }
};

export const getCurrentWorker = async (email: string) => {
  try {
    if (!isSupabaseInitialized()) {
      throw new Error('Supabase is not properly initialized');
    }

    console.log('getCurrentWorker: Fetching worker for email:', email);
    
    // Verify connection to Supabase
    try {
      const { error: pingError } = await supabase.from('workers').select('count').limit(1);
      if (pingError) {
        console.error('getCurrentWorker: Failed to connect to Supabase:', pingError);
        throw new Error(`Supabase connection error: ${pingError.message}`);
      }
    } catch (pingError) {
      console.error('getCurrentWorker: Supabase ping failed:', pingError);
      throw new Error('Failed to connect to database');
    }
    
    // Try to get all workers first to see if we can access the table
    try {
      const { data: allWorkers, error: allError } = await supabase
        .from('workers')
        .select('*')
        .limit(5);
      
      if (allError) {
        console.error('getCurrentWorker: Failed to get any workers:', allError);
      } else {
        console.log(`getCurrentWorker: Successfully fetched ${allWorkers.length} workers as test`);
      }
    } catch (testError) {
      console.error('getCurrentWorker: Test fetch failed:', testError);
    }
    
    // Try the new direct worker retrieval function
    try {
      console.log('getCurrentWorker: Trying direct worker retrieval function');
      const { data: directWorker, error: directError } = await supabase
        .rpc('get_worker_by_email', { worker_email: email });
        
      if (!directError && directWorker && directWorker.length > 0) {
        console.log('getCurrentWorker: Found worker via direct function:', directWorker[0]);
        return directWorker[0];
      } else if (directError) {
        console.error('getCurrentWorker: Direct worker function failed:', directError);
      } else {
        console.log('getCurrentWorker: Direct worker function returned no results');
      }
    } catch (directError) {
      console.error('getCurrentWorker: Error with direct worker function:', directError);
    }
    
    // Try the force association function
    try {
      console.log('getCurrentWorker: Trying force association function');
      const { data: forceResult, error: forceError } = await supabase
        .rpc('force_associate_worker', { user_email: email });
        
      if (!forceError && forceResult && forceResult.length > 0) {
        console.log('getCurrentWorker: Force association result:', forceResult[0]);
        
        if (forceResult[0].success) {
          // Fetch the worker directly since we know it exists now
          const { data: workerAfterForce, error: workerAfterError } = await supabase
            .rpc('get_worker_by_email', { worker_email: email });
            
          if (!workerAfterError && workerAfterForce && workerAfterForce.length > 0) {
            console.log('getCurrentWorker: Retrieved worker after force:', workerAfterForce[0]);
            return workerAfterForce[0];
          }
        }
      } else if (forceError) {
        console.error('getCurrentWorker: Force association function failed:', forceError);
      }
    } catch (forceError) {
      console.error('getCurrentWorker: Error with force association function:', forceError);
    }
    
    // Try using the admin function first
    const { data: adminData, error: adminError } = await supabase
      .rpc('admin_get_all_workers');
    
    if (!adminError && adminData && adminData.length > 0) {
      const workerByEmail = adminData.find((w: any) => w.email === email);
      if (workerByEmail) {
        console.log('getCurrentWorker: Found worker via admin function:', workerByEmail);
        return workerByEmail;
      }
    }
    
    // Now try to get the specific worker by email
    const { data, error, status } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    
    if (error) {
      console.error('getCurrentWorker: Error fetching current worker:', error);
      throw error;
    }
    
    if (!data) {
      console.warn(`getCurrentWorker: No worker found for email: ${email}`);
      // If no worker found, try creating one
      try {
        const newWorker = await createWorkerProfile(email);
        console.log('getCurrentWorker: Created new worker:', newWorker);
        return newWorker;
      } catch (createError) {
        console.error('getCurrentWorker: Failed to create worker:', createError);
        throw createError;
      }
    }
    
    console.log(`getCurrentWorker: Worker data for email: ${email}`, data, `(HTTP status: ${status})`);
    
    return data;
  } catch (error) {
    console.error('getCurrentWorker: Error in getCurrentWorker:', error);
    throw error;
  }
};

export const createWorkerProfile = async (email: string, name?: string) => {
  try {
    console.log(`createWorkerProfile: Creating worker profile for ${email}...`);
    
    // Force create worker via database function to ensure success
    const { data: forceResult, error: forceError } = await supabase
      .rpc('force_associate_worker', { user_email: email });
      
    if (!forceError && forceResult && forceResult.length > 0) {
      console.log('createWorkerProfile: Force association result:', forceResult[0]);
      
      if (forceResult[0].success) {
        // Fetch the worker directly since we know it exists now
        const { data: workerAfterForce, error: workerAfterError } = await supabase
          .rpc('get_worker_by_email', { worker_email: email });
          
        if (!workerAfterError && workerAfterForce && workerAfterForce.length > 0) {
          console.log('createWorkerProfile: Retrieved worker after force:', workerAfterForce[0]);
          return workerAfterForce[0];
        }
      }
    }
    
    // Force create worker via database function to ensure success
    const { data: repairData, error: repairError } = await supabase.rpc(
      'repair_worker_associations'
    );
    
    if (repairError) {
      console.log('createWorkerProfile: Repair function failed, falling back to direct insert');
    } else {
      console.log('createWorkerProfile: Repair function result:', repairData);
    }
    
    // Try direct upsert as a fallback
    const { data, error } = await supabase
      .from('workers')
      .upsert(
        {
          name: name || email.split('@')[0],
          email: email,
          role: 'admin'
        },
        { 
          onConflict: 'email',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();
      
    if (error) {
      console.error('Failed to create worker profile:', error);
      throw error;
    }
    
    console.log('Worker profile created/updated:', data);
    return data;
  } catch (error) {
    console.error('Error creating worker profile:', error);
    throw error;
  }
};

export const ensureUserRecord = async (authUserId: string, email: string, name?: string) => {
  try {
    console.log(`ensureUserRecord: Ensuring user record for ${email}...`);
    
    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUserId)
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "Row not found" which is expected
      console.error('Error checking if user exists:', checkError);
    }
    
    if (existingUser) {
      console.log('User record already exists:', existingUser);
      return existingUser;
    }
    
    // If not, create the user record
    console.log('Creating new user record with ID:', authUserId);
    const { data, error } = await supabase
      .from('users')
      .insert([{
        id: authUserId,
        name: name || email.split('@')[0],
        email: email,
        role: 'admin'
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating user record:', error);
      throw error;
    }
    
    console.log('User record created successfully:', data);
    return data;
  } catch (error) {
    console.error('Error in ensureUserRecord:', error);
    throw error;
  }
};

export const runDatabaseDiagnostics = async (email: string) => {
  try {
    console.log('Running database diagnostics...');
    
    // Check workers
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*');
    
    if (workersError) {
      console.error('Error fetching workers:', workersError);
    } else {
      console.log(`Workers table contains ${workers.length} records`);
      const userWorker = workers.find(w => w.email === email);
      console.log(`User worker record:`, userWorker || 'Not found');
    }
    
    // Try using the admin function
    const { data: adminWorkers, error: adminWorkersError } = await supabase
      .rpc('admin_get_all_workers');
      
    if (adminWorkersError) {
      console.error('Error fetching workers via admin function:', adminWorkersError);
    } else {
      console.log(`Admin function returned ${adminWorkers.length} worker records`);
      const userWorker = adminWorkers.find((w: any) => w.email === email);
      console.log(`User worker record via admin function:`, userWorker || 'Not found');
    }
    
    // Try using direct worker retrieval
    const { data: directWorker, error: directError } = await supabase
      .rpc('get_worker_by_email', { worker_email: email });
      
    if (directError) {
      console.error('Error fetching worker directly:', directError);
    } else {
      console.log(`Direct worker retrieval:`, directWorker);
    }
    
    // Check jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*');
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
    } else {
      console.log(`Jobs table contains ${jobs.length} records`);
    }
    
    // Check users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('*');
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
    } else {
      console.log(`Users table contains ${users.length} records`);
      const userRecord = users.find(u => u.email === email);
      console.log(`User record:`, userRecord || 'Not found');
    }
    
    // Check auth user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Current auth user:', user || 'Not authenticated');
    
    return {
      workersCount: workers?.length || 0,
      jobsCount: jobs?.length || 0,
      usersCount: users?.length || 0,
      userWorker: workers?.find(w => w.email === email) || null,
      userRecord: users?.find(u => u.email === email) || null,
      authUser: user
    };
  } catch (error) {
    console.error('Error running diagnostics:', error);
    throw error;
  }
};

export const checkRLSPolicies = async () => {
  try {
    console.log('Checking RLS policies...');
    
    // Try to read from workers table
    const { data: workers, error: workersError } = await supabase
      .from('workers')
      .select('*')
      .limit(5);
    
    if (workersError) {
      console.error('RLS Check: Error reading workers:', workersError);
    } else {
      console.log(`RLS Check: Successfully read ${workers.length} workers`);
    }
    
    // Try to read from jobs table
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .limit(5);
    
    if (jobsError) {
      console.error('RLS Check: Error reading jobs:', jobsError);
    } else {
      console.log(`RLS Check: Successfully read ${jobs.length} jobs`);
    }
    
    // Try to read secondary workers
    const { data: secondaryWorkers, error: swError } = await supabase
      .from('job_secondary_workers')
      .select('*')
      .limit(5);
    
    if (swError) {
      console.error('RLS Check: Error reading job_secondary_workers:', swError);
    } else {
      console.log(`RLS Check: Successfully read ${secondaryWorkers.length} secondary worker assignments`);
    }
    
    // Try manually repairing worker associations
    try {
      const { data: repairData, error: repairError } = await supabase.rpc(
        'repair_worker_associations'
      );
      
      if (repairError) {
        console.error('RLS Check: Repair function not found or failed:', repairError);
      } else {
        console.log('RLS Check: Worker repair function result:', repairData);
      }
    } catch (repairError) {
      console.error('RLS Check: Error running worker repair:', repairError);
    }
    
    return {
      canReadWorkers: !workersError,
      canReadJobs: !jobsError,
      canReadSecondaryWorkers: !swError
    };
  } catch (error) {
    console.error('Error checking RLS policies:', error);
    throw error;
  }
};

// Add a worker status helper function that users can call directly
export const checkWorkerStatus = async (email: string) => {
  try {
    console.log(`Checking worker status for ${email}...`);
    
    // Try the direct retrieval function first
    const { data: directWorker, error: directError } = await supabase
      .rpc('get_worker_by_email', { worker_email: email });
      
    if (!directError && directWorker && directWorker.length > 0) {
      return {
        exists: true,
        worker: directWorker[0],
        source: 'direct_function',
        error: null
      };
    }
    
    // Try the admin function
    const { data: adminWorkers, error: adminError } = await supabase
      .rpc('admin_get_all_workers');
      
    if (!adminError && adminWorkers) {
      const worker = adminWorkers.find((w: any) => w.email === email);
      if (worker) {
        return {
          exists: true,
          worker,
          source: 'admin_function',
          error: null
        };
      }
    }
    
    // Try standard query
    const { data: standardWorker, error: standardError } = await supabase
      .from('workers')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (!standardError && standardWorker) {
      return {
        exists: true,
        worker: standardWorker,
        source: 'standard_query',
        error: null
      };
    }
    
    // Try force association as a last resort
    const { data: forceResult, error: forceError } = await supabase
      .rpc('force_associate_worker', { user_email: email });
      
    if (!forceError && forceResult && forceResult.length > 0 && forceResult[0].success) {
      // Get the worker after forcing association
      const { data: workerAfterForce } = await supabase
        .rpc('get_worker_by_email', { worker_email: email });
        
      if (workerAfterForce && workerAfterForce.length > 0) {
        return {
          exists: true,
          worker: workerAfterForce[0],
          source: 'force_created',
          error: null
        };
      }
    }
    
    // If we get here, we couldn't find or create a worker
    return {
      exists: false,
      worker: null,
      source: null,
      error: 'Failed to find or create worker profile'
    };
  } catch (error) {
    console.error('Error checking worker status:', error);
    return {
      exists: false,
      worker: null,
      source: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};