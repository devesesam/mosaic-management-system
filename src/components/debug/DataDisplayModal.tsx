import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DataDisplayModalProps {
  onClose: () => void;
}

const DataDisplayModal: React.FC<DataDisplayModalProps> = ({ onClose }) => {
  const [data, setData] = useState<{
    jobs: any[];
    workers: any[];
    jobSecondaryWorkers: any[];
    loading: boolean;
    error: string | null;
  }>({
    jobs: [],
    workers: [],
    jobSecondaryWorkers: [],
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all jobs
        const { data: jobs, error: jobsError } = await supabase
          .from('jobs')
          .select('*');
          
        if (jobsError) {
          throw new Error(`Jobs error: ${jobsError.message}`);
        }

        // Fetch all workers
        const { data: workers, error: workersError } = await supabase
          .from('workers')
          .select('*');
          
        if (workersError) {
          throw new Error(`Workers error: ${workersError.message}`);
        }

        // Fetch all job_secondary_workers
        const { data: jobSecondaryWorkers, error: jsError } = await supabase
          .from('job_secondary_workers')
          .select('*');
          
        if (jsError) {
          throw new Error(`Secondary workers error: ${jsError.message}`);
        }

        setData({
          jobs: jobs || [],
          workers: workers || [],
          jobSecondaryWorkers: jobSecondaryWorkers || [],
          loading: false,
          error: null
        });
      } catch (error) {
        console.error('Error fetching data:', error);
        setData(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }));
      }
    };

    fetchData();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Database Raw Data</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {data.loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading data...</span>
            </div>
          ) : data.error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
              <div className="font-medium">Error fetching data</div>
              <div>{data.error}</div>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Workers ({data.workers.length})</h3>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                  {JSON.stringify(data.workers, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Jobs ({data.jobs.length})</h3>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                  {JSON.stringify(data.jobs, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Job Secondary Workers ({data.jobSecondaryWorkers.length})</h3>
                <pre className="bg-gray-50 p-4 rounded text-sm overflow-x-auto border border-gray-200">
                  {JSON.stringify(data.jobSecondaryWorkers, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataDisplayModal;