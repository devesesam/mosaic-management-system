import React from 'react';
import { format } from 'date-fns';
import { Job } from '../../types';
import { X } from 'lucide-react';
import DraggableJob from './DraggableJob';
import { useTeamStore } from '../../store/teamStore';

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
  const { teamMembers } = useTeamStore();

  // Helper function to get team member names for a job
  const getTeamAssignments = (job: Job) => {
    const primaryMember = job.worker_id
      ? teamMembers.find(m => m.id === job.worker_id)
      : null;

    const secondaryMembers = job.secondary_worker_ids
      ? teamMembers.filter(m => job.secondary_worker_ids!.includes(m.id))
      : [];

    return { primaryMember, secondaryMembers };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bogart font-medium text-charcoal">
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
                const { primaryMember, secondaryMembers } = getTeamAssignments(job);

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

export default DayJobsModal;