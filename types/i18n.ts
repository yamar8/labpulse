export type Language = 'he' | 'en';
export type Direction = 'rtl' | 'ltr';

export interface TranslationDictionary {
    common: {
        appName: string;
        loading: string;
        save: string;
        cancel: string;
        delete: string;
        edit: string;
        close: string;
        yes: string;
        no: string;
        new: string;
        today: string;
        week: string;
        month: string;
        archive: string;
        import: string;
        export: string;
        settings: string;
        search: string;
        notImplemented: string;
        error: string;
    };
    header: {
        newExperiment: string;
        weeklySummary: string;
        monthlySummary: string;
        archive: string;
        importData: string;
        exportJson: string;
        exportCsv: string;
        settings: string;
        jumpToToday: string;
    };
    board: {
        experimentResearch: string;
        noActiveExperiments: string;
        clickNewToStart: string;
        week: string;
    };
    wizard: {
        title: string;
        step1: string; // Basic Info
        step2: string; // Proposal
        step3: string; // Plan
        experimentName: string;
        description: string;
        startDate: string;
        endDate: string;
        optional: string;
        dropFile: string;
        dropFileActive: string;
        analyzingInfo: string;
        pasteText: string;
        generatePlan: string;
        skipAi: string;
        finish: string;
        addManualTask: string;
    };
    taskModal: {
        title: string; // Edit Task or New Task
        name: string;
        description: string;
        status: string;
        importance: string;
        weekOffset: string;
        date: string;
        dependencies: string;
        aiAssistant: string;
        refineQuestions: string;
        smartIncorporate: string;
        dangerZone: string;
        deleteTask: string;
        confirmDelete: string;
        blocked: string;
        blockedMessage: string;
        addToCalendar: string;
        refreshQuestions: string;
        addDependencyPlaceholder: string;
        noDependenciesAvailable: string;
        completed: string;
        confirmDeleteYes: string;
        confirmDeleteNo: string;
    };
    experimentDetails: {
        title: string; // Experiment Details
        detailsTab: string;
        planTab: string;
        status: string;
        active: string;
        archived: string;
        aiInsights: string;
        generateReport: string;
        shiftTimeline: string;
        resetTasks: string;
        archiveExperiment: string;
        restoreExperiment: string;
        deleteExperiment: string;
        masterPlan: string;
        shiftTimelineDesc: string;
        masterPlanDesc: string;
        quickEdit: string;
        addTask: string;
        noTasks: string;
        reportTitle: string;
        copy: string;
        copied: string;
        confirmReset: string;
        confirmResetYes: string;
        confirmDelete: string;
        confirmDeleteYes: string;
    };
    settings: {
        title: string;
        appearance: string;
        theme: string;
        light: string;
        dark: string;
        fontSize: string;
        normal: string;
        large: string;
        extraLarge: string;
        aiPersona: string;
        style: string;
        detailLevel: string;
        includeInResponse: string;
        assumptions: string;
        methodology: string;
        reservations: string;
        language: string;
        systemPrompt: string;
        technical: string;
        apiKey: string;
        mockMode: string;
        model: string;
        temperature: string;
        // Options & Placeholders
        professional: string;
        academic: string;
        conciseTechnical: string;
        casual: string;
        concise: string;
        balanced: string;
        comprehensive: string;
        aiLanguagePlaceholder: string;
        systemPromptPlaceholder: string;
        systemPromptHint: string;
        apiKeyPlaceholder: string;
    };
}
