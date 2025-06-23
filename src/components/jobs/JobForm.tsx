import React, { useState, useEffect } from 'react';
import { Job, JobStatus, Worker } from '../../types';
import { useWorkerStore } from '../../store/workersStore';
import { X, Trash2, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

interface JobFormProps {
  onClose: () => void;
  onSubmit: (job: Omit<Job, 'id' | 'created_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialJob?: Job;
  readOnly?: boolean;
}

const JobForm: React.FC<JobFormProps> = ({ onClose, onSubmit, onDelete, initialJob, readOnly = false }) => {
  const { workers, loading: workersLoading, fetchWorkers } = useWorkerStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<Partial<Job>>({
    address: '',
    customer_name: '',
    quote_number: '',
    fascia_colour: '',
    spouting_colour: '',
    spouting_profile: '',
    roof_colour: '',
    roof_profile: '',
    downpipe_size: '',
    downpipe_colour: '',
    notes: '',
    worker_id: null,
    secondary_worker_ids: [],
    start_date: null,
    end_date: null,
    status: JobStatus.AwaitingOrder,
    tile_color: '#3b82f6'
  });

  // Initialize form with initial job data
  useEffect(() => {
    if (initialJob) {
      console.log('JobForm: Initializing with job:', initialJob);
      setFormData({
        ...initialJob,
        secondary_worker_ids: initialJob.secondary_worker_ids || []
      });
    }
  }, [initialJob]);

  // Fetch workers when form opens
  useEffect(() => {
    console.log('JobForm: Fetching workers...');
    fetchWorkers();
  }, [fetchWorkers]);

  // Debug workers data
  useEffect(() => {
    console.log(`JobForm: ${workers.length} workers available for assignment`);
  }, [workers]);

  // Show read-only warning if needed
  useEffect(() => {
    if (readOnly && initialJob) {
      console.log('JobForm: Opening in read-only mode');
    }
  }, [readOnly, initialJob]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (readOnly) return;
    
    const { name, value } = e.target;
    
    // CRITICAL: If worker_id is being set to null/empty, also clear secondary workers
    if (name === 'worker_id') {
      if (!value || value === '') {
        console.log('JobForm: Primary worker cleared - clearing secondary workers');
        setFormData(prev => ({ 
          ...prev, 
          [name]: null,
          secondary_worker_ids: []
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;
    
    const { name, value } = e.target;
    if (!value) {
      setFormData(prev => ({ ...prev, [name]: null }));
      return;
    }
    // Set time to 9:00 for start_date and 17:00 for end_date
    const date = new Date(value);
    if (name === 'start_date') {
      date.setHours(9, 0, 0, 0);
    } else if (name === 'end_date') {
      date.setHours(17, 0, 0, 0);
    }
    setFormData(prev => ({ ...prev, [name]: date.toISOString() }));
  };

  const handleSecondaryWorkerToggle = (workerId: string) => {
    if (readOnly) return;
    
    // Prevent adding secondary workers if no primary worker is assigned
    if (!formData.worker_id) {
      toast.error('Please assign a primary worker before adding secondary workers');
      return;
    }
    
    setFormData(prev => {
      const currentIds = prev.secondary_worker_ids || [];
      const newIds = currentIds.includes(workerId)
        ? currentIds.filter(id => id !== workerId)
        : [...currentIds, workerId];
      
      return {
        ...prev,
        secondary_worker_ids: newIds
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || readOnly) return;
    
    console.log('JobForm: Submitting job data:', formData);
    
    // Validate required fields
    if (!formData.address?.trim()) {
      toast.error('Job address is required');
      return;
    }
    
    // CRITICAL: Ensure secondary workers are cleared if no primary worker
    let finalFormData = { ...formData };
    if (!finalFormData.worker_id) {
      console.log('JobForm: No primary worker - ensuring secondary workers are cleared');
      finalFormData.secondary_worker_ids = [];
    }
    
    try {
      setIsSubmitting(true);
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });
      
      await Promise.race([
        onSubmit(finalFormData as Omit<Job, 'id' | 'created_at'>),
        timeoutPromise
      ]);
      
      onClose();
    } catch (error) {
      console.error('Error submitting job:', error);
      
      // More specific error messages
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          toast.error('Request timed out. Please try again.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`Failed to ${initialJob ? 'update' : 'create'} job: ${error.message}`);
        }
      } else {
        toast.error(initialJob ? 'Failed to update job' : 'Failed to create job');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialJob || !onDelete || readOnly) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialJob.id);
      onClose();
    } catch (error) {
      console.error('Error deleting job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableSecondaryWorkers = workers.filter(w => w.id !== formData.worker_id);

  const modalTitle = readOnly 
    ? 'View Job Details' 
    : (initialJob ? 'Edit Job' : 'New Job');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            {readOnly && <Eye className="h-5 w-5 text-gray-500" />}
            <h2 className="text-xl font-semibold text-gray-800">
              {modalTitle}
            </h2>
            {readOnly && (
              <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded text-xs font-medium">
                Read Only
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            disabled={isSubmitting}
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Job Address*
              </label>
              <input
                type="text"
                name="address"
                required
                value={formData.address || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Customer Name
              </label>
              <input
                type="text"
                name="customer_name"
                value={formData.customer_name || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quote Number
              </label>
              <input
                type="text"
                name="quote_number"
                value={formData.quote_number || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Fascia Colour
              </label>
              <input
                type="text"
                name="fascia_colour"
                value={formData.fascia_colour || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spouting Colour
              </label>
              <input
                type="text"
                name="spouting_colour"
                value={formData.spouting_colour || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Spouting Profile
              </label>
              <input
                type="text"
                name="spouting_profile"
                value={formData.spouting_profile || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Roof Colour
              </label>
              <input
                type="text"
                name="roof_colour"
                value={formData.roof_colour || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Roof Profile
              </label>
              <input
                type="text"
                name="roof_profile"
                value={formData.roof_profile || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Downpipe Size
              </label>
              <input
                type="text"
                name="downpipe_size"
                value={formData.downpipe_size || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Downpipe Colour
              </label>
              <input
                type="text"
                name="downpipe_colour"
                value={formData.downpipe_colour || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lead Worker
              </label>
              {workersLoading ? (
                <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-500">
                  Loading workers...
                </div>
              ) : (
                <select
                  name="worker_id"
                  value={formData.worker_id || ''}
                  onChange={handleChange}
                  disabled={isSubmitting || readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                    isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
                >
                  <option value="">Select Worker</option>
                  {workers.map((worker: Worker) => (
                    <option key={worker.id} value={worker.id}>
                      {worker.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Secondary Workers
                {!formData.worker_id && (
                  <span className="text-xs text-amber-600 ml-1">(Requires primary worker)</span>
                )}
              </label>
              <div className="mt-1 border rounded-md divide-y max-h-48 overflow-y-auto">
                {workersLoading ? (
                  <div className="p-3 text-sm text-gray-500 italic">
                    Loading workers...
                  </div>
                ) : workers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 italic">
                    No workers available. Add workers first.
                  </div>
                ) : !formData.worker_id ? (
                  <div className="p-3 text-sm text-amber-600 italic">
                    Please select a primary worker first.
                  </div>
                ) : (
                  availableSecondaryWorkers.map((worker) => (
                    <label
                      key={worker.id}
                      className={`flex items-center px-3 py-2 hover:bg-gray-50 ${
                        readOnly ? 'cursor-default' : 'cursor-pointer'
                      } ${isSubmitting || readOnly ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.secondary_worker_ids?.includes(worker.id) || false}
                        onChange={() => !readOnly && !isSubmitting && handleSecondaryWorkerToggle(worker.id)}
                        disabled={isSubmitting || readOnly}
                        className={`h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded ${
                          isSubmitting || readOnly ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {worker.name}
                      </span>
                    </label>
                  ))
                )}
                {availableSecondaryWorkers.length === 0 && workers.length > 0 && formData.worker_id && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No additional workers available
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status || JobStatus.AwaitingOrder}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                {Object.values(JobStatus).map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start Date
              </label>
              <input
                type="date"
                name="start_date"
                value={formData.start_date ? format(new Date(formData.start_date), 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End Date
              </label>
              <input
                type="date"
                name="end_date"
                value={formData.end_date ? format(new Date(formData.end_date), 'yyyy-MM-dd') : ''}
                onChange={handleDateChange}
                min={formData.start_date ? format(new Date(formData.start_date), 'yyyy-MM-dd') : undefined}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tile Color
              </label>
              <div className="mt-1 grid grid-cols-8 gap-2">
                {colorOptions.map((color) => (
                  <div 
                    key={color}
                    className={`w-8 h-8 rounded-full transition-transform ${
                      readOnly || isSubmitting 
                        ? 'cursor-not-allowed opacity-50' 
                        : 'cursor-pointer hover:scale-110'
                    } ${
                      formData.tile_color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => !readOnly && !isSubmitting && setFormData(prev => ({ ...prev, tile_color: color }))}
                  />
                ))}
              </div>
            </div>
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                  isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              />
            </div>
          </div>
          
          <div className="flex justify-between space-x-3 pt-3 border-t">
            {initialJob && onDelete && !readOnly && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Job
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.address?.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      {initialJob ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    initialJob ? 'Update Job' : 'Create Job'
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Job
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete this job? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const colorOptions = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
];

export default JobForm;