import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';

// Component for advanced database diagnostics using our new SQL functions
const SupabaseDiagnostics = () => {
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Run a basic connectivity test
  const testConnectivity = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('check_db_connectivity');
      
      if (error) {
        console.error('Connectivity test failed:', error);
        setError(`Connectivity test failed: ${error.message}`);
        setDiagnosticResults(null);
      } else {
        console.log('Connectivity test result:', data);
        setDiagnosticResults({ connectivity: data });
      }
    } catch (err) {
      console.error('Error running connectivity test:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Test if specific tables exist
  const checkTables = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const tablesResults = {};
      const tables = ['workers', 'jobs', 'job_secondary_workers', 'users'];
      
      for (const table of tables) {
        const { data, error } = await supabase.rpc('check_table_exists', { table_name: table });
        
        if (error) {
          console.error(`Error checking table ${table}:`, error);
          tablesResults[table] = { error: error.message };
        } else {
          tablesResults[table] = data;
        }
      }
      
      console.log('Table check results:', tablesResults);
      setDiagnosticResults({ tables: tablesResults });
    } catch (err) {
      console.error('Error checking tables:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Check table permissions
  const checkPermissions = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const permissionsResults = {};
      const tables = ['workers', 'jobs', 'job_secondary_workers', 'users'];
      
      for (const table of tables) {
        const { data, error } = await supabase.rpc('check_table_permissions', { table_name: table });
        
        if (error) {
          console.error(`Error checking permissions for ${table}:`, error);
          permissionsResults[table] = { error: error.message };
        } else {
          permissionsResults[table] = data;
        }
      }
      
      console.log('Permissions check results:', permissionsResults);
      setDiagnosticResults({ permissions: permissionsResults });
    } catch (err) {
      console.error('Error checking permissions:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Get detailed info about all tables
  const inspectTables = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.rpc('inspect_tables');
      
      if (error) {
        console.error('Error inspecting tables:', error);
        setError(`Inspection failed: ${error.message}`);
      } else {
        console.log('Table inspection result:', data);
        setDiagnosticResults({ inspection: data });
      }
    } catch (err) {
      console.error('Error during table inspection:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Attempt to insert a test record
  const testWriteAccess = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Try to insert a test record into workers table
      const testName = `TestWorker_${Date.now()}`;
      
      const { data, error } = await supabase
        .from('workers')
        .insert([
          { name: testName, email: `${testName.toLowerCase()}@example.com`, role: 'admin' }
        ])
        .select();
      
      if (error) {
        console.error('Write test failed:', error);
        setError(`Write test failed: ${error.message}`);
        setDiagnosticResults({ writeTest: { success: false, error: error.message } });
        return;
      }
      
      console.log('Write test succeeded:', data);
      
      // Try to delete the test record
      if (data && data.length > 0) {
        const { error: deleteError } = await supabase
          .from('workers')
          .delete()
          .eq('id', data[0].id);
        
        if (deleteError) {
          console.error('Delete test failed:', deleteError);
          setDiagnosticResults({ 
            writeTest: { 
              success: true, 
              deleteSuccess: false, 
              testRecord: data[0],
              error: deleteError.message 
            } 
          });
          return;
        }
        
        setDiagnosticResults({ 
          writeTest: { 
            success: true, 
            deleteSuccess: true 
          } 
        });
      }
    } catch (err) {
      console.error('Error during write test:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Fallback test to bypass the ORM
  const testDirectSQL = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Execute a direct SQL query using the SQL tag
      const { data, error } = await supabase.rpc(
        'check_db_connectivity'
      );
      
      if (error) {
        console.error('Direct SQL test failed:', error);
        setError(`Direct SQL test failed: ${error.message}`);
      } else {
        console.log('Direct SQL test result:', data);
        setDiagnosticResults({ directSQL: data });
      }
    } catch (err) {
      console.error('Error during direct SQL test:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed right-4 bottom-4 bg-white shadow-lg rounded-lg p-4 max-w-lg w-full max-h-[80vh] overflow-y-auto z-50">
      <h3 className="font-semibold text-gray-800 mb-3">Supabase Database Diagnostics</h3>
      
      <div className="space-y-2 mb-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={testConnectivity}
            disabled={isLoading}
            className="bg-blue-600 text-white px-3 py-2 rounded text-xs hover:bg-blue-700 disabled:opacity-50"
          >
            Test Connectivity
          </button>
          
          <button
            onClick={checkTables}
            disabled={isLoading}
            className="bg-green-600 text-white px-3 py-2 rounded text-xs hover:bg-green-700 disabled:opacity-50"
          >
            Check Tables
          </button>
          
          <button
            onClick={checkPermissions}
            disabled={isLoading}
            className="bg-purple-600 text-white px-3 py-2 rounded text-xs hover:bg-purple-700 disabled:opacity-50"
          >
            Check Permissions
          </button>
          
          <button
            onClick={inspectTables}
            disabled={isLoading}
            className="bg-indigo-600 text-white px-3 py-2 rounded text-xs hover:bg-indigo-700 disabled:opacity-50"
          >
            Inspect Tables
          </button>
          
          <button
            onClick={testWriteAccess}
            disabled={isLoading}
            className="bg-amber-600 text-white px-3 py-2 rounded text-xs hover:bg-amber-700 disabled:opacity-50"
          >
            Test Write Access
          </button>
          
          <button
            onClick={testDirectSQL}
            disabled={isLoading}
            className="bg-rose-600 text-white px-3 py-2 rounded text-xs hover:bg-rose-700 disabled:opacity-50"
          >
            Test Direct SQL
          </button>
        </div>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Running diagnostics...</span>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          <div className="font-medium">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}
      
      {diagnosticResults && (
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Results:</h4>
          <pre className="bg-gray-50 p-3 rounded border text-xs overflow-x-auto" style={{ maxHeight: '400px' }}>
            {JSON.stringify(diagnosticResults, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SupabaseDiagnostics;