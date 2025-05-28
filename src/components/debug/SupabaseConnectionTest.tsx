import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const SupabaseConnectionTest = () => {
  const [status, setStatus] = useState<{
    connected: boolean;
    loading: boolean;
    error?: any;
    workersData?: any;
    jobsData?: any;
    lastChecked?: Date;
  }>({
    connected: false,
    loading: true
  });

  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('Testing Supabase connection from component...');
      
      // Test connection to workers table
      const workersResult = await supabase
        .from('workers')
        .select('count')
        .limit(1);
      
      // Test connection to jobs table
      const jobsResult = await supabase
        .from('jobs')
        .select('count')
        .limit(1);
      
      // Check table structure
      const { data: tableInfo } = await supabase
        .rpc('get_table_info', { table_name: 'workers' });
      
      setStatus({
        connected: !workersResult.error && !jobsResult.error,
        loading: false,
        workersData: {
          error: workersResult.error,
          status: workersResult.status,
          statusText: workersResult.statusText,
          data: workersResult.data
        },
        jobsData: {
          error: jobsResult.error,
          status: jobsResult.status,
          statusText: jobsResult.statusText,
          data: jobsResult.data
        },
        tableInfo,
        lastChecked: new Date()
      });
    } catch (error) {
      console.error('Error in connection test component:', error);
      setStatus({
        connected: false,
        loading: false,
        error,
        lastChecked: new Date()
      });
    }
  };

  // List tables in database
  const listTables = async () => {
    try {
      const { data, error } = await supabase
        .rpc('list_tables');
      
      console.log('Tables in database:', data);
      console.log('List tables error:', error);
    } catch (error) {
      console.error('Error listing tables:', error);
    }
  };

  // Get table columns
  const getTableColumns = async (table: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_table_columns', { table_name: table });
      
      console.log(`Columns for ${table}:`, data);
      console.log('Get columns error:', error);
    } catch (error) {
      console.error(`Error getting columns for ${table}:`, error);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="fixed bottom-0 right-0 bg-white shadow-lg rounded-tl-lg p-4 max-w-md z-50 text-sm overflow-y-auto" style={{ maxHeight: '80vh' }}>
      <h3 className="font-medium text-gray-800 mb-2">Supabase Connection Status</h3>
      
      <div className="space-y-1 mb-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Connected:</span>
          <span className={
            status.loading ? 'text-yellow-600' : 
            status.connected ? 'text-green-600' : 'text-red-600'
          }>
            {status.loading ? 'Checking...' : status.connected ? 'Yes' : 'No'}
          </span>
        </div>
        
        {status.workersData && (
          <div className="flex justify-between">
            <span className="text-gray-600">Workers Table:</span>
            <span className={status.workersData.error ? 'text-red-600' : 'text-green-600'}>
              {status.workersData.error ? 'Error' : 'OK'} ({status.workersData.status})
            </span>
          </div>
        )}
        
        {status.jobsData && (
          <div className="flex justify-between">
            <span className="text-gray-600">Jobs Table:</span>
            <span className={status.jobsData.error ? 'text-red-600' : 'text-green-600'}>
              {status.jobsData.error ? 'Error' : 'OK'} ({status.jobsData.status})
            </span>
          </div>
        )}
        
        {status.lastChecked && (
          <div className="flex justify-between">
            <span className="text-gray-600">Last checked:</span>
            <span>{status.lastChecked.toLocaleTimeString()}</span>
          </div>
        )}
      </div>
      
      {status.workersData?.error && (
        <div className="mb-3">
          <div className="text-red-600 font-medium">Workers Table Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.workersData.error, null, 2)}
          </pre>
        </div>
      )}
      
      {status.jobsData?.error && (
        <div className="mb-3">
          <div className="text-red-600 font-medium">Jobs Table Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.jobsData.error, null, 2)}
          </pre>
        </div>
      )}
      
      {status.error && (
        <div className="mb-3">
          <div className="text-red-600 font-medium">Connection Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.error, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex justify-between flex-wrap gap-2">
        <button
          onClick={checkConnection}
          disabled={status.loading}
          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          {status.loading ? 'Checking...' : 'Check Connection'}
        </button>
        
        <button
          onClick={listTables}
          className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
        >
          List Tables
        </button>
        
        <button
          onClick={() => getTableColumns('workers')}
          className="bg-purple-600 text-white px-3 py-1 rounded text-xs hover:bg-purple-700"
        >
          Worker Columns
        </button>
        
        <button
          onClick={() => getTableColumns('jobs')}
          className="bg-indigo-600 text-white px-3 py-1 rounded text-xs hover:bg-indigo-700"
        >
          Job Columns
        </button>
        
        <button
          onClick={() => console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)}
          className="bg-gray-200 text-gray-800 px-3 py-1 rounded text-xs hover:bg-gray-300"
        >
          Log URL
        </button>
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;