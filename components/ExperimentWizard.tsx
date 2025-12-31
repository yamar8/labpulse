
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Experiment, AiSettings, Task, TaskStatus, ResearchPlanDraft, PlanTaskItem, RecurrenceConfig } from '../types';
import { generatePlanFromProposal } from '../geminiService';
import { generateUUID, normalizeToSunday, getWeeksDifference } from '../utils';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowPathRoundedSquareIcon,
  CalendarDaysIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { addWeeks, parseISO, differenceInWeeks, format } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

const pdfjs = (pdfjsLib as any).default || pdfjsLib;
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
}

const mammothLib = (mammoth as any).default || mammoth;

interface WizardProps {
  settings: AiSettings;
  onClose: () => void;
  onSave: (experiment: Experiment, tasks: Task[]) => void;
}

// Editable task draft structure (Enhanced)
interface EditableTask extends PlanTaskItem {
  isSelected: boolean;
  originalDependencyIndex?: number;
}

const ExperimentWizard: React.FC<WizardProps> = ({ settings, onClose, onSave }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [parsingFile, setParsingFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const [basicData, setBasicData] = useState({
    name: '',
    description: '',
    startDate: normalizeToSunday(new Date()),
    endDate: ''
  });

  const [proposalText, setProposalText] = useState('');
  const [planDraft, setPlanDraft] = useState<ResearchPlanDraft | null>(null);
  const [draftTasks, setDraftTasks] = useState<EditableTask[]>([]);

  // State for the "Full Edit" modal inside step 3
  const [editingTask, setEditingTask] = useState<EditableTask | null>(null);
  // Toggle for date input method in edit modal
  const [dateInputMode, setDateInputMode] = useState<'week_offset' | 'specific_date'>('week_offset');

  // Reset date input mode when opening a new task
  useEffect(() => {
    if (editingTask) {
      setDateInputMode('week_offset');
    }
  }, [editingTask?.id]);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    return fullText;
  };

  const extractTextFromDocx = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    if (!mammothLib.extractRawText) {
      throw new Error("Mammoth library not loaded correctly");
    }
    const result = await mammothLib.extractRawText({ arrayBuffer });
    return result.value;
  };

  const processFile = async (file: File) => {
    setParsingFile(true);
    setFileError(null);

    try {
      let text = '';
      if (file.type === 'application/pdf') {
        text = await extractTextFromPdf(file);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        text = await extractTextFromDocx(file);
      } else if (file.type === 'text/plain') {
        text = await file.text();
      } else {
        throw new Error(t.common.error);
      }
      if (!text.trim()) throw new Error(t.common.error);
      setProposalText(text);
    } catch (error: any) {
      console.error("File parsing error:", error);
      setFileError(error.message || t.common.error);
    } finally {
      setParsingFile(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await processFile(file);
  };

  const processAiDraft = (draft: ResearchPlanDraft) => {
    const processedTasks: EditableTask[] = [];

    draft.tasks.forEach((task, index) => {
      // Convert AI simple recurrence to Interval Recurrence
      let recurrence: RecurrenceConfig | undefined = undefined;
      if (task.recurrence && task.recurrence.count > 1) {
        recurrence = {
          type: 'interval',
          intervalWeeks: 1, // Default to every week
          durationWeeks: task.recurrence.count // Total duration
        };
      }

      processedTasks.push({
        id: generateUUID(),
        title: task.title,
        description: task.description,
        weekOffset: task.weekOffset,
        importance: task.importance,
        status: (task.status as TaskStatus) || TaskStatus.DEFAULT,
        isSelected: true,
        recurrence: recurrence,
        dependencies: [],
        originalDependencyIndex: task.dependsOnTaskIndex && task.dependsOnTaskIndex.length > 0 ? task.dependsOnTaskIndex[0] : undefined
      });
    });

    // Simple dependency resolution
    processedTasks.forEach((pt, idx) => {
      if (pt.originalDependencyIndex !== undefined && processedTasks[pt.originalDependencyIndex]) {
        pt.dependencies = [processedTasks[pt.originalDependencyIndex].id];
      }
    });

    setDraftTasks(processedTasks);
  };

  const handleGeneratePlan = async () => {
    if (!proposalText) return;
    setLoading(true);
    try {
      const draft = await generatePlanFromProposal(settings, proposalText);
      setPlanDraft(draft);
      processAiDraft(draft);
      setStep(3);
    } catch (error) {
      alert(t.common.error + ": " + error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManualTask = () => {
    setDraftTasks(prev => [
      ...prev,
      {
        id: generateUUID(),
        title: t.common.new,
        description: '',
        weekOffset: 0,
        importance: 3,
        status: TaskStatus.DEFAULT,
        isSelected: true,
        dependencies: []
      }
    ]);
  };

  const handleUpdateDraftTask = (id: string, updates: Partial<EditableTask>) => {
    setDraftTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const saveEditedTask = () => {
    if (editingTask) {
      handleUpdateDraftTask(editingTask.id, editingTask);
      setEditingTask(null);
    }
  };

  const handleFinish = () => {
    const experimentId = generateUUID();
    const finalTasks: Task[] = [];
    const selectedDrafts = draftTasks.filter(t => t.isSelected);

    // Save the plan logic for future rescheduling
    const masterPlan: PlanTaskItem[] = selectedDrafts.map(d => ({
      id: d.id,
      title: d.title,
      description: d.description,
      weekOffset: d.weekOffset,
      importance: d.importance,
      status: d.status,
      recurrence: d.recurrence,
      dependencies: d.dependencies
    }));

    selectedDrafts.forEach(draft => {
      if (draft.recurrence) {
        // Complex recurrence generation
        const { intervalWeeks, durationWeeks } = draft.recurrence;
        const groupId = generateUUID();
        let count = 0;

        // Loop: start at 0, continue while offset < duration
        for (let w = 0; w < durationWeeks; w += intervalWeeks) {
          finalTasks.push({
            id: generateUUID(),
            experimentId,
            title: `${draft.title} (${count + 1})`,
            description: draft.description,
            weekId: normalizeToSunday(addWeeks(parseISO(basicData.startDate), draft.weekOffset + w)),
            status: draft.status,
            importance: draft.importance,
            completed: false,
            tags: [],
            attachments: [],
            dependencies: [], // Dependencies on recurring tasks are complex, skipping auto-link for now
            recurrenceGroupId: groupId,
            planTaskId: draft.id
          });
          count++;
        }
      } else {
        // Single Task
        finalTasks.push({
          id: generateUUID(),
          experimentId,
          title: draft.title,
          description: draft.description,
          weekId: normalizeToSunday(addWeeks(parseISO(basicData.startDate), draft.weekOffset)),
          status: draft.status,
          importance: draft.importance,
          completed: false,
          tags: [],
          attachments: [],
          dependencies: [], // Resolve dependencies logic if needed
          planTaskId: draft.id
        });
      }
    });

    // Calculate duration
    let duration = basicData.startDate && basicData.endDate
      ? getWeeksDifference(basicData.startDate, basicData.endDate)
      : 4;

    const maxWeekId = finalTasks.reduce((max, t) => t.weekId > max ? t.weekId : max, '');
    if (maxWeekId) {
      const calcDuration = getWeeksDifference(basicData.startDate, maxWeekId);
      if (calcDuration > duration) duration = calcDuration;
    }

    const experiment: Experiment = {
      id: experimentId,
      name: basicData.name,
      description: basicData.description,
      collaborators: [],
      startDate: basicData.startDate,
      endDate: basicData.endDate,
      expectedWeeks: duration,
      status: 'active',
      attachments: [],
      proposalText,
      originalPlan: masterPlan // Save the Master Plan!
    };

    onSave(experiment, finalTasks);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-2 md:mx-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-xl font-bold text-slate-900">{t.wizard.title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 relative">

          {step === 1 && (
            <div className="space-y-6 max-w-xl mx-auto">
              <h3 className="text-lg font-semibold text-slate-800">{t.wizard.step1}</h3>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{t.wizard.experimentName} *</label>
                <input
                  type="text"
                  value={basicData.name}
                  onChange={e => setBasicData({ ...basicData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder=""
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">{t.wizard.description}</label>
                <textarea
                  value={basicData.description}
                  onChange={e => setBasicData({ ...basicData, description: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.wizard.startDate}</label>
                  <input
                    type="date"
                    value={basicData.startDate}
                    onChange={e => setBasicData({ ...basicData, startDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">{t.wizard.endDate} ({t.wizard.optional})</label>
                  <input
                    type="date"
                    value={basicData.endDate}
                    min={basicData.startDate}
                    onChange={e => setBasicData({ ...basicData, endDate: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <DocumentTextIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{t.wizard.step2}</h3>
                  <p className="text-sm text-slate-500">{t.wizard.analyzingInfo}</p>
                </div>
              </div>

              <div
                className={`border-2 border-dashed rounded-2xl p-6 transition-colors text-center ${fileError ? 'border-red-300 bg-red-50' : isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100'}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  accept=".txt,.pdf,.docx"
                  onChange={handleFileUpload}
                  disabled={parsingFile}
                />
                <label htmlFor="file-upload" className={`cursor-pointer ${parsingFile ? 'opacity-50' : ''}`}>
                  {parsingFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <ArrowPathIcon className="w-6 h-6 animate-spin text-indigo-600" />
                      <span className="text-indigo-600 font-bold">{t.common.loading}</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-600 font-medium">{isDragActive ? t.wizard.dropFileActive : t.wizard.dropFile}</p>
                      <p className="text-xs text-slate-400 mt-1">{t.wizard.dropFile}</p>
                    </>
                  )}
                </label>
                {fileError && <div className="text-red-600 mt-2">{fileError}</div>}
              </div>

              <textarea
                value={proposalText}
                onChange={e => setProposalText(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none h-48 resize-none font-mono text-sm"
                placeholder={t.wizard.pasteText}
              />
            </div>
          )}

          {step === 3 && planDraft && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">{t.wizard.step3}</h3>
                  <p className="text-sm text-slate-500">AI identified {draftTasks.length} tasks.</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center">
                          <input type="checkbox" className="rounded border-slate-300" checked={draftTasks.every(t => t.isSelected)} onChange={e => {
                            const val = e.target.checked;
                            setDraftTasks(prev => prev.map(t => ({ ...t, isSelected: val })));
                          }} />
                        </th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-20">{t.taskModal.weekOffset}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase min-w-[120px]">{t.taskModal.name}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-48 hidden sm:table-cell">Recurrence</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-24 hidden sm:table-cell">{t.taskModal.importance}</th>
                        <th className="px-3 py-3 text-right text-xs font-bold text-slate-500 uppercase w-24">{t.common.edit}</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200">
                      {draftTasks.map((task) => (
                        <tr key={task.id} className={`hover:bg-slate-50 transition-colors ${!task.isSelected ? 'opacity-50 grayscale' : ''}`}>
                          <td className="px-3 py-3 text-center">
                            <input
                              type="checkbox"
                              checked={task.isSelected}
                              onChange={(e) => handleUpdateDraftTask(task.id, { isSelected: e.target.checked })}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-slate-400">שבוע</span>
                              <span className="font-bold text-sm bg-slate-100 px-2 py-0.5 rounded">{task.weekOffset}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="block text-sm font-bold text-slate-800">{task.title}</span>
                            <span className="block text-xs text-slate-500 truncate max-w-[200px]">{task.description}</span>
                            <div className="sm:hidden mt-1 flex gap-2">
                              {task.importance >= 4 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">P{task.importance}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell">
                            {task.recurrence ? (
                              <div className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg border border-purple-100 inline-flex flex-col">
                                <span className="font-bold">כל {task.recurrence.intervalWeeks} שבועות</span>
                                <span className="text-[10px] opacity-80">למשך {task.recurrence.durationWeeks} שבועות</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">- חד פעמי -</span>
                            )}
                          </td>
                          <td className="px-3 py-3 hidden sm:table-cell">
                            <div className={`text-xs font-bold px-2 py-1 rounded text-center
                             ${task.importance >= 4 ? 'bg-red-100 text-red-700' : task.importance >= 2 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}
                           `}>
                              P{task.importance}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => setEditingTask(task)}
                                className="text-slate-400 hover:text-indigo-600 p-1 bg-slate-100 rounded-lg transition-colors"
                                title="עריכה מלאה"
                              >
                                <PencilSquareIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDraftTasks(prev => prev.filter(t => t.id !== task.id))}
                                className="text-slate-400 hover:text-red-500 p-1"
                                title="מחק"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  onClick={handleAddManualTask}
                  className="w-full py-3 text-center text-sm font-bold text-indigo-600 hover:bg-indigo-50 border-t border-slate-200 flex items-center justify-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  הוסף משימה ידנית
                </button>
              </div>
            </div>
          )}

          {/* Edit Modal Overlay (Inside Wizard) */}
          {editingTask && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex flex-col animate-in fade-in duration-200">
              <div className="px-4 md:px-8 py-4 md:py-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                  <PencilSquareIcon className="w-6 h-6 text-indigo-600" />
                  עריכת משימה
                </h3>
                <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <div className="p-4 md:p-8 space-y-6 flex-1 overflow-y-auto max-w-3xl mx-auto w-full">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">כותרת המשימה</label>
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={e => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-700">תזמון (התחלה)</label>
                      <div className="flex bg-slate-100 rounded-lg p-0.5">
                        <button
                          type="button"
                          onClick={() => setDateInputMode('week_offset')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateInputMode === 'week_offset' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          לפי שבוע
                        </button>
                        <button
                          type="button"
                          onClick={() => setDateInputMode('specific_date')}
                          className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all ${dateInputMode === 'specific_date' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                        >
                          לפי תאריך
                        </button>
                      </div>
                    </div>

                    {dateInputMode === 'week_offset' ? (
                      <div className="relative">
                        <input
                          type="number" min="0"
                          value={editingTask.weekOffset}
                          onChange={e => setEditingTask({ ...editingTask, weekOffset: parseInt(e.target.value) })}
                          className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none pl-12"
                        />
                        <span className="absolute right-4 top-2 text-sm text-slate-400">שבוע +</span>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="date"
                          min={basicData.startDate}
                          value={format(addWeeks(parseISO(basicData.startDate), editingTask.weekOffset), 'yyyy-MM-dd')}
                          onChange={(e) => {
                            if (e.target.value) {
                              const newDate = parseISO(e.target.value);
                              const start = parseISO(basicData.startDate);
                              const diff = Math.max(0, differenceInWeeks(newDate, start));
                              setEditingTask({ ...editingTask, weekOffset: diff });
                            }
                          }}
                          className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1">רמת חשיבות</label>
                    <select
                      value={editingTask.importance}
                      onChange={e => setEditingTask({ ...editingTask, importance: parseInt(e.target.value) })}
                      className="w-full border border-slate-300 rounded-xl px-4 py-2 outline-none bg-white"
                    >
                      {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>P{v} - {v === 5 ? 'קריטי' : v === 1 ? 'נמוך' : 'רגיל'}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 space-y-4">
                  <div className="flex items-center gap-2">
                    <ArrowPathRoundedSquareIcon className="w-6 h-6 text-purple-700" />
                    <label className="text-lg font-bold text-purple-900">הגדרות חזרתיות</label>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!editingTask.recurrence}
                        onChange={(e) => setEditingTask({
                          ...editingTask,
                          recurrence: e.target.checked ? { type: 'interval', intervalWeeks: 1, durationWeeks: 4 } : undefined
                        })}
                        className="w-5 h-5 rounded border-purple-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-sm font-bold text-purple-800">משימה זו חוזרת על עצמה</span>
                    </label>
                  </div>

                  {editingTask.recurrence && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 pt-2 border-t border-purple-200">
                      <div>
                        <label className="block text-xs font-bold text-purple-700 mb-1">תדירות (כל כמה שבועות?)</label>
                        <div className="relative">
                          <input
                            type="number" min="1" max="52"
                            value={editingTask.recurrence.intervalWeeks}
                            onChange={(e) => setEditingTask({
                              ...editingTask,
                              recurrence: { ...editingTask.recurrence!, intervalWeeks: parseInt(e.target.value) }
                            })}
                            className="w-full border-purple-300 rounded-lg px-4 py-2 outline-none focus:border-purple-500 font-bold"
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-purple-400">שבועות</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-purple-700 mb-1">משך כולל (כמה זמן תימשך החזרה?)</label>
                        <div className="relative">
                          <input
                            type="number" min="1" max="100"
                            value={editingTask.recurrence.durationWeeks}
                            onChange={(e) => setEditingTask({
                              ...editingTask,
                              recurrence: { ...editingTask.recurrence!, durationWeeks: parseInt(e.target.value) }
                            })}
                            className="w-full border-purple-300 rounded-lg px-4 py-2 outline-none focus:border-purple-500 font-bold"
                          />
                          <span className="absolute left-3 top-2.5 text-xs text-purple-400">שבועות</span>
                        </div>
                        <p className="text-[10px] text-purple-600 mt-1">
                          * ייווצרו כ-{Math.ceil(editingTask.recurrence.durationWeeks / editingTask.recurrence.intervalWeeks)} משימות סה"כ.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">תיאור מלא</label>
                  <textarea
                    value={editingTask.description}
                    onChange={e => setEditingTask({ ...editingTask, description: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 outline-none h-40 resize-none"
                    placeholder="פרט את מהות המשימה..."
                  />
                </div>
              </div>
              <div className="px-4 md:px-8 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 flex-wrap">
                <button
                  onClick={() => setEditingTask(null)}
                  className="px-6 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100"
                >
                  ביטול
                </button>
                <button
                  onClick={saveEditedTask}
                  className="px-6 py-2 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 shadow-sm flex items-center gap-2"
                >
                  <CheckIcon className="w-5 h-5" />
                  שמור שינויים
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="px-4 md:px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-3 h-3 rounded-full ${step === s ? 'bg-indigo-600' : 'bg-slate-300'}`}></div>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {step > 1 && !editingTask && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-4 md:px-6 py-2 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-100 text-sm md:text-base"
              >
                {t.wizard.back}
              </button>
            )}
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                disabled={!basicData.name}
                className="px-4 md:px-6 py-2 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 disabled:opacity-50 text-sm md:text-base"
              >
                {t.wizard.continue}
              </button>
            )}
            {step === 2 && (
              <div className="flex gap-2 flex-col sm:flex-row">
                <button
                  onClick={() => handleFinish()}
                  className="px-6 py-2 rounded-xl border border-indigo-600 text-indigo-600 font-bold hover:bg-indigo-50 text-sm md:text-base"
                >
                  דילוג על AI
                </button>
                <button
                  onClick={handleGeneratePlan}
                  disabled={loading || !proposalText}
                  className="px-6 py-2 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 flex items-center gap-2 justify-center text-sm md:text-base"
                >
                  {loading ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <DocumentTextIcon className="w-5 h-5" />}
                  <span>צור תוכנית AI</span>
                </button>
              </div>
            )}
            {step === 3 && !editingTask && (
              <button
                onClick={handleFinish}
                className="px-6 py-2 rounded-xl bg-indigo-600 font-bold text-white hover:bg-indigo-700 flex items-center gap-2 text-sm md:text-base"
              >
                <CheckIcon className="w-5 h-5" />
                <span>סיים והוסף ללוח</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExperimentWizard;
