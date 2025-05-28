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
    tablesInfo?: any;
    tablesList?: any[];
    workersColumns?: any[];
    jobsColumns?: any[];
  }>({
    connected: false,
    loading: true
  });

  // Direct check of database connection
  const checkConnection = async () => {
    setStatus(prev => ({ ...prev, loading: true }));
    
    try {
      console.log('Testing Supabase connection from component...');
      
      // Test direct database query to ensure connection is working
      const { data: healthCheck, error: healthError } = await supabase
        .from('pg_stat_database')
        .select('*')
        .limit(1);
      
      if (healthError) {
        console.error('Health check failed:', healthError);
        setStatus({
          connected: false,
          loading: false,
          error: healthError,
          lastChecked: new Date()
        });
        return;
      }
      
      // Test connection to workers table - simple direct query
      const workersResult = await supabase
        .from('workers')
        .select('*')
        .limit(1);
      
      // Test connection to jobs table - simple direct query
      const jobsResult = await supabase
        .from('jobs')
        .select('*')
        .limit(1);
      
      // Try to get table info (without RPC)
      const { data: tablesInfo, error: tablesError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      console.log('Connection test results:', {
        workers: workersResult,
        jobs: jobsResult,
        tables: tablesInfo
      });
      
      setStatus({
        connected: !workersResult.error && !jobsResult.error,
        loading: false,
        workersData: {
          error: workersResult.error,
          status: workersResult.status,
          statusText: workersResult.statusText,
          data: workersResult.data,
          count: workersResult.data?.length || 0
        },
        jobsData: {
          error: jobsResult.error,
          status: jobsResult.status,
          statusText: jobsResult.statusText,
          data: jobsResult.data,
          count: jobsResult.data?.length || 0
        },
        tablesInfo: tablesInfo || [],
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

  // List tables in database - no RPC required
  const listTables = async () => {
    try {
      console.log('Listing tables directly from information_schema...');
      
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name, table_schema')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');
      
      console.log('Tables in database:', data);
      console.log('List tables error:', error);
      
      if (error) {
        console.error('Error listing tables:', error);
        return;
      }
      
      setStatus(prev => ({
        ...prev,
        tablesList: data
      }));
    } catch (error) {
      console.error('Error listing tables:', error);
    }
  };

  // Get table columns - no RPC required
  const getTableColumns = async (table: string) => {
    try {
      console.log(`Getting columns for ${table} directly from information_schema...`);
      
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default')
        .eq('table_schema', 'public')
        .eq('table_name', table)
        .order('ordinal_position');
      
      console.log(`Columns for ${table}:`, data);
      
      if (error) {
        console.error(`Error getting columns for ${table}:`, error);
        return;
      }
      
      if (table === 'workers') {
        setStatus(prev => ({ ...prev, workersColumns: data }));
      } else if (table === 'jobs') {
        setStatus(prev => ({ ...prev, jobsColumns: data }));
      }
    } catch (error) {
      console.error(`Error getting columns for ${table}:`, error);
    }
  };
  
  // Test a direct insert to verify write permissions
  const testInsert = async () => {
    try {
      console.log('Testing write permissions with a direct insert...');
      
      // Generate a unique test name
      const testName = `Test_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('workers')
        .insert([
          { name: testName, email: `${testName.toLowerCase()}@example.com`, role: 'admin' }
        ])
        .select();
      
      console.log('Insert test result:', { data, error });
      
      if (error) {
        alert(`Insert failed: ${error.message}`);
        return;
      }
      
      // If insert succeeded, try to delete the test record
      if (data && data.length > 0) {
        const deleteResult = await supabase
          .from('workers')
          .delete()
          .eq('id', data[0].id);
        
        console.log('Delete test result:', deleteResult);
        
        if (deleteResult.error) {
          alert(`Insert succeeded but delete failed: ${deleteResult.error.message}`);
          return;
        }
        
        alert('Insert and delete test succeeded! Database write permissions are working.');
      }
    } catch (error) {
      console.error('Error testing insert:', error);
      alert(`Error testing insert: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
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
              {status.workersData.error ? 'Error' : `OK (${status.workersData.count} rows)`}
            </span>
          </div>
        )}
        
        {status.jobsData && (
          <div className="flex justify-between">
            <span className="text-gray-600">Jobs Table:</span>
            <span className={status.jobsData.error ? 'text-red-600' : 'text-green-600'}>
              {status.jobsData.error ? 'Error' : `OK (${status.jobsData.count} rows)`}
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
        <div>
          <div className="text-red-600 font-medium">Workers Table Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.workersData.error, null, 2)}
          </pre>
        </div>
      )}
      
      {status.jobsData?.error && (
        <div>
          <div className="text-red-600 font-medium">Jobs Table Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.jobsData.error, null, 2)}
          </pre>
        </div>
      )}
      
      {status.error && (
        <div>
          <div className="text-red-600 font-medium">Connection Error:</div>
          <pre className="bg-red-50 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(status.error, null, 2)}
          </pre>
        </div>
      )}
      
      {/* Display table list if available */}
      {status.tablesList && status.tablesList.length > 0 && (
        <div>
          <div className="font-medium text-gray-700">Public Tables:</div>
          <ul className="list-disc pl-5 text-xs">
            {status.tablesList.map((table: any, index: number) => (
              <li key={index}>{table.table_name}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Display worker columns if available */}
      {status.workersColumns && status.workersColumns.length > 0 && (
        <div>
          <div className="font-medium text-gray-700">Workers Columns:</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-1 border">Column</th>
                <th className="text-left p-1 border">Type</th>
                <th className="text-left p-1 border">Nullable</th>
              </tr>
            </thead>
            <tbody>
              {status.workersColumns.map((col: any, index: number) => (
                <tr key={index}>
                  <td className="p-1 border">{col.column_name}</td>
                  <td className="p-1 border">{col.data_type}</td>
                  <td className="p-1 border">{col.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Display job columns if available */}
      {status.jobsColumns && status.jobsColumns.length > 0 && (
        <div>
          <div className="font-medium text-gray-700">Jobs Columns:</div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-1 border">Column</th>
                <th className="text-left p-1 border">Type</th>
                <th className="text-left p-1 border">Nullable</th>
              </tr>
            </thead>
            <tbody>
              {status.jobsColumns.map((col: any, index: number) => (
                <tr key={index}>
                  <td className="p-1 border">{col.column_name}</td>
                  <td className="p-1 border">{col.data_type}</td>
                  <td className="p-1 border">{col.is_nullable === 'YES' ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2">
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
          onClick={testInsert}
          className="bg-amber-600 text-white px-3 py-1 rounded text-xs hover:bg-amber-700"
        >
          Test Insert
        </button>
      </div>
    </div>
  );
};

export default SupabaseConnectionTest;