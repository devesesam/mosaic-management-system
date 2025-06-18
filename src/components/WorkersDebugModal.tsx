import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, CheckCircle, Database } from 'lucide-react';
import { useWorkerStore } from '../store/workersStore';
import { getAllWorkers } from '../api/workersApi';

interface WorkersDebugModalProps {
  onClose: () => void;
}

const WorkersDebugModal: React.FC<WorkersDebugModalProps> = ({ onClose }) => {
  const [directApiResult, setDirectApiResult] = useState<any>(null);
  const [directApiError, setDirectApiError] = useState<string | null>(null);
  const [directApiLoading, setDirectApiLoading] = useState(false);
  
  const { workers, loading, error, fetchWorkers } = useWorkerStore();

  const testDirectAPI = async () => {
    setDirectApiLoading(true);
    setDirectApiError(null);
    setDirectApiResult(null);
    
    try {
      console.log('WorkersDebug: Testing direct API call...');
      const result = await getAllWorkers();
      console.log('WorkersDebug: Direct API result:', result);
      setDirectApiResult(result);
    } catch (err) {
      console.error('WorkersDebug: Direct API error:', err);
      setDirectApiError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setDirectApiLoading(false);
    }
  };

  const testStoreRefresh = async () => {
    console.log('WorkersDebug: Testing store refresh...');
    await fetchWorkers();
  };

  useEffect(() => {
    // Test direct API call on mount
    testDirectAPI();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Workers Data Flow Debug
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)] space-y-6">
          
          {/* Test Controls */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">Test Controls</h3>
            <div className="flex space-x-3">
              <button
                onClick={testDirectAPI}
                disabled={directApiLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${directApiLoading ? 'animate-spin' : ''}`} />
                <span>Test Direct API</span>
              </button>
              
              <button
                onClick={testStoreRefresh}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh Store</span>
              </button>
            </div>
          </div>

          {/* Direct API Test Results */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-800">1. Direct API Call Test</h3>
              {directApiLoading && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
              {directApiResult && !directApiLoading && <CheckCircle className="h-4 w-4 text-green-600" />}
              {directApiError && !directApiLoading && <AlertCircle className="h-4 w-4 text-red-600" />}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              This tests the <code>getAllWorkers()</code> function directly from workersApi.ts
            </p>

            {directApiLoading && (
              <div className="text-blue-600">Loading...</div>
            )}

            {directApiError && (
              <div className="bg-red-50 border border-red-200 rounded p-3">
                <h4 className="font-medium text-red-800">Error:</h4>
                <p className="text-red-700 text-sm">{directApiError}</p>
              </div>
            )}

            {directApiResult && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <h4 className="font-medium text-green-800">
                  ✅ Success! Found {directApiResult.length} workers
                </h4>
                <div className="mt-2 bg-white rounded p-2 max-h-32 overflow-auto">
                  <pre className="text-xs">{JSON.stringify(directApiResult, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Store State */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <h3 className="text-lg font-semibold text-gray-800">2. Store State</h3>
              {loading && <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />}
              {!loading && workers.length > 0 && <CheckCircle className="h-4 w-4 text-green-600" />}
              {!loading && error && <AlertCircle className="h-4 w-4 text-red-600" />}
            </div>
            
            <p className="text-sm text-gray-600 mb-3">
              This shows the current state from useWorkerStore()
            </p>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="font-medium">Loading:</span>
                <span className={loading ? 'text-blue-600' : 'text-gray-600'}>{loading.toString()}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium">Workers Count:</span>
                <span className={workers.length > 0 ? 'text-green-600' : 'text-gray-600'}>{workers.length}</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="font-medium">Error:</span>
                <span className={error ? 'text-red-600' : 'text-gray-600'}>{error || 'None'}</span>
              </div>
            </div>

            {workers.length > 0 && (
              <div className="mt-3">
                <h4 className="font-medium text-gray-700 mb-2">Workers in Store:</h4>
                <div className="bg-gray-100 rounded p-2 max-h-32 overflow-auto">
                  <pre className="text-xs">{JSON.stringify(workers, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>

          {/* Environment Info */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">3. Environment Info</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="font-medium">Supabase URL:</span> 
                <span className="text-gray-600 ml-2">{import.meta.env.VITE_SUPABASE_URL || 'Not set'}</span>
              </div>
              <div>
                <span className="font-medium">Anon Key:</span> 
                <span className="text-gray-600 ml-2">{import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Not set'}</span>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">4. Comparison</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded p-3">
                <h4 className="font-medium text-blue-800">Edge Function (Working)</h4>
                <ul className="text-sm text-blue-700 mt-1 space-y-1">
                  <li>• Uses SERVICE_ROLE_KEY</li>
                  <li>• Bypasses RLS policies</li>
                  <li>• Server-side execution</li>
                  <li>• Full database access</li>
                </ul>
              </div>
              
              <div className="bg-orange-50 rounded p-3">
                <h4 className="font-medium text-orange-800">Client API (Testing)</h4>
                <ul className="text-sm text-orange-700 mt-1 space-y-1">
                  <li>• Uses ANON_KEY</li>
                  <li>• Subject to RLS policies</li>
                  <li>• Client-side execution</li>
                  <li>• Limited by security rules</li>
                </ul>
              </div>
            </div>
          </div>

        </div>
        
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            Close Debug
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorkersDebugModal;