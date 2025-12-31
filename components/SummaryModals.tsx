
import React, { useState, useEffect, useMemo } from 'react';
import { Task, Experiment, AiSettings } from '../types';
import { generateSummary } from '../geminiService';
import { generateWeeklyPrintView, generateWeeklyDocx } from '../reportService';
import { parseSimpleMarkdown } from '../utils';
import { 
  XMarkIcon, 
  SparklesIcon, 
  ArrowPathIcon, 
  ChevronRightIcon, 
  ChevronLeftIcon,
  ClipboardIcon,
  CheckIcon,
  PrinterIcon,
  DocumentTextIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isWithinInterval, 
  addMonths, 
  addWeeks, 
  parseISO 
} from 'date-fns';
import { he } from 'date-fns/locale';

interface SummaryModalProps {
  type: 'weekly' | 'monthly';
  allTasks: Task[];
  experiments: Experiment[];
  settings: AiSettings;
  onClose: () => void;
}

const SummaryModals: React.FC<SummaryModalProps> = ({ type, allTasks, experiments, settings, onClose }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Filter state for report generation
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('all');

  // Calculate the date range based on the selected period
  const dateRange = useMemo(() => {
    if (type === 'monthly') {
      return {
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
      };
    } else {
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 0 }),
        end: endOfWeek(currentDate, { weekStartsOn: 0 })
      };
    }
  }, [currentDate, type]);

  // Filter tasks that fall within the selected date range
  const filteredTasks = useMemo(() => {
    let tasks = allTasks.filter(task => {
      const taskDate = parseISO(task.weekId);
      return isWithinInterval(taskDate, dateRange);
    });

    if (selectedExperimentId !== 'all') {
      tasks = tasks.filter(t => t.experimentId === selectedExperimentId);
    }

    return tasks;
  }, [allTasks, dateRange, selectedExperimentId]);

  const handleGenerate = async () => {
    if (filteredTasks.length === 0) {
      setSummary('אין משימות בתקופה זו לניתוח.');
      return;
    }

    setLoading(true);
    const dataString = filteredTasks.map(t => {
      const exp = experiments.find(e => e.id === t.experimentId);
      return `ניסוי: ${exp?.name || 'לא ידוע'}, משימה: ${t.title}, סטטוס: ${t.status}, הושלם: ${t.completed ? 'כן' : 'לא'}`;
    }).join('\n');
    
    try {
      const res = await generateSummary(settings, type, dataString);
      setSummary(res);
    } catch (e) {
      alert("שגיאה ביצירת סיכום חכם");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGenerate();
  }, [dateRange, type, selectedExperimentId]); // Re-generate when filters change

  const navigate = (direction: number) => {
    if (type === 'monthly') {
      setCurrentDate(prev => addMonths(prev, direction));
    } else {
      setCurrentDate(prev => addWeeks(prev, direction));
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const displayPeriod = () => {
    if (type === 'monthly') {
      return format(currentDate, 'MMMM yyyy', { locale: he });
    } else {
      return `שבוע ה-${format(currentDate, 'dd/MM/yyyy', { locale: he })}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-right">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-slate-900">{type === 'weekly' ? 'סיכום שבועי' : 'סיכום חודשי'}</h2>
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1">
              <button onClick={() => navigate(1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronRightIcon className="w-5 h-5 text-slate-600" />
              </button>
              <span className="text-sm font-bold text-slate-700 min-w-[120px] text-center">
                {displayPeriod()}
              </span>
              <button onClick={() => navigate(-1)} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <ChevronLeftIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar (Export & Filter) - Only for Weekly */}
        {type === 'weekly' && (
          <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                 <FunnelIcon className="w-4 h-4" />
                 <span>סינון לפי ניסוי:</span>
              </div>
              <select 
                value={selectedExperimentId}
                onChange={e => setSelectedExperimentId(e.target.value)}
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm outline-none bg-slate-50 hover:bg-white transition-colors"
              >
                <option value="all">כל הניסויים</option>
                {experiments.filter(e => e.status === 'active').map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
               <button 
                 onClick={() => generateWeeklyPrintView(filteredTasks, experiments, dateRange.start, selectedExperimentId)}
                 className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors text-sm font-bold"
                 title="הדפס או שמור כ-PDF"
               >
                 <PrinterIcon className="w-4 h-4" />
                 <span>PDF / הדפסה</span>
               </button>
               <button 
                 onClick={() => generateWeeklyDocx(filteredTasks, experiments, dateRange.start, selectedExperimentId)}
                 className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm font-bold"
                 title="הורד קובץ Word"
               >
                 <DocumentTextIcon className="w-4 h-4" />
                 <span>Word Export</span>
               </button>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* AI Summary Section */}
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative group">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <SparklesIcon className="w-6 h-6" />
                <h3 className="font-bold">ניתוח AI חכם</h3>
              </div>
              <div className="flex items-center gap-2">
                {summary && !loading && (
                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 px-3 py-1.5 rounded-lg transition-all"
                  >
                    {copied ? <CheckIcon className="w-4 h-4" /> : <ClipboardIcon className="w-4 h-4" />}
                    <span>{copied ? 'הועתק!' : 'העתק'}</span>
                  </button>
                )}
                <button 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="text-sm bg-white border border-indigo-200 text-indigo-600 px-4 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {loading ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <ArrowPathIcon className="w-4 h-4" />}
                  <span>רענן ניתוח</span>
                </button>
              </div>
            </div>
            
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-indigo-200/50 rounded w-full"></div>
                <div className="h-4 bg-indigo-200/50 rounded w-5/6"></div>
                <div className="h-4 bg-indigo-200/50 rounded w-4/6"></div>
              </div>
            ) : (
              <div 
                className="prose prose-indigo max-w-none text-indigo-900 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ 
                  __html: summary ? parseSimpleMarkdown(summary) : (filteredTasks.length === 0 ? "אין נתונים לתקופה זו." : "לחץ על רענן כדי להפיק סיכום.")
                }}
              />
            )}
          </div>

          {/* Tasks List Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800">פירוט משימות ({filteredTasks.length})</h3>
              <div className="text-xs text-slate-500 font-medium">
                טווח: {format(dateRange.start, 'dd/MM')} - {format(dateRange.end, 'dd/MM')}
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredTasks.length > 0 ? (
                filteredTasks.map(task => {
                  const exp = experiments.find(e => e.id === task.experimentId);
                  return (
                    <div key={task.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 transition-all shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`w-1 h-10 rounded-full ${task.completed ? 'bg-emerald-400' : 'bg-indigo-400'}`}></div>
                        <div>
                          <p className={`text-sm font-bold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold">
                              {exp?.name || 'ניסוי כללי'}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              שבוע: {format(parseISO(task.weekId), 'dd/MM')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            task.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {task.completed ? 'הושלם' : 'בתהליך'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <p className="text-slate-400 font-medium">אין משימות מתועדות בתקופה שנבחרה</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-8 py-2.5 rounded-xl bg-slate-900 font-bold text-white hover:bg-slate-800 transition-all shadow-md active:scale-95"
          >
            סגור תצוגה
          </button>
        </div>
      </div>
    </div>
  );
};

export default SummaryModals;
