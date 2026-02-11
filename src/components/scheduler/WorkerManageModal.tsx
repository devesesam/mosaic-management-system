import React, { useState } from 'react';
import { Worker } from '../../types';
import { X, Trash2, AlertTriangle, Lock } from 'lucide-react';
import { useWorkerStore } from '../../store/workersStore';
import { getJobsForWorker } from '../../api/jobsApi';

interface WorkerManageModalProps {
  onClose: () => void;
  workers: Worker[];
  readOnly?: boolean;
}

const WorkerManageModal: React.FC<WorkerManageModalProps> = ({ onClose, workers, readOnly = false }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<Worker | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedJobsCount, setAssignedJobsCount] = useState(0);
  const { deleteWorker } = useWorkerStore();

  const checkWorkerJobs = async (worker: Worker) => {
    if (readOnly) return;
    
    setIsLoading(true);
    try {
      const jobs = await getJobsForWorker(worker.id);
      setAssignedJobsCount(jobs.length);
      setSelectedWorker(worker);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error checking worker jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedWorker || readOnly) return;
    try {
      await deleteWorker(selectedWorker.id);
      setShowDeleteConfirm(false);
      setSelectedWorker(null);
      setAssignedJobsCount(0);
    } catch (error) {
      console.error('Error deleting worker:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-semibold text-gray-800">
              Manage Workers
            </h2>
            {readOnly && (
              <div className="flex items-center text-amber-600">
                <Lock className="h-4 w-4 mr-1" />
                <span className="text-sm">Read Only</span>
              </div>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4">
          {readOnly && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm">
                You are in read-only mode. Worker management is disabled.
              </p>
            </div>
          )}
          
          {workers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No workers available</p>
          ) : (
            <div className="space-y-2">
              {workers.map((worker) => (
                <div
                  key={worker.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <div className="font-medium text-gray-900">{worker.name}</div>
                    {worker.email && (
                      <div className="text-sm text-gray-500">{worker.email}</div>
                    )}
                  </div>
                  <button
                    onClick={() => checkWorkerJobs(worker)}
                    disabled={isLoading || readOnly}
                    className={`p-2 transition-colors ${
                      readOnly 
                        ? 'text-gray-400 cursor-not-allowed' 
                        : 'text-red-600 hover:text-red-700'
                    } disabled:opacity-50`}
                    title={readOnly ? 'Read-only mode' : 'Delete Worker'}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWorker && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Worker
            </h3>
            <div className="text-gray-600 text-center mb-6 space-y-2">
              <p>
                Are you sure you want to delete {selectedWorker.name}?
              </p>
              {assignedJobsCount > 0 && (
                <p className="text-amber-600 font-medium">
                  This worker has {assignedJobsCount} assigned {assignedJobsCount === 1 ? 'job' : 'jobs'} that will be unassigned.
                </p>
              )}
              <p className="text-sm">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedWorker(null);
                  setAssignedJobsCount(0);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerManageModal;