import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Worker } from '../../types';

interface WorkerFormProps {
  onClose: () => void;
  onSubmit: (worker: Omit<Worker, 'id' | 'created_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialWorker?: Worker;
}

const WorkerForm: React.FC<WorkerFormProps> = ({ onClose, onSubmit, onDelete, initialWorker }) => {
  const [worker, setWorker] = useState({
    name: initialWorker?.name || '',
    email: initialWorker?.email || '',
    phone: initialWorker?.phone || '',
    role: 'admin' // All workers are now admins
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(worker);
    onClose();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setWorker(prev => ({ ...prev, [name]: value }));
  };

  const handleDelete = async () => {
    if (!initialWorker || !onDelete) return;
    
    if (window.confirm('Are you sure you want to delete this worker? This action cannot be undone.')) {
      try {
        await onDelete(initialWorker.id);
        onClose();
      } catch (error) {
        console.error('Error deleting worker:', error);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {initialWorker ? 'Edit Worker' : 'Add New Worker'}
          </h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name*
            </label>
            <input
              type="text"
              name="name"
              required
              value={worker.name}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={worker.email}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={worker.phone}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          
          {/* Role field removed - all users are now admins */}
          
          <div className="flex justify-between space-x-3 pt-4 border-t">
            {initialWorker && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 flex items-center"
              >
                <Trash2 size={16} className="mr-2" />
                Delete Worker
              </button>
            )}
            <div className="flex space-x-3 ml-auto">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {initialWorker ? 'Update Worker' : 'Add Worker'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default WorkerForm;