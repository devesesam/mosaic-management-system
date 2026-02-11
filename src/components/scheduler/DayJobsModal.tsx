import React from 'react';
import { format } from 'date-fns';
import { Job } from '../../types';
import { X } from 'lucide-react';
import DraggableJob from './DraggableJob';
import { useWorkerStore } from '../../store/workersStore';

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
  const { workers } = useWorkerStore();

  // Helper function to get worker names for a job
  const getWorkerAssignments = (job: Job) => {
    const primaryWorker = job.worker_id 
      ? workers.find(w => w.id === job.worker_id)
      : null;
    
    const secondaryWorkers = job.secondary_worker_ids
      ? workers.filter(w => job.secondary_worker_ids!.includes(w.id))
      : [];

    return { primaryWorker, secondaryWorkers };
  };

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
            <div className="space-y-3">
              {jobs.map(job => {
                const { primaryWorker, secondaryWorkers } = getWorkerAssignments(job);
                
                return (
                  <div
                    key={job.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      onJobClick(job);
                      onClose();
                    }}
                  >
                    {/* Job tile for visual reference */}
                    <div className="mb-3">
                      <DraggableJob
                        job={job}
                        onClick={() => {
                          onJobClick(job);
                          onClose();
                        }}
                        isScheduled={false}
                        readOnly={true}
                      />
                    </div>
                    
                    {/* Worker assignment information */}
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Assigned to: </span>
                      {!primaryWorker && (!secondaryWorkers || secondaryWorkers.length === 0) ? (
                        <span className="text-gray-500 italic">Unassigned</span>
                      ) : (
                        <span>
                          {/* Primary worker in bold */}
                          {primaryWorker && (
                            <span className="font-bold">{primaryWorker.name}</span>
                          )}
                          
                          {/* Secondary workers in normal font */}
                          {secondaryWorkers && secondaryWorkers.length > 0 && (
                            <>
                              {primaryWorker && ', '}
                              {secondaryWorkers.map((worker, index) => (
                                <span key={worker.id}>
                                  {worker.name}
                                  {index < secondaryWorkers.length - 1 && ', '}
                                </span>
                              ))}
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DayJobsModal;