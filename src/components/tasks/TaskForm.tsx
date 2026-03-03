import React, { useState, useEffect } from 'react';
import { Task, TaskStatus, TeamMember } from '../../types';
import { useTeamMembersQuery } from '../../hooks/useTeamMembers';
import { X, Trash2, AlertTriangle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { logger } from '../../utils/logger';
import { validateTaskForm } from '../../schemas/task';

interface TaskFormProps {
  onClose: () => void;
  onSubmit: (task: Omit<Task, 'id' | 'created_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialTask?: Task;
  readOnly?: boolean;
}

const TaskForm: React.FC<TaskFormProps> = ({ onClose, onSubmit, onDelete, initialTask, readOnly = false }) => {
  const { data: teamMembers = [], isLoading: teamLoading } = useTeamMembersQuery();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<Task>>({
    name: '',
    notes: '',
    worker_id: null,
    secondary_worker_ids: [],
    start_date: null,
    end_date: null,
    status: TaskStatus.NotStarted,
    tile_color: '#345981',
    is_visible: true
  });

  // Initialize form with initial task data
  useEffect(() => {
    if (initialTask) {
      logger.debug('TaskForm: Initializing with task:', initialTask);
      setFormData({
        ...initialTask,
        secondary_worker_ids: initialTask.secondary_worker_ids || [],
        is_visible: initialTask.is_visible !== false // default true if undefined
      });
    }
  }, [initialTask]);

  // Debug team members data
  useEffect(() => {
    console.log(`TaskForm: ${teamMembers.length} team members available for assignment`);
  }, [teamMembers]);

  // Show read-only warning if needed
  useEffect(() => {
    if (readOnly && initialTask) {
      logger.debug('TaskForm: Opening in read-only mode');
    }
  }, [readOnly, initialTask]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (readOnly) return;

    const { name, value } = e.target;

    // CRITICAL: If worker_id is being set to null/empty, also clear secondary workers
    if (name === 'worker_id') {
      if (!value || value === '') {
        logger.debug('TaskForm: Primary worker cleared - clearing secondary workers and setting public');
        setFormData(prev => ({
          ...prev,
          [name]: null,
          secondary_worker_ids: [],
          is_visible: true // Force public if unassigned
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

    logger.debug('TaskForm: Submitting task data:', formData);

    // CRITICAL: Ensure secondary workers are cleared if no primary worker
    let finalFormData = { ...formData };
    if (!finalFormData.worker_id) {
      logger.debug('TaskForm: No primary worker - ensuring secondary workers are cleared and task is public');
      finalFormData.secondary_worker_ids = [];
      finalFormData.is_visible = true;
    }

    // Validate using Zod schema
    const validation = validateTaskForm(finalFormData);
    if (!validation.success) {
      // Show first validation error
      const firstError = Object.values(validation.errors)[0];
      toast.error(firstError || 'Please fix validation errors');
      logger.debug('TaskForm: Validation errors:', validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 30000); // 30 second timeout
      });

      await Promise.race([
        onSubmit(finalFormData as Omit<Task, 'id' | 'created_at'>),
        timeoutPromise
      ]);

      onClose();
    } catch (error) {
      logger.error('Error submitting task:', error);

      // More specific error messages
      if (error instanceof Error) {
        if (error.message === 'Request timeout') {
          toast.error('Request timed out. Please try again.');
        } else if (error.message.includes('network')) {
          toast.error('Network error. Please check your connection and try again.');
        } else {
          toast.error(`Failed to ${initialTask ? 'update' : 'create'} task: ${error.message}`);
        }
      } else {
        toast.error(initialTask ? 'Failed to update task' : 'Failed to create task');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialTask || !onDelete || readOnly) return;
    try {
      setIsSubmitting(true);
      await onDelete(initialTask.id);
      onClose();
    } catch (error) {
      logger.error('Error deleting task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableSecondaryTeamMembers = teamMembers.filter(m => m.id !== formData.worker_id);

  const modalTitle = readOnly
    ? 'View Task Details'
    : (initialTask ? 'Edit Task' : 'New Task');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            {readOnly && <Eye className="h-5 w-5 text-gray-500" />}
            <h2 className="text-xl font-bogart font-medium text-charcoal">
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
                Task Name*
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name || ''}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Lead Team Member
              </label>
              {teamLoading ? (
                <div className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 bg-gray-100 text-gray-500">
                  Loading team members...
                </div>
              ) : (
                <select
                  name="worker_id"
                  value={formData.worker_id || ''}
                  onChange={handleChange}
                  disabled={isSubmitting || readOnly}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                >
                  <option value="">Select Team Member</option>
                  {teamMembers.map((member: TeamMember) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                name="status"
                value={formData.status || TaskStatus.NotStarted}
                onChange={handleChange}
                disabled={isSubmitting || readOnly}
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              >
                {Object.values(TaskStatus).map((status) => (
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
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
                    className={`w-8 h-8 rounded-full transition-transform ${readOnly || isSubmitting
                        ? 'cursor-not-allowed opacity-50'
                        : 'cursor-pointer hover:scale-110'
                      } ${formData.tile_color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                    style={{ backgroundColor: color }}
                    onClick={() => !readOnly && !isSubmitting && setFormData(prev => ({ ...prev, tile_color: color }))}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Secondary Team Members
                {!formData.worker_id && (
                  <span className="text-xs text-amber-600 ml-1">(Requires primary team member)</span>
                )}
              </label>
              <div className="mt-1 border rounded-md divide-y max-h-48 overflow-y-auto">
                {teamLoading ? (
                  <div className="p-3 text-sm text-gray-500 italic">
                    Loading team members...
                  </div>
                ) : teamMembers.length === 0 ? (
                  <div className="p-3 text-sm text-gray-500 italic">
                    No team members available. Add team members first.
                  </div>
                ) : !formData.worker_id ? (
                  <div className="p-3 text-sm text-amber-600 italic">
                    Please select a primary team member first.
                  </div>
                ) : (
                  availableSecondaryTeamMembers.map((member) => (
                    <label
                      key={member.id}
                      className={`flex items-center px-3 py-2 hover:bg-gray-50 ${readOnly ? 'cursor-default' : 'cursor-pointer'
                        } ${isSubmitting || readOnly ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.secondary_worker_ids?.includes(member.id) || false}
                        onChange={() => !readOnly && !isSubmitting && handleSecondaryWorkerToggle(member.id)}
                        disabled={isSubmitting || readOnly}
                        className={`h-4 w-4 text-blueberry focus:ring-margaux border-gray-300 rounded ${isSubmitting || readOnly ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {member.name}
                      </span>
                    </label>
                  ))
                )}
                {availableSecondaryTeamMembers.length === 0 && teamMembers.length > 0 && formData.worker_id && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    No additional team members available
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-1 md:col-span-2 flex items-center mt-2 mb-2">
              <label className={`flex items-center cursor-pointer ${isSubmitting || readOnly || !formData.worker_id ? 'opacity-50' : ''}`}>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={formData.is_visible !== false}
                    onChange={(e) => !readOnly && !isSubmitting && formData.worker_id && setFormData(prev => ({ ...prev, is_visible: e.target.checked }))}
                    disabled={isSubmitting || readOnly || !formData.worker_id}
                    className="sr-only"
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${(formData.is_visible !== false) ? 'bg-blueberry' : 'bg-gray-300'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${(formData.is_visible !== false) ? 'transform translate-x-4' : ''}`}></div>
                </div>
                <div className="ml-3 text-sm font-medium text-gray-700">
                  Visible to everyone
                  {!formData.worker_id && (
                    <span className="text-xs text-amber-600 block font-normal">Requires a primary team member</span>
                  )}
                  {formData.worker_id && formData.is_visible === false && (
                    <span className="text-xs text-margaux block font-normal">Private to assigned workers</span>
                  )}
                </div>
              </label>
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
                className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-margaux focus:ring-margaux sm:text-sm border p-2 ${isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
                  }`}
              />
            </div>
          </div>

          <div className="flex justify-between space-x-3 pt-3 border-t">
            {initialTask && onDelete && !readOnly && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Task
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </button>
              {!readOnly && (
                <button
                  type="submit"
                  disabled={isSubmitting || !formData.name?.trim()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blueberry hover:bg-blueberry/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <span className="flex items-center">
                      <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      </div>
                      {initialTask ? 'Updating...' : 'Creating...'}
                    </span>
                  ) : (
                    initialTask ? 'Update Task' : 'Create Task'
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
              Delete Task
            </h3>
            <p className="text-gray-600 text-center mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux disabled:opacity-50"
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
  '#345981', // blueberry (brand primary)
  '#477296', // margaux (brand accent)
  '#B96129', // saffron (brand accent)
  '#A65628', // cinnamon (brand secondary)
  '#94B0B3', // seafoam (brand secondary)
  '#3A4750', // aubergine (brand dark)
  '#E2C1A4', // sorbet (brand secondary)
  '#333333', // charcoal (brand text)
  '#ef4444', // red (utility)
  '#22c55e', // green (utility)
  '#f59e0b', // amber (utility)
  '#8b5cf6', // violet (utility)
  '#ec4899', // pink (utility)
  '#06b6d4', // cyan (utility)
  '#84cc16', // lime (utility)
  '#f97316', // orange (utility)
];

export default TaskForm;
