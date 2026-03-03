import React, { useState } from 'react';
import { TeamMember } from '../../types';
import { X, Trash2, AlertTriangle, Lock, Pencil, Check } from 'lucide-react';
import { useDeleteTeamMember, useUpdateTeamMember } from '../../hooks/useTeamMembers';
import { useTasksQuery } from '../../hooks/useTasks';
import { useAuth } from '../../context/AuthContext';

interface TeamManageModalProps {
  onClose: () => void;
  teamMembers: TeamMember[];
  readOnly?: boolean;
}

const TeamManageModal: React.FC<TeamManageModalProps> = ({ onClose, teamMembers, readOnly = false }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [assignedTasksCount, setAssignedTasksCount] = useState(0);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const { currentWorker } = useAuth();
  const deleteTeamMemberMutation = useDeleteTeamMember();
  const updateTeamMemberMutation = useUpdateTeamMember();
  // Use the current user's context for visibility filtering
  const { data: tasks = [] } = useTasksQuery(currentWorker?.id, false);

  const startEditing = (member: TeamMember) => {
    if (readOnly) return;
    setEditingMemberId(member.id);
    setEditName(member.name);
    setEditEmail(member.email || '');
  };

  const cancelEditing = () => {
    setEditingMemberId(null);
    setEditName('');
    setEditEmail('');
  };

  const saveEdit = async () => {
    if (!editingMemberId || readOnly) return;
    if (!editName.trim()) return;

    setIsLoading(true);
    try {
      await updateTeamMemberMutation.mutateAsync({
        id: editingMemberId,
        updates: {
          name: editName.trim(),
          email: editEmail.trim() || null
        }
      });
      setEditingMemberId(null);
      setEditName('');
      setEditEmail('');
    } catch (error) {
      console.error('Error updating team member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkMemberTasks = async (member: TeamMember) => {
    if (readOnly) return;

    setIsLoading(true);
    try {
      // Use local tasks store instead of API call
      const memberTasks = tasks.filter(task => task.worker_id === member.id);
      setAssignedTasksCount(memberTasks.length);
      setSelectedMember(member);
      setShowDeleteConfirm(true);
    } catch (error) {
      console.error('Error checking team member tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember || readOnly) return;
    try {
      await deleteTeamMemberMutation.mutateAsync(selectedMember.id);
      setShowDeleteConfirm(false);
      setSelectedMember(null);
      setAssignedTasksCount(0);
    } catch (error) {
      console.error('Error deleting team member:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        {/* Fixed header */}
        <div className="flex justify-between items-center p-4 border-b flex-shrink-0">
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bogart font-medium text-charcoal">
              Manage Team
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
            className="text-gray-500 hover:text-gray-700 transition-colors p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-4 overflow-y-auto flex-1">
          {readOnly && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-700 text-sm">
                You are in read-only mode. Team management is disabled.
              </p>
            </div>
          )}

          {teamMembers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No team members available</p>
          ) : (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  {editingMemberId === member.id ? (
                    // Edit mode
                    <div className="flex-1 mr-2 space-y-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Team member name"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-margaux focus:border-margaux"
                        autoFocus
                      />
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="Email (optional)"
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-margaux focus:border-margaux"
                      />
                    </div>
                  ) : (
                    // Display mode
                    <div>
                      <div className="font-medium text-gray-900">{member.name}</div>
                      {member.email && (
                        <div className="text-sm text-gray-500">{member.email}</div>
                      )}
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    {editingMemberId === member.id ? (
                      // Save/Cancel buttons
                      <>
                        <button
                          onClick={saveEdit}
                          disabled={isLoading || !editName.trim()}
                          className="p-2 text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                          title="Save changes"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isLoading}
                          className="p-2 text-gray-600 hover:text-gray-700 transition-colors"
                          title="Cancel"
                        >
                          <X size={18} />
                        </button>
                      </>
                    ) : (
                      // Edit/Delete buttons
                      <>
                        <button
                          onClick={() => startEditing(member)}
                          disabled={isLoading || readOnly}
                          className={`p-2 transition-colors ${readOnly
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-margaux hover:text-blueberry'
                            } disabled:opacity-50`}
                          title={readOnly ? 'Read-only mode' : 'Edit Team Member'}
                        >
                          <Pencil size={18} />
                        </button>
                        <button
                          onClick={() => checkMemberTasks(member)}
                          disabled={isLoading || readOnly}
                          className={`p-2 transition-colors ${readOnly
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-700'
                            } disabled:opacity-50`}
                          title={readOnly ? 'Read-only mode' : 'Delete Team Member'}
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedMember && !readOnly && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-center mb-4 text-red-600">
              <AlertTriangle size={48} />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
              Delete Team Member
            </h3>
            <div className="text-gray-600 text-center mb-6 space-y-2">
              <p>
                Are you sure you want to delete {selectedMember.name}?
              </p>
              {assignedTasksCount > 0 && (
                <p className="text-amber-600 font-medium">
                  This team member has {assignedTasksCount} assigned {assignedTasksCount === 1 ? 'task' : 'tasks'} that will be unassigned.
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
                  setSelectedMember(null);
                  setAssignedTasksCount(0);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-margaux"
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

export default TeamManageModal;
