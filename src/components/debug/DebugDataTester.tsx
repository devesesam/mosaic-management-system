import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

const DebugDataTester = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Function to directly insert a test worker and job
  const insertTestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Attempting to insert test data directly...');
      
      // 1. Insert a test worker
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .insert([
          { 
            name: 'Test Worker ' + new Date().toISOString(),
            email: 'test' + Date.now() + '@example.com',
            role: 'admin'
          }
        ])
        .select()
        .single();
      
      if (workerError) {
        console.error('Error inserting test worker:', workerError);
        setError(`Worker insertion failed: ${workerError.message}`);
        setLoading(false);
        return;
      }
      
      // 2. Insert a test job assigned to this worker
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            address: 'Test Address ' + Date.now(),
            customer_name: 'Test Customer',
            worker_id: worker.id,
            start_date: today.toISOString(),
            end_date: tomorrow.toISOString(),
            status: 'In Progress',
            tile_color: '#ff0000'
          }
        ])
        .select()
        .single();
      
      if (jobError) {
        console.error('Error inserting test job:', jobError);
        setError(`Job insertion failed: ${jobError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Successfully inserted test data:', { worker, job });
      setResults({ insertedWorker: worker, insertedJob: job });
    } catch (err) {
      console.error('Exception during test data insertion:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to query and count existing data
  const countExistingData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Querying existing data counts...');
      
      // Count workers
      const { count: workersCount, error: workersError } = await supabase
        .from('workers')
        .select('*', { count: 'exact', head: true });
      
      if (workersError) {
        console.error('Error counting workers:', workersError);
        setError(`Workers count failed: ${workersError.message}`);
        setLoading(false);
        return;
      }
      
      // Count jobs
      const { count: jobsCount, error: jobsError } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true });
      
      if (jobsError) {
        console.error('Error counting jobs:', jobsError);
        setError(`Jobs count failed: ${jobsError.message}`);
        setLoading(false);
        return;
      }
      
      // Count secondary worker assignments
      const { count: secondaryCount, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*', { count: 'exact', head: true });
      
      if (secondaryError) {
        console.error('Error counting secondary workers:', secondaryError);
        setError(`Secondary workers count failed: ${secondaryError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Data counts:', { workersCount, jobsCount, secondaryCount });
      setResults({ counts: { workers: workersCount, jobs: jobsCount, secondaryWorkers: secondaryCount } });
    } catch (err) {
      console.error('Exception during count:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to list actual data
  const listActualData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Listing actual data...');
      
      // List workers (limit 10)
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .limit(10);
      
      if (workersError) {
        console.error('Error listing workers:', workersError);
        setError(`Workers listing failed: ${workersError.message}`);
        setLoading(false);
        return;
      }
      
      // List jobs (limit 10)
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .limit(10);
      
      if (jobsError) {
        console.error('Error listing jobs:', jobsError);
        setError(`Jobs listing failed: ${jobsError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Data listing:', { 
        workersCount: workers?.length || 0, 
        jobsCount: jobs?.length || 0,
        workers,
        jobs
      });
      setResults({ 
        listing: { 
          workers, 
          jobs 
        } 
      });
    } catch (err) {
      console.error('Exception during listing:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Function to test database connection
  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('Testing database connection...');
      
      // Simple connection test - query pg_stat_database
      const { data, error } = await supabase
        .from('pg_stat_database')
        .select('datname')
        .limit(1);
      
      if (error) {
        console.error('Connection test failed:', error);
        setError(`Connection test failed: ${error.message}`);
        setLoading(false);
        return;
      }
      
      console.log('Connection test succeeded:', data);
      setResults({ connection: { success: true, data } });
    } catch (err) {
      console.error('Exception during connection test:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 bg-white shadow-lg rounded-lg p-4 max-w-md z-50 text-sm">
      <h3 className="font-bold text-lg text-gray-800 mb-3">Debug Data Tester</h3>
      
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={insertTestData}
          disabled={loading}
          className="bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50"
        >
          Insert Test Data
        </button>
        
        <button
          onClick={countExistingData}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          Count Existing Data
        </button>
        
        <button
          onClick={listActualData}
          disabled={loading}
          className="bg-purple-600 text-white px-3 py-2 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
        >
          List Actual Data
        </button>
        
        <button
          onClick={testConnection}
          disabled={loading}
          className="bg-amber-600 text-white px-3 py-2 rounded text-xs hover:bg-amber-700 disabled:opacity-50"
        >
          Test DB Connection
        </button>
        
        <button
          onClick={() => window.location.reload()}
          disabled={loading}
          className="col-span-2 bg-gray-600 text-white px-3 py-2 rounded text-xs hover:bg-gray-700 disabled:opacity-50"
        >
          Reload Application
        </button>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Processing...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="font-medium">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      
      {results && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Results:</h4>
          <pre className="bg-gray-50 p-3 rounded border text-xs overflow-x-auto max-h-60">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugDataTester;