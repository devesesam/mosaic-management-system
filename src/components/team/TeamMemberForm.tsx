import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { TeamMember } from '../../types';

interface TeamMemberFormProps {
  onClose: () => void;
  onSubmit: (teamMember: Omit<TeamMember, 'id' | 'created_at'>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  initialTeamMember?: TeamMember;
  readOnly?: boolean;
}

const TeamMemberForm: React.FC<TeamMemberFormProps> = ({ onClose, onSubmit, onDelete, initialTeamMember, readOnly = false }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMember, setTeamMember] = useState({
    name: initialTeamMember?.name || '',
    email: initialTeamMember?.email || '',
    phone: initialTeamMember?.phone || '',
    role: 'admin' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || readOnly) return;

    // Validate form
    if (!teamMember.name.trim()) {
      setError("Team member name is required");
      return;
    }

    if (!teamMember.email.trim()) {
      setError("Email address is required");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(teamMember.email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      console.log('TeamMemberForm: Submitting team member data:', teamMember);
      await onSubmit(teamMember);
      console.log('TeamMemberForm: Team member submitted successfully');
      onClose();
    } catch (error) {
      console.error('Error submitting team member:', error);

      // Handle specific error messages from the server
      if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('duplicate') || message.includes('already exists') || message.includes('unique constraint')) {
          setError(`A team member with email "${teamMember.email}" already exists. Please use a different email address.`);
        } else {
          setError(error.message);
        }
      } else {
        setError("Failed to add team member. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (readOnly) return;

    const { name, value } = e.target;
    setTeamMember(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
  };

  const modalTitle = readOnly
    ? 'View Team Member Details'
    : (initialTeamMember ? 'Edit Team Member' : 'Add New Team Member');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center space-x-2">
            {readOnly && <Lock className="h-5 w-5 text-gray-500" />}
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
          {readOnly && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm">
                You are in read-only mode. Team member details cannot be modified.
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Name*
            </label>
            <input
              type="text"
              name="name"
              required
              value={teamMember.name}
              onChange={handleChange}
              disabled={isSubmitting || readOnly}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email*
            </label>
            <input
              type="email"
              name="email"
              required
              value={teamMember.email || ''}
              onChange={handleChange}
              disabled={isSubmitting || readOnly}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Phone
            </label>
            <input
              type="tel"
              name="phone"
              value={teamMember.phone || ''}
              onChange={handleChange}
              disabled={isSubmitting || readOnly}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2 ${
                isSubmitting || readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
              }`}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="submit"
                disabled={isSubmitting || !teamMember.name.trim() || !teamMember.email.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <div className="animate-spin -ml-1 mr-2 h-4 w-4 text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                    {initialTeamMember ? 'Updating...' : 'Adding...'}
                  </span>
                ) : (
                  initialTeamMember ? 'Update Team Member' : 'Add Team Member'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamMemberForm;
