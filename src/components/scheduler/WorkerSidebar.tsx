import React from 'react';
import { Worker } from '../../types';
import { User, Check } from 'lucide-react';

interface WorkerSidebarProps {
  workers: Worker[];
  selectedWorkerId: string | null;
  onWorkerSelect: (workerId: string | null) => void;
}

const WorkerSidebar: React.FC<WorkerSidebarProps> = ({ 
  workers,
  selectedWorkerId,
  onWorkerSelect
}) => {
  return (
    <div className="w-44 min-w-44 border-r border-gray-200 bg-gray-50 flex flex-col">
      <div className="p-3 font-semibold text-gray-800 border-b border-gray-200 bg-gray-100">
        Workers
      </div>
      <div className="flex-1 overflow-y-auto">
        {workers.length === 0 ? (
          <div className="p-3 text-sm text-gray-500 italic">No workers available</div>
        ) : (
          workers.map((worker) => (
            <button
              key={worker.id}
              onClick={() => onWorkerSelect(worker.id === selectedWorkerId ? null : worker.id)}
              className={`w-full p-3 border-b border-gray-200 text-sm font-medium text-left flex items-center gap-2 hover:bg-gray-100 transition-colors
                ${selectedWorkerId === worker.id 
                  ? 'bg-blue-100 text-blue-800 shadow-sm' 
                  : 'text-gray-700'}`}
            >
              <User 
                size={16} 
                className={selectedWorkerId === worker.id ? 'text-blue-600' : 'text-gray-500'} 
              />
              <span className="flex-1">{worker.name}</span>
              {selectedWorkerId === worker.id && (
                <Check size={16} className="text-blue-600" />
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default WorkerSidebar;