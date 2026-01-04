
import { GoogleGenAI, Type } from "@google/genai";
import { AiSettings, ResearchPlanDraft, TableAiAction, TaskStatus, Experiment, Task } from "./types";
import { format } from "date-fns";
import { TranslationDictionary } from "./types/i18n";

/**
 * Service to interact with the Google Gemini API.
 * Accepts an optional apiKey parameter to support user-provided keys.
 */
const getAiClient = (apiKey?: string) => {
  return new GoogleGenAI({ apiKey: apiKey || process.env.API_KEY || '' });
};

/**
 * Helper to construct the Style & Persona instruction block
 */
const getPersonaInstruction = (settings: AiSettings, language: string) => {
  const styleInstructions = {
    professional: "Tone: Formal, Business-oriented. Focus: Actionable insights, clear bottom lines. Vocabulary: Professional industry terms.",
    academic: "Tone: Rigorous, Scientific, Objective. Focus: Methodology, Analysis, Critical thinking. Vocabulary: Academic/Scientific terminology.",
    casual: "Tone: Friendly, Accessible, Conversational. Focus: Simplicity and engagement. Vocabulary: Simple, everyday language.",
    concise_technical: "Tone: Dry, Direct, Technical. Focus: Facts, Data, Efficiency. Vocabulary: Precise technical terms. No fluff."
  };

  const explicitInclusions = [];
  if (settings.showAssumptions) explicitInclusions.push("Explicitly state WORKING ASSUMPTIONS used to derive the answer.");
  if (settings.showMethodology) explicitInclusions.push("Briefly outline the METHODOLOGY or logical approach taken.");
  if (settings.showReservations) explicitInclusions.push("Explicitly mention RESERVATIONS, limitations, or potential biases.");

  return `
    *** AI PERSONA CONFIGURATION ***
    - RESPONSE LANGUAGE: ${language === 'he' ? 'Hebrew' : 'English'}
    - SELECTED STYLE: ${settings.aiStyle}
    - STYLE GUIDELINES: ${styleInstructions[settings.aiStyle as keyof typeof styleInstructions] || styleInstructions.professional}
    - DETAIL LEVEL: ${settings.aiDetailLevel} (Reference: concise=brief summaries, balanced=standard paragraphs, comprehensive=deep dive).
    
    ${explicitInclusions.length > 0 ? `*** REQUIRED SECTIONS (MUST INCLUDE) ***\n- ${explicitInclusions.join('\n- ')}` : ''}

    *** USER CUSTOM INSTRUCTIONS ***
    ${settings.customSystemInstructions ? `USER NOTE: "${settings.customSystemInstructions}". (This overrides default style rules if conflicting).` : 'None provided.'}
    
    *** FORMATTING RULES ***
    - Maintain consistency with the selected style.
    - If style is 'academic', use citations or references to general principles where appropriate.
  `;
};

/**
 * Analyzes a research proposal text and generates a structured work plan.
 */
export const generatePlanFromProposal = async (
  settings: AiSettings,
  proposalText: string,
  t: TranslationDictionary,
  language: string
): Promise<ResearchPlanDraft> => {
  if (settings.mockMode) {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      objectives: [t.aiMock.planResponse, t.aiMock.phaseExec],
      phases: [{ name: t.aiMock.phasePrep, durationWeeks: 1 }, { name: t.aiMock.phaseExec, durationWeeks: 4 }],
      tasks: [
        { title: t.aiMock.taskTitle, description: t.aiMock.taskDesc, weekOffset: 0, importance: 4, status: TaskStatus.IMPORTANT, tags: [] },
        { title: t.aiMock.taskTitle + " 2", description: t.aiMock.taskDesc, weekOffset: 1, importance: 5, status: TaskStatus.IMPORTANT, tags: [], dependsOnTaskIndex: [0] },
      ]
    };
  }

  const ai = getAiClient(settings.apiKey);
  const response = await ai.models.generateContent({
    model: settings.modelStructured || 'gemini-3-pro-preview',
    contents: `Analyze the following research proposal and generate a structured work plan.
    ${getPersonaInstruction(settings, language)}
    
    Proposal Text: ${proposalText}
    
    Instructions:
    1. Break down the plan into objectives and phases.
    2. Identify specific tasks.
    3. If a task is recurring (e.g., "measure every week"), use the 'recurrence' field.
    4. If a task logically depends on another (e.g., "Analysis" after "Data Collection"), indicate it using 'dependsOnTaskIndex' (0-based index of the task in your output list).
    `,
    config: {
      temperature: settings.temperature,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          phases: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                durationWeeks: { type: Type.NUMBER }
              },
              required: ["name", "durationWeeks"]
            }
          },
          tasks: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                weekOffset: { type: Type.NUMBER },
                importance: { type: Type.NUMBER },
                status: { type: Type.STRING },
                tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                recurrence: {
                  type: Type.OBJECT,
                  properties: {
                    frequency: { type: Type.STRING, enum: ['weekly'] },
                    count: { type: Type.NUMBER }
                  }
                },
                dependsOnTaskIndex: {
                  type: Type.ARRAY,
                  items: { type: Type.NUMBER }
                }
              },
              required: ["title", "weekOffset"]
            }
          }
        },
        required: ["objectives", "phases", "tasks"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

/**
 * Generates professional guiding questions.
 */
export const getGuidingQuestions = async (
  settings: AiSettings,
  context: string,
  t: TranslationDictionary,
  language: string
): Promise<string[]> => {
  if (settings.mockMode) {
    return [
      t.aiMock.queryResponse + " 1?",
      t.aiMock.queryResponse + " 2?",
      t.aiMock.queryResponse + " 3?"
    ];
  }

  const ai = getAiClient(settings.apiKey);
  const randomSeed = Math.floor(Math.random() * 10000); // Ensure freshness
  const response = await ai.models.generateContent({
    model: settings.modelText || 'gemini-3-flash-preview',
    contents: `Generate ${settings.numGuidingQuestions} highly specific and professional guiding questions for the following research task.
    The questions should help the researcher improve the execution or data collection of THIS SPECIFIC TASK.
    
    Context Provided: "${context}"
    
    Random Seed: ${randomSeed}
    
    ${getPersonaInstruction(settings, language)}`,
    config: {
      temperature: settings.temperature,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["questions"]
      }
    }
  });

  const result = JSON.parse(response.text || '{}');
  return result.questions || [];
};

/**
 * Smartly incorporates a user's answer into an existing description.
 */
export const smartRefineDescription = async (
  settings: AiSettings,
  currentDescription: string,
  question: string,
  userAnswer: string,
  t: TranslationDictionary,
  language: string
): Promise<string> => {
  if (settings.mockMode) {
    // Simulate a rewrite instead of append
    return `[${t.common.edit}] ${currentDescription}. ${question}: ${userAnswer}. (${t.aiMock.planResponse})`;
  }

  const ai = getAiClient(settings.apiKey);
  const response = await ai.models.generateContent({
    model: settings.modelText || 'gemini-3-flash-preview',
    contents: `
    You are a professional scientific editor.
    Your mission is to **REWRITE** the "Description" to seamlessly incorporate the "New Information".
    
    Old Description: "${currentDescription}"
    Context Question: "${question}"
    New Information (User Answer): "${userAnswer}"
    
    Directives:
    1. **Do NOT simply append** the new information at the end.
    2. Weave the new information into the text so it flows naturally as a single, coherent description.
    3. Improve the overall clarity and professional tone of the Hebrew text.
    4. Keep the text concise but comprehensive.
    5. Return ONLY the new description text.
    
    5. Return ONLY the new description text.
    
    ${getPersonaInstruction(settings, language)}
    `,
    config: {
      temperature: settings.temperature
    }
  });

  return response.text || currentDescription;
};

/**
 * Interprets a natural language prompt to perform an action on the experiment board.
 */
export const getTableAction = async (
  settings: AiSettings,
  prompt: string,
  experiments: Experiment[],
  allTasks: Task[],
  t: TranslationDictionary,
  language: string
): Promise<TableAiAction> => {

  const contextSummary = JSON.stringify({
    currentDate: format(new Date(), 'yyyy-MM-dd'),
    experiments: experiments.map(e => ({ id: e.id, name: e.name })),
    tasks: allTasks.map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      date: t.weekId,
      importance: t.importance,
      completed: t.completed,
      experimentId: t.experimentId
    }))
  });

  if (prompt.includes(t.reports.task) || prompt.includes("Task")) {
    return {
      action: 'add_task',
      payload: {
        taskData: { title: t.aiMock.taskTitle, description: t.aiMock.taskDesc },
        experimentId: experiments[0]?.id,
        weekOffset: 1
      },
      textResponse: t.aiMock.planResponse + ": " + t.common.new,
    };
  }
  return {
    action: 'query',
    payload: {},
    textResponse: t.aiMock.queryResponse + " " + allTasks.length + " " + t.reports.task,
  };


  const ai = getAiClient(settings.apiKey);
  const systemInstruction = `You are a smart assistant for a Research Experiment Management Board.
  Your goal is to translate user natural language requests into structured JSON actions OR answer questions about the data.
  
  Context provided:
  - Current Date (important for relative time queries like "next week").
  - List of active experiments (id, name).
  - List of tasks (id, title, status, date, importance, completed).
  
  Rules for 'add_task':
  1. Identify target experiment ID (fuzzy match name).
  2. **CRITICAL**: Extract a short, descriptive 'title' from the user's prompt. Do NOT use "New Task" unless the prompt is empty. If the user says "Add a task to water plants", title is "Water Plants".
  3. Extract description if provided.
  4. Set 'weekOffset' relative to current date.
  
  Rules for other actions:
  - If user wants to EDIT/DELETE/COMPLETE a task: Find the most relevant 'taskId'. Action: 'edit_task' / 'delete_task'.
  - If user wants to ADD an experiment: Generate a name and description. Action: 'add_experiment'.
  
  Rules for queries:
  - If the user asks a QUESTION about the data (e.g., "What tasks do I have next week?", "List tasks by importance"):
     - Set action to 'query'.
     - Analyze the 'contextSummary' JSON provided.
     - Write a detailed answer in the 'textResponse' field.
  
  ${getPersonaInstruction(settings, language)}
  `;

  const response = await ai.models.generateContent({
    model: settings.modelStructured || 'gemini-3-pro-preview',
    contents: `
    Context Data: ${contextSummary}
    
    User Request: ${prompt}`,
    config: {
      temperature: settings.temperature,
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          action: { type: Type.STRING, description: "add_experiment | add_task | edit_task | delete_task | query | none" },
          payload: {
            type: Type.OBJECT,
            properties: {
              experimentId: { type: Type.STRING },
              taskId: { type: Type.STRING },
              weekOffset: { type: Type.NUMBER },
              taskData: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Specific title extracted from prompt" },
                  description: { type: Type.STRING },
                  status: { type: Type.STRING },
                  importance: { type: Type.NUMBER }
                }
              },
              experimentData: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING }
                }
              }
            }
          },
          textResponse: { type: Type.STRING, description: "Polite confirmation or the answer to the query." }
        },
        required: ["action", "textResponse", "payload"]
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

/**
 * Generates a high-level summary.
 */
export const generateSummary = async (
  settings: AiSettings,
  type: 'weekly' | 'monthly' | 'experiment',
  data: string,
  t: TranslationDictionary,
  language: string
): Promise<string> => {
  if (settings.mockMode) {
    return `${t.aiMock.planResponse} (${type})...`;
  }

  const ai = getAiClient(settings.apiKey);
  const response = await ai.models.generateContent({
    model: settings.modelText || 'gemini-3-flash-preview',
    contents: `Provide a summary for ${type} based on the following task data: ${data}.
    ${getPersonaInstruction(settings, language)}`,
    config: {
      temperature: settings.temperature
    }
  });

  return response.text || '';
};

/**
 * Generates a "Methods & Materials" style report for a specific experiment.
 */
export const generateExperimentReport = async (
  settings: AiSettings,
  experiment: Experiment,
  tasks: Task[],
  t: TranslationDictionary,
  language: string
): Promise<string> => {
  if (settings.mockMode) {
    return t.aiMock.reportResponse;
  }

  const expData = JSON.stringify({
    name: experiment.name,
    description: experiment.description,
    startDate: experiment.startDate,
    tasks: tasks.filter(t => t.experimentId === experiment.id).map(t => ({
      date: t.weekId,
      title: t.title,
      description: t.description,
      status: t.status,
      completed: t.completed
    }))
  });

  const ai = getAiClient(settings.apiKey);
  const response = await ai.models.generateContent({
    model: settings.modelStructured || 'gemini-3-pro-preview',
    contents: `
    You are a scientific research assistant. 
    Write a "Materials and Methods" and "Experimental Procedure" summary report based on the provided experiment data.
    
    Data: ${expData}
    
    ${getPersonaInstruction(settings, language)}

    Guidelines (Override only if User Custom Instructions disagree):
    - Include a chronological timeline of what was done based on the tasks and their completion status.
    - Mention specific dates.
    `,
    config: {
      temperature: settings.temperature
    }
  });

  return response.text || t.common.error;
};
