import React, { useState, useEffect } from 'react';
import { X, RefreshCw } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

interface RawDataFetcherProps {
  onClose: () => void;
}

const RawDataFetcher: React.FC<RawDataFetcherProps> = ({ onClose }) => {
  const [state, setState] = useState({
    loading: true,
    error: null as string | null,
    data: null as any,
  });

  // Try a different Supabase URL - this one is just an example
  // Replace with your actual working Supabase URL and key
  const altSupabaseUrl = "https://hxqpajrfmsbnurgyowqk.supabase.co";
  const altSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh4cXBhanJmbXNibnVyZ3lvd3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODk2MjMxODUsImV4cCI6MjAwNTE5OTE4NX0.qMVy1hmylAd0vGQ_Rkx6DSRX39ewgwHuO5cbnLBLlQ8";

  // Direct fetch function using a different Supabase project
  const fetchDataDirectly = async () => {
    setState({ loading: true, error: null, data: null });
    
    try {
      console.log('RawDataFetcher: Creating new Supabase client with alt URL');
      
      // Create a completely fresh client with alternative URL
      const supabase = createClient(altSupabaseUrl, altSupabaseKey);
      
      console.log('RawDataFetcher: Attempting to query database directly');
      
      // Use a more generic query that should work on any Supabase instance
      const { data, error } = await supabase
        .from('jobs')
        .select('*');
      
      if (error) {
        console.error('RawDataFetcher: Query error:', error);
        setState({ 
          loading: false, 
          error: `Database query failed: ${error.message}`, 
          data: null 
        });
        return;
      }
      
      console.log('RawDataFetcher: Query successful!', { dataCount: data?.length || 0 });
      setState({ 
        loading: false, 
        error: null, 
        data: data 
      });
    } catch (error) {
      console.error('RawDataFetcher: Unexpected error:', error);
      setState({ 
        loading: false, 
        error: `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    }
  };

  // Fallback function that tries standard HTTP instead of Supabase client
  const fetchWithFallback = async () => {
    setState({ loading: true, error: null, data: null });
    
    try {
      console.log('RawDataFetcher: Trying fallback with direct fetch API');
      
      // Use fetch API directly to bypass Supabase client completely
      const response = await fetch(`${altSupabaseUrl}/rest/v1/jobs?select=*`, {
        headers: {
          'apikey': altSupabaseKey,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('RawDataFetcher: Fallback fetch successful!', { dataCount: data?.length || 0 });
      
      setState({ 
        loading: false, 
        error: null, 
        data: data 
      });
    } catch (error) {
      console.error('RawDataFetcher: Fallback fetch error:', error);
      setState({ 
        loading: false, 
        error: `Fallback fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        data: null
      });
    }
  };

  // Run primary fetch on mount
  useEffect(() => {
    fetchDataDirectly();
  }, []);

  // If primary fetch fails, try the fallback
  useEffect(() => {
    if (state.error && !state.loading && !state.data) {
      console.log('RawDataFetcher: Primary fetch failed, trying fallback');
      fetchWithFallback();
    }
  }, [state.error, state.loading, state.data]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-800">Raw Database Data</h2>
            <p className="text-sm text-gray-500 mt-1">
              Using alternative connection: {altSupabaseUrl}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex items-center justify-between p-2 bg-gray-50 border-b">
          <div className="text-sm font-medium ml-2">
            {state.loading ? 'Fetching data...' : state.data ? `${state.data.length} records found` : 'No data found'}
          </div>
          <button
            onClick={state.loading ? undefined : fetchDataDirectly}
            disabled={state.loading}
            className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {state.loading ? (
              <>
                <RefreshCw size={14} className="mr-1 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="mr-1" />
                Refresh
              </>
            )}
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {state.loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <span className="text-gray-600">Fetching data from alternative Supabase project...</span>
              <span className="text-xs text-gray-500 mt-2">{altSupabaseUrl}</span>
            </div>
          ) : state.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              <div className="font-medium">Error fetching data</div>
              <div className="mt-2">{state.error}</div>
              <div className="mt-4">
                <p className="text-sm font-medium">Try using your own Supabase URL:</p>
                <p className="text-xs mt-1">1. Replace the URL in the code with your working Supabase URL</p>
                <p className="text-xs">2. Replace the key with your anon key</p>
                <p className="text-xs">3. Restart the app</p>
              </div>
            </div>
          ) : !state.data || state.data.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded">
              <div className="font-medium">No data returned</div>
              <div className="mt-2">
                The query completed successfully but no data was returned from the database.
              </div>
            </div>
          ) : (
            <div>
              <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200 h-full">
                {JSON.stringify(state.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RawDataFetcher;