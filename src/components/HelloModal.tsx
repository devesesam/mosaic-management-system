import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Database } from 'lucide-react';

interface HelloModalProps {
  onClose: () => void;
}

const HelloModal: React.FC<HelloModalProps> = ({ onClose }) => {
  const [workersData, setWorkersData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const apiUrl = `${supabaseUrl}/functions/v1/get-workers`;
      
      console.log('HelloModal: Calling edge function:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('HelloModal: Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('HelloModal: Received data:', data);
      
      setWorkersData(data);
    } catch (err) {
      console.error('HelloModal: Error fetching workers:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-indigo-600" />
            <h2 className="text-2xl font-bold text-gray-800">
              Workers Database Query
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="p-6 overflow-auto max-h-[calc(90vh-140px)]">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600">
              This data comes from a Supabase Edge Function querying the workers table:
            </p>
            <button
              onClick={fetchWorkers}
              disabled={loading}
              className="flex items-center space-x-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-3 text-gray-600">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span>Fetching workers data...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-red-800 font-medium mb-2">Error</h3>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {workersData && !loading && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-green-800 font-medium mb-1">✅ Success!</h3>
                <p className="text-green-700 text-sm">
                  {workersData.message || `Found ${workersData.count || 0} workers`}
                </p>
                <p className="text-green-600 text-xs mt-1">
                  Timestamp: {workersData.timestamp}
                </p>
              </div>

              {/* Raw JSON Display */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-2">Raw JSON Response:</h3>
                <div className="bg-gray-100 rounded-lg p-4 overflow-auto max-h-96">
                  <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                    {JSON.stringify(workersData, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Worker Summary Table */}
              {workersData.data && workersData.data.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Workers Summary:</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {workersData.data.map((worker: any) => (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">{worker.name}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{worker.email || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-gray-600">{worker.role || 'N/A'}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">
                              {new Date(worker.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelloModal;