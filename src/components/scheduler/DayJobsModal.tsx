import React from 'react';
import { format } from 'date-fns';
import { Job } from '../../types';
import { X } from 'lucide-react';
import DraggableJob from './DraggableJob';

interface DayJobsModalProps {
  date: Date;
  jobs: Job[];
  onClose: () => void;
  onJobClick: (job: Job) => void;
}

const DayJobsModal: React.FC<DayJobsModalProps> = ({
  date,
  jobs,
  onClose,
  onJobClick,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            Jobs for {format(date, 'MMMM d, yyyy')}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {jobs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No jobs scheduled for this day</p>
          ) : (
            <div className="space-y-2">
              {jobs.map(job => (
                <DraggableJob
                  key={job.id}
                  job={job}
                  onClick={() => {
                    onJobClick(job);
                    onClose();
                  }}
                  isScheduled={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayJobsModal;