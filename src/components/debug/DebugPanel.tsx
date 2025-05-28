import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DebugPanel = () => {
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple direct table access test with more detailed logging
  const testDirectAccess = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('DEBUG: Testing direct table access...');
      
      // Try workers table
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*');
      
      console.log('DEBUG: Workers query result:', { 
        error: workersError ? workersError.message : null,
        count: workers?.length || 0,
        data: workers
      });
      
      // Try jobs table
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*');
      
      console.log('DEBUG: Jobs query result:', { 
        error: jobsError ? jobsError.message : null,
        count: jobs?.length || 0,
        data: jobs
      });
      
      // Try secondary workers table
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');
      
      console.log('DEBUG: Secondary workers query result:', { 
        error: secondaryError ? secondaryError.message : null,
        count: secondaryWorkers?.length || 0,
        data: secondaryWorkers
      });
      
      setResults({
        workers: {
          error: workersError,
          count: workers?.length || 0,
          data: workers
        },
        jobs: {
          error: jobsError,
          count: jobs?.length || 0,
          data: jobs
        },
        secondaryWorkers: {
          error: secondaryError,
          count: secondaryWorkers?.length || 0,
          data: secondaryWorkers
        }
      });
    } catch (err) {
      console.error('DEBUG: Error in direct access test:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Add test data
  const addTestData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('DEBUG: Adding test worker...');
      
      // Add a test worker
      const { data: worker, error: workerError } = await supabase
        .from('workers')
        .insert([
          { name: 'Debug Test Worker', email: `test${Date.now()}@example.com`, role: 'admin' }
        ])
        .select()
        .single();
      
      if (workerError) {
        console.error('DEBUG: Error adding worker:', workerError);
        setError(`Error adding worker: ${workerError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('DEBUG: Worker added:', worker);
      
      // Add a test job assigned to this worker
      console.log('DEBUG: Adding test job...');
      
      const today = new Date();
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .insert([
          {
            address: 'Debug Test Address',
            customer_name: 'Debug Customer',
            worker_id: worker.id,
            start_date: today.toISOString(),
            end_date: tomorrow.toISOString(),
            status: 'Awaiting Order',
            tile_color: '#ff0000'
          }
        ])
        .select()
        .single();
      
      if (jobError) {
        console.error('DEBUG: Error adding job:', jobError);
        setError(`Error adding job: ${jobError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('DEBUG: Job added:', job);
      
      setResults({
        addedWorker: worker,
        addedJob: job
      });
    } catch (err) {
      console.error('DEBUG: Error adding test data:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Force refresh
  const forceRefresh = () => {
    console.log('DEBUG: Forcing refresh of application data...');
    window.location.reload();
  };

  // Query database structure
  const queryDatabaseStructure = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('DEBUG: Querying database structure...');
      
      // Try to get table list
      const { data: tables, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      if (tablesError) {
        console.error('DEBUG: Error querying tables:', tablesError);
        setError(`Error querying tables: ${tablesError.message}`);
        setLoading(false);
        return;
      }
      
      console.log('DEBUG: Tables found:', tables);
      
      // Get columns for important tables
      const tableColumns: Record<string, any> = {};
      
      for (const tableName of ['workers', 'jobs', 'job_secondary_workers']) {
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_schema', 'public')
          .eq('table_name', tableName);
        
        if (columnsError) {
          console.error(`DEBUG: Error querying columns for ${tableName}:`, columnsError);
        } else {
          tableColumns[tableName] = columns;
          console.log(`DEBUG: Columns for ${tableName}:`, columns);
        }
      }
      
      setResults({
        tables,
        tableColumns
      });
    } catch (err) {
      console.error('DEBUG: Error querying database structure:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 w-96 z-50 text-sm">
      <h3 className="font-medium text-gray-800 mb-2">Database Debug Panel</h3>
      
      <div className="flex flex-col space-y-2 mb-3">
        <button
          onClick={testDirectAccess}
          disabled={loading}
          className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          Test Direct Database Access
        </button>
        
        <button
          onClick={addTestData}
          disabled={loading}
          className="bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50"
        >
          Add Test Data
        </button>
        
        <button
          onClick={queryDatabaseStructure}
          disabled={loading}
          className="bg-purple-600 text-white px-3 py-2 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
        >
          Query Database Structure
        </button>
        
        <button
          onClick={forceRefresh}
          disabled={loading}
          className="bg-yellow-600 text-white px-3 py-2 rounded text-xs hover:bg-yellow-700 disabled:opacity-50"
        >
          Force Refresh App
        </button>
      </div>
      
      {loading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
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
          <pre className="bg-gray-50 p-3 rounded border text-xs overflow-x-auto max-h-40">
            {JSON.stringify(results, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;