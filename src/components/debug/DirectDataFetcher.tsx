import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface DirectDataFetcherProps {
  onClose: () => void;
}

const DirectDataFetcher: React.FC<DirectDataFetcherProps> = ({ onClose }) => {
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    data: null as any,
    connectionDetails: {
      url: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 10) + '...'
    }
  });

  // Create a new Supabase client directly in this component
  // This bypasses any potential issues with the shared client
  const directFetchData = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('DirectDataFetcher: Creating new Supabase client');
      // Create a fresh client for this request
      const supabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY
      );
      
      console.log('DirectDataFetcher: Fetching workers data');
      // First, try to fetch workers
      const { data: workers, error: workersError } = await supabase
        .from('workers')
        .select('*');
      
      if (workersError) {
        console.error('DirectDataFetcher: Error fetching workers:', workersError);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Workers fetch error: ${workersError.message}` 
        }));
        return;
      }
      
      console.log('DirectDataFetcher: Fetching jobs data');
      // Then, try to fetch jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*');
      
      if (jobsError) {
        console.error('DirectDataFetcher: Error fetching jobs:', jobsError);
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: `Jobs fetch error: ${jobsError.message}`,
          data: { workers, jobs: [] }
        }));
        return;
      }
      
      console.log('DirectDataFetcher: Fetching secondary workers data');
      // Finally, fetch secondary workers
      const { data: secondaryWorkers, error: secondaryError } = await supabase
        .from('job_secondary_workers')
        .select('*');
      
      if (secondaryError) {
        console.error('DirectDataFetcher: Error fetching secondary workers:', secondaryError);
        setState(prev => ({ 
          ...prev, 
          loading: false,
          data: { workers, jobs, secondaryWorkers: [] }
        }));
        return;
      }
      
      // Success - we have all the data
      console.log('DirectDataFetcher: Successfully fetched all data', {
        workersCount: workers?.length || 0,
        jobsCount: jobs?.length || 0,
        secondaryWorkersCount: secondaryWorkers?.length || 0
      });
      
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        data: { workers, jobs, secondaryWorkers } 
      }));
    } catch (error) {
      console.error('DirectDataFetcher: Unexpected error:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}` 
      }));
    }
  };

  // Run data fetch on mount
  useEffect(() => {
    directFetchData();
  }, []);

  const handleRefresh = () => {
    directFetchData();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Direct Database Query</h2>
            <p className="text-sm text-gray-500 mt-1">
              Bypasses application state to directly fetch from Supabase
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="bg-gray-50 px-4 py-2 border-b">
          <div className="flex justify-between items-center">
            <div className="text-sm">
              <span className="text-gray-600">Connection:</span>{' '}
              <span className="font-mono">{state.connectionDetails.url}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={state.loading}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {state.loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-gray-600">Loading data directly from Supabase...</span>
            </div>
          ) : state.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              <div className="font-medium">Error fetching data</div>
              <div className="mt-2">{state.error}</div>
            </div>
          ) : !state.data ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded">
              <div className="font-medium">No data returned</div>
              <div className="mt-2">The query completed but no data was returned.</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Workers ({state.data.workers?.length || 0})
                </h3>
                {state.data.workers?.length ? (
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                    {JSON.stringify(state.data.workers, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-700">
                    No workers found in database
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Jobs ({state.data.jobs?.length || 0})
                </h3>
                {state.data.jobs?.length ? (
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                    {JSON.stringify(state.data.jobs, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-700">
                    No jobs found in database
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">
                  Job Secondary Workers ({state.data.secondaryWorkers?.length || 0})
                </h3>
                {state.data.secondaryWorkers?.length ? (
                  <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                    {JSON.stringify(state.data.secondaryWorkers, null, 2)}
                  </pre>
                ) : (
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-700">
                    No secondary worker assignments found in database
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DirectDataFetcher;