import React from 'react';
import { format, isToday, isSameDay, parseISO } from 'date-fns';
import { Job, TeamMember } from '../../types';
import DraggableJob from './DraggableJob';
import { Eye } from 'lucide-react';

interface MasterRowProps {
  days: Date[];
  allJobs: Job[];
  teamMembers: TeamMember[];
  onJobClick: (job: Job) => void;
}

const MasterRow: React.FC<MasterRowProps> = ({
  days,
  allJobs,
  teamMembers,
  onJobClick,
}) => {
  // Get team member name by ID
  const getTeamMemberName = (workerId: string | null): string => {
    if (!workerId) return 'Unassigned';
    const member = teamMembers.find(m => m.id === workerId);
    return member?.name || 'Unknown';
  };

  // Get all scheduled jobs (jobs with start_date)
  const scheduledJobs = React.useMemo(() => {
    return allJobs.filter(job => job.start_date);
  }, [allJobs]);

  // Calculate which jobs should render on which days
  const renderingData = React.useMemo(() => {
    const data: Array<{
      job: Job;
      renderDay: Date;
      dayIndex: number;
      span: number;
      stackIndex: number;
    }> = [];

    // Sort jobs by start date for consistent stacking
    const sortedJobs = [...scheduledJobs].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    });

    // Track stack positions for each day
    const dayStacks: { [key: string]: Array<{
      job: Job;
      span: number;
      stackIndex: number;
    }> } = {};

    sortedJobs.forEach(job => {
      if (!job.start_date) return;

      try {
        const jobStartDate = parseISO(job.start_date);
        const jobEndDate = job.end_date ? parseISO(job.end_date) : jobStartDate;

        // Find which day this job should render on
        let renderDay: Date | null = null;
        let renderDayIndex = -1;

        // Check if job starts within this week
        const startDayIndex = days.findIndex(day => isSameDay(day, jobStartDate));
        if (startDayIndex >= 0) {
          renderDay = days[startDayIndex];
          renderDayIndex = startDayIndex;
        } else if (jobStartDate < days[0] && jobEndDate >= days[0]) {
          // Job started before this week but extends into it
          renderDay = days[0];
          renderDayIndex = 0;
        }

        if (renderDay && renderDayIndex >= 0) {
          // Calculate span
          const endDayIndex = days.findIndex(day => isSameDay(day, jobEndDate));
          let span: number;

          if (endDayIndex >= 0) {
            span = endDayIndex - renderDayIndex + 1;
          } else if (jobEndDate > days[days.length - 1]) {
            span = days.length - renderDayIndex;
          } else {
            span = 1;
          }

          // Find available stack position
          const dayKey = format(renderDay, 'yyyy-MM-dd');
          if (!dayStacks[dayKey]) dayStacks[dayKey] = [];

          let stackIndex = 0;
          let foundSlot = false;

          while (!foundSlot) {
            foundSlot = true;

            for (let dayOffset = 0; dayOffset < span; dayOffset++) {
              const checkDayIndex = renderDayIndex + dayOffset;
              if (checkDayIndex >= days.length) break;

              const checkDayKey = format(days[checkDayIndex], 'yyyy-MM-dd');
              if (!dayStacks[checkDayKey]) dayStacks[checkDayKey] = [];

              const conflictingJob = dayStacks[checkDayKey].find(existingJob =>
                existingJob.stackIndex === stackIndex
              );

              if (conflictingJob) {
                foundSlot = false;
                stackIndex++;
                break;
              }
            }
          }

          // Reserve stack position across all days in span
          for (let dayOffset = 0; dayOffset < span; dayOffset++) {
            const reserveDayIndex = renderDayIndex + dayOffset;
            if (reserveDayIndex >= days.length) break;

            const reserveDayKey = format(days[reserveDayIndex], 'yyyy-MM-dd');
            if (!dayStacks[reserveDayKey]) dayStacks[reserveDayKey] = [];

            dayStacks[reserveDayKey].push({
              job,
              span,
              stackIndex
            });
          }

          data.push({
            job,
            renderDay,
            dayIndex: renderDayIndex,
            span: Math.max(1, span),
            stackIndex
          });
        }
      } catch (error) {
        console.error('MasterRow: Error processing job dates:', error, job);
      }
    });

    return data;
  }, [scheduledJobs, days]);

  // Calculate row height based on maximum stack depth
  const maxStackDepth = React.useMemo(() => {
    let maxDepth = 0;
    days.forEach(day => {
      const dayJobs = renderingData.filter(data => isSameDay(data.renderDay, day));
      const dayMaxStack = Math.max(...dayJobs.map(data => data.stackIndex), -1) + 1;
      maxDepth = Math.max(maxDepth, dayMaxStack);
    });
    return Math.max(1, maxDepth);
  }, [renderingData, days]);

  const rowHeight = Math.max(86, maxStackDepth * 78 + 16);

  return (
    <div className="flex border-b-2 border-indigo-300" style={{ minHeight: `${rowHeight}px` }}>
      {/* Master row header - darker background for distinction */}
      <div className="w-24 sm:w-32 md:w-48 flex-shrink-0 p-2 md:p-3 border-r border-gray-200 bg-indigo-100 flex items-center gap-2">
        <Eye className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span className="font-semibold text-indigo-800 text-xs sm:text-sm md:text-base truncate">
          Master View
        </span>
      </div>

      {/* Day cells - display only, no drop */}
      {days.map((day, dayIndex) => {
        const dayRenderingData = renderingData.filter(data => data.dayIndex === dayIndex);

        return (
          <div
            key={day.toString()}
            className={`
              flex-1 min-w-0 border-r border-gray-200 relative
              ${isToday(day) ? 'bg-indigo-50/50' : 'bg-indigo-50/20'}
            `}
            style={{ height: `${rowHeight}px` }}
          >
            <div className="absolute inset-0 p-1">
              {dayRenderingData.map(({ job, span, stackIndex }) => {
                const assignedName = getTeamMemberName(job.worker_id);
                const cellWidth = 100 / 7;
                const spanWidth = cellWidth * span;
                const jobHeight = 72;

                return (
                  <div
                    key={job.id}
                    className="absolute"
                    style={{
                      left: '4px',
                      top: `${4 + stackIndex * (jobHeight + 6)}px`,
                      width: span > 1 ? `calc(${spanWidth}% * 7 - 8px)` : 'calc(100% - 8px)',
                      height: `${jobHeight}px`,
                      zIndex: 10,
                    }}
                  >
                    <div className="relative h-full">
                      <DraggableJob
                        job={job}
                        onClick={() => onJobClick(job)}
                        isScheduled={true}
                        isWeekView={true}
                        showText={true}
                        dayIndex={dayIndex}
                        days={days}
                        readOnly={true}
                      />
                      {/* Team member badge overlay */}
                      <div
                        className="absolute bottom-0 right-0 px-1.5 py-0.5 text-[10px] font-medium bg-white/90 border border-gray-300 rounded-tl text-gray-700 max-w-[80%] truncate"
                        title={assignedName}
                      >
                        {assignedName}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MasterRow;
