import React from 'react';
import { format } from 'date-fns';
import { Task } from '../../types';
import { X } from 'lucide-react';
import DraggableTask from './DraggableTask';
import { useTeamStore } from '../../store/teamStore';

interface DayTasksModalProps {
  date: Date;
  tasks: Task[];
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const DayTasksModal: React.FC<DayTasksModalProps> = ({
  date,
  tasks,
  onClose,
  onTaskClick,
}) => {
  const { teamMembers } = useTeamStore();

  // Helper function to get team member names for a task
  const getTeamAssignments = (task: Task) => {
    const primaryMember = task.worker_id
      ? teamMembers.find(m => m.id === task.worker_id)
      : null;

    const secondaryMembers = task.secondary_worker_ids
      ? teamMembers.filter(m => task.secondary_worker_ids!.includes(m.id))
      : [];

    return { primaryMember, secondaryMembers };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bogart font-medium text-charcoal">
            Tasks for {format(date, 'MMMM d, yyyy')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {tasks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No tasks scheduled for this day</p>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const { primaryMember, secondaryMembers } = getTeamAssignments(task);

                return (
                  <div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => {
                      onTaskClick(task);
                      onClose();
                    }}
                  >
                    {/* Task tile for visual reference */}
                    <div className="mb-3">
                      <DraggableTask
                        task={task}
                        onClick={() => {
                          onTaskClick(task);
                          onClose();
                        }}
                        isScheduled={false}
                        readOnly={true}
                      />
                    </div>

                    {/* Team member assignment information */}
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">Assigned to: </span>
                      {!primaryMember && (!secondaryMembers || secondaryMembers.length === 0) ? (
                        <span className="text-gray-500 italic">Unassigned</span>
                      ) : (
                        <span>
                          {/* Primary team member in bold */}
                          {primaryMember && (
                            <span className="font-bold">{primaryMember.name}</span>
                          )}

                          {/* Secondary team members in normal font */}
                          {secondaryMembers && secondaryMembers.length > 0 && (
                            <>
                              {primaryMember && ', '}
                              {secondaryMembers.map((member, index) => (
                                <span key={member.id}>
                                  {member.name}
                                  {index < secondaryMembers.length - 1 && ', '}
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

export default DayTasksModal;

// Backwards compatibility
export { DayTasksModal as DayJobsModal };
