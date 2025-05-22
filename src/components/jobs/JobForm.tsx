import React, { useState, useEffect } from 'react';
import { Job, JobStatus, Worker } from '../../types';
import { useWorkerStore } from '../../store/workerStore';
import { X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react';
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
  const { workers, fetchWorkers } = useWorkerStore();
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
      setFormData({
        ...initialJob,
        secondary_worker_ids: initialJob.secondary_worker_ids || []
      });
    }
  }, [initialJob]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (readOnly) return;
    const { name, value } = e.target;
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
    if (readOnly || isSubmitting) return;
    
    try {
      setIsSubmitting(true);
      await onSubmit(formData as Omit<Job, 'id' | 'created_at'>);
      toast.success(initialJob ? 'Job updated successfully' : 'Job created successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting job:', error);
      toast.error(initialJob ? 'Failed to update job' : 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (readOnly || !initialJob || !onDelete) return;
    try {
      await onDelete(initialJob.id);
      toast.success('Job deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting job:', error);
      toast.error('Failed to delete job');
    }
  };

  const availableSecondaryWorkers = workers.filter(w => w.id !== formData.worker_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold text-gray-800">
              {initialJob ? (readOnly ? 'View Job' : 'Edit Job') : 'New Job'}
            </h2>
            {readOnly && (
              <div className="ml-3 flex items-center bg-amber-100 text-amber-800 rounded-full px-3 py-1 text-xs">
                <ShieldAlert size={14} className="mr-1" />
                Read Only
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lead Worker
              </label>
              <select
                name="worker_id"
                value={formData.worker_id || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              >
                <option value="">Select Worker</option>
                {workers.map((worker: Worker) => (
                  <option key={worker.id} value={worker.id}>
                    {worker.name}
                    {worker.role === 'viewer' ? ' (View Only)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Secondary Workers
              </label>
              <div className="mt-1 border rounded-md divide-y max-h-48 overflow-y-auto">
                {availableSecondaryWorkers.map((worker) => (
                  <label
                    key={worker.id}
                    className={`flex items-center px-3 py-2 hover:bg-gray-50 ${readOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.secondary_worker_ids?.includes(worker.id) || false}
                      onChange={() => handleSecondaryWorkerToggle(worker.id)}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      disabled={readOnly}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      {worker.name}
                      {worker.role === 'viewer' ? ' (View Only)' : ''}
                    </span>
                  </label>
                ))}
                {availableSecondaryWorkers.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No workers available
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              />
            </div>

            {!readOnly && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Tile Color
                </label>
                <div className="mt-1 grid grid-cols-8 gap-2">
                  {colorOptions.map((color) => (
                    <div 
                      key={color}
                      className={`w-8 h-8 rounded-full cursor-pointer hover:scale-110 transition-transform ${
                        formData.tile_color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, tile_color: color }))}
                    />
                  ))}
                </div>
              </div>
            )}
            
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                rows={3}
                value={formData.notes || ''}
                onChange={handleChange}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${readOnly ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                disabled={readOnly}
              />
            </div>
          </div>
          
          <div className="flex justify-between space-x-3 pt-3 border-t">
            {initialJob && onDelete && !readOnly && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Job
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
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
      {showDeleteConfirm && (
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