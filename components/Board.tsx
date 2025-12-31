
import React, { useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Task, Experiment } from '../types';
import { STATUS_OPTIONS } from '../constants';
import { normalizeToSunday, isTaskBlocked } from '../utils';
import { format, addWeeks, parseISO, getISOWeek, endOfWeek } from 'date-fns';
import { PlusIcon, InformationCircleIcon, ChartBarIcon, LockClosedIcon } from '@heroicons/react/24/outline';

interface BoardProps {
  experiments: Experiment[];
  tasks: Task[];
  hiddenWeeks: string[];
  viewOffset: number;
  onViewOffsetChange: (offset: number) => void;
  onAddTask: (experimentId: string, weekId: string) => void;
  onEditTask: (taskId: string) => void;
  onOpenExperiment: (experimentId: string) => void;
}

const Board: React.FC<BoardProps> = ({
  experiments,
  tasks,
  hiddenWeeks,
  viewOffset,
  onViewOffsetChange,
  onAddTask,
  onEditTask,
  onOpenExperiment
}) => {
  const { t, language } = useLanguage();

  // Generate range of weeks to display
  const weeks = useMemo(() => {
    const today = new Date();
    const start = normalizeToSunday(today);
    const range = [];
    // Render 12 weeks dynamically based on offset
    for (let i = -2; i < 10; i++) {
      const w = normalizeToSunday(addWeeks(parseISO(start), viewOffset + i));
      if (!hiddenWeeks.includes(w)) {
        range.push(w);
      }
    }
    return range;
  }, [hiddenWeeks, viewOffset]);

  // Calculate year segments for the top header
  const yearSegments = useMemo(() => {
    const segments: { year: number; count: number }[] = [];
    if (weeks.length === 0) return segments;

    let currentYear = parseISO(weeks[0]).getFullYear();
    let count = 0;

    weeks.forEach(week => {
      const year = parseISO(week).getFullYear();
      if (year === currentYear) {
        count++;
      } else {
        segments.push({ year: currentYear, count });
        currentYear = year;
        count = 1;
      }
    });
    segments.push({ year: currentYear, count });

    return segments;
  }, [weeks]);

  // Optimize tasks lookup by creating a map: { experimentId: { weekId: Task[] } }
  const tasksMap = useMemo(() => {
    const map: Record<string, Record<string, Task[]>> = {};
    tasks.forEach(task => {
      if (!map[task.experimentId]) map[task.experimentId] = {};
      if (!map[task.experimentId][task.weekId]) map[task.experimentId][task.weekId] = [];
      map[task.experimentId][task.weekId].push(task);
    });
    return map;
  }, [tasks]);

  const getTasksForCell = (experimentId: string, weekId: string) => {
    return tasksMap[experimentId]?.[weekId] || [];
  };

  // Wheel handler for the header specifically
  const handleHeaderWheel = (e: React.WheelEvent) => {
    // Only scroll weeks if we are hovering the header
    e.preventDefault();
    e.stopPropagation();

    // Debounce or threshold check could be added here for smoother feel
    // In RTL, the direction might need to be inverted depending on browser implementation,
    // but usually deltaY is consistent. Horizontal scrolling (shift+wheel) might need check.
    if (e.deltaY > 0) {
      onViewOffsetChange(viewOffset + 1);
    } else if (e.deltaY < 0) {
      onViewOffsetChange(viewOffset - 1);
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 p-2 md:p-6 transition-colors">
      <div className="inline-block min-w-full align-middle border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-slate-800">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 table-fixed border-collapse">
            <thead>
              {/* Year Stripe Row */}
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th
                  className={`sticky ${language === 'he' ? 'right-0' : 'left-0'} z-30 bg-slate-50 dark:bg-slate-800 w-40 md:w-64 ${language === 'he' ? 'border-l' : 'border-r'} border-slate-200 dark:border-slate-700 p-0 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}
                  rowSpan={2}
                >
                  <div className={`h-full flex items-center ${language === 'he' ? 'justify-end pr-4 pl-2' : 'justify-start pl-4 pr-2'} text-sm font-bold text-slate-700 dark:text-slate-300`}>
                    {t.board.experimentResearch}
                  </div>
                </th>
                {yearSegments.map((segment, index) => (
                  <th
                    key={index}
                    colSpan={segment.count}
                    className={`h-5 text-center bg-slate-100/50 dark:bg-slate-700/30 ${language === 'he' ? 'border-l' : 'border-r'} border-slate-200 dark:border-slate-700 first:border-r-0`}
                  >
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      {segment.year}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Weeks Header Row */}
              <tr
                className="bg-slate-50 dark:bg-slate-800 cursor-ew-resize hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                onWheel={handleHeaderWheel}
                title={language === 'he' ? "גלול כאן עם העכבר כדי לנוע בזמן" : "Scroll here to move in time"}
              >
                {/* Note: The first cell is handled by rowSpan above */}
                {weeks.map(week => {
                  const dateObj = parseISO(week);
                  const weekNum = getISOWeek(dateObj);
                  const endDate = endOfWeek(dateObj);
                  return (
                    <th key={week} className={`w-[140px] px-2 py-4 text-center ${language === 'he' ? 'border-l last:border-l-0' : 'border-r last:border-r-0'} border-slate-100 dark:border-slate-700 select-none group border-t border-slate-200 dark:border-slate-700`}>
                      <div className="flex flex-col items-center justify-center">
                        <span className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight mb-1 whitespace-nowrap">
                          {format(dateObj, 'dd/MM')} - {format(endDate, 'dd/MM')}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {t.board.week} {weekNum}
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
              {experiments.filter(e => e.status === 'active').map(experiment => (
                <tr key={experiment.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                  <td className={`sticky ${language === 'he' ? 'right-0 border-l' : 'left-0 border-r'} z-20 bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-slate-700/90 px-2 md:px-4 py-4 text-sm border-slate-200 dark:border-slate-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px] md:max-w-none" title={experiment.name}>
                        {experiment.name}
                      </span>
                      <button
                        onClick={() => onOpenExperiment(experiment.id)}
                        className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-md transition-colors"
                      >
                        <InformationCircleIcon className="w-5 h-5" />
                      </button>
                    </div>
                    {experiment.description && (
                      <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{experiment.description}</p>
                    )}
                  </td>
                  {weeks.map(week => {
                    const cellTasks = getTasksForCell(experiment.id, week);
                    return (
                      <td key={week} className="px-2 py-3 border-l border-slate-100 dark:border-slate-700 last:border-l-0 align-top group/cell">
                        <div className="space-y-2 min-h-[4rem]">
                          {cellTasks.map(task => {
                            const statusConfig = STATUS_OPTIONS.find(o => o.value === task.status) || STATUS_OPTIONS[0];
                            const isBlocked = isTaskBlocked(task, tasks);

                            return (
                              <div
                                key={task.id}
                                onClick={() => onEditTask(task.id)}
                                className={`
                                p-2 rounded-lg border cursor-pointer transition-all hover:shadow-md relative
                                ${task.completed
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 opacity-75'
                                    : isBlocked
                                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600'
                                      : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600'
                                  }
                              `}
                              >
                                <div className="flex items-start gap-1">
                                  {isBlocked ? (
                                    <LockClosedIcon className="mt-1 h-3 w-3 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                                  ) : (
                                    <input
                                      type="checkbox"
                                      checked={task.completed}
                                      readOnly
                                      className="mt-1 h-3 w-3 rounded border-slate-300 dark:border-slate-500 text-indigo-600 focus:ring-indigo-500 bg-white dark:bg-slate-600"
                                    />
                                  )}
                                  <span className={`text-xs font-medium leading-tight ${task.completed ? 'line-through text-slate-500 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                    {task.title}
                                  </span>
                                </div>
                                {!task.completed && (
                                  <div className="mt-1 flex items-center gap-1">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusConfig.color}`}>
                                      {statusConfig.label}
                                    </span>
                                    {task.importance > 3 && (
                                      <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300 px-1 py-0.5 rounded-full font-black">
                                        P{task.importance}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          <button
                            onClick={() => onAddTask(experiment.id, week)}
                            className="w-full py-2 flex items-center justify-center border border-dashed border-slate-300 dark:border-slate-600 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-slate-700 transition-all opacity-40 hover:opacity-100"
                          >
                            <PlusIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {experiments.filter(e => e.status === 'active').length === 0 && (
                <tr>
                  <td colSpan={weeks.length + 1} className="py-20 text-center">
                    <div className="flex flex-col items-center">
                      <ChartBarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">{t.board.noActiveExperiments}</h3>
                      <p className="text-slate-500 dark:text-slate-400">{t.board.clickNewToStart}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Board;
