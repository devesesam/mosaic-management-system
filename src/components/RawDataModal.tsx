import React from 'react';
import { X } from 'lucide-react';

interface RawDataModalProps {
  data: any;
  onClose: () => void;
  title?: string;
}

const RawDataModal: React.FC<RawDataModalProps> = ({ data, onClose, title = "Raw Data Debug" }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 overflow-auto max-h-[calc(80vh-80px)]">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-700 mb-2">Raw JSON Response:</h3>
            <p className="text-sm text-gray-600 mb-4">
              This shows the exact data returned from the getAllWorkers() function call.
            </p>
          </div>
          
          <div className="bg-gray-100 rounded-lg p-4 overflow-auto">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-1">Debug Info:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Data type: {typeof data}</li>
              <li>• Is array: {Array.isArray(data) ? 'Yes' : 'No'}</li>
              <li>• Length: {Array.isArray(data) ? data.length : 'N/A'}</li>
              <li>• Is null/undefined: {data == null ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end p-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default RawDataModal;