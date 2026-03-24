import { z } from 'zod';
/**
 * Zod schema for Standup configuration
 */
export declare const StandupConfigSchema: z.ZodObject<{
    triggerTime: z.ZodDefault<z.ZodString>;
    activityDuration: z.ZodDefault<z.ZodNumber>;
    tone: z.ZodDefault<z.ZodEnum<["brief", "detailed", "casual", "formal"]>>;
    customPrompt: z.ZodDefault<z.ZodString>;
    outputLanguage: z.ZodDefault<z.ZodString>;
    notionPageId: z.ZodOptional<z.ZodString>;
    jiraDomain: z.ZodOptional<z.ZodString>;
    jiraEmail: z.ZodOptional<z.ZodString>;
    jiraIssueKey: z.ZodOptional<z.ZodString>;
    jiraApiToken: z.ZodOptional<z.ZodString>;
    ignorePatterns: z.ZodDefault<z.ZodArray<z.ZodString, "many">>;
    enableTracking: z.ZodDefault<z.ZodBoolean>;
    trackingInterval: z.ZodDefault<z.ZodNumber>;
    maxHistorySize: z.ZodDefault<z.ZodNumber>;
    dataRetentionDays: z.ZodDefault<z.ZodNumber>;
    autoCleanupEnabled: z.ZodDefault<z.ZodBoolean>;
    cleanupIntervalDays: z.ZodDefault<z.ZodNumber>;
    maxCacheSize: z.ZodDefault<z.ZodNumber>;
    memoryProfilingEnabled: z.ZodDefault<z.ZodBoolean>;
    enableSmartAlerts: z.ZodDefault<z.ZodBoolean>;
    enableWeeklyDigest: z.ZodDefault<z.ZodBoolean>;
    enableAutoTagging: z.ZodDefault<z.ZodBoolean>;
    terminalTracking: z.ZodDefault<z.ZodOptional<z.ZodObject<{
        enabled: z.ZodDefault<z.ZodBoolean>;
        shells: z.ZodDefault<z.ZodArray<z.ZodEnum<["bash", "zsh", "powershell", "cmd", "fish"]>, "many">>;
        historyLimit: z.ZodDefault<z.ZodNumber>;
        enableRealtimeTracking: z.ZodDefault<z.ZodBoolean>;
        respectHignore: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        enabled: boolean;
        shells: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[];
        historyLimit: number;
        enableRealtimeTracking: boolean;
        respectHignore: boolean;
    }, {
        enabled?: boolean | undefined;
        shells?: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[] | undefined;
        historyLimit?: number | undefined;
        enableRealtimeTracking?: boolean | undefined;
        respectHignore?: boolean | undefined;
    }>>>;
}, "strip", z.ZodTypeAny, {
    triggerTime: string;
    activityDuration: number;
    tone: "brief" | "detailed" | "casual" | "formal";
    customPrompt: string;
    outputLanguage: string;
    ignorePatterns: string[];
    dataRetentionDays: number;
    autoCleanupEnabled: boolean;
    cleanupIntervalDays: number;
    enableTracking: boolean;
    trackingInterval: number;
    maxHistorySize: number;
    maxCacheSize: number;
    memoryProfilingEnabled: boolean;
    enableSmartAlerts: boolean;
    enableWeeklyDigest: boolean;
    enableAutoTagging: boolean;
    terminalTracking: {
        enabled: boolean;
        shells: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[];
        historyLimit: number;
        enableRealtimeTracking: boolean;
        respectHignore: boolean;
    };
    notionPageId?: string | undefined;
    jiraDomain?: string | undefined;
    jiraEmail?: string | undefined;
    jiraIssueKey?: string | undefined;
    jiraApiToken?: string | undefined;
}, {
    triggerTime?: string | undefined;
    activityDuration?: number | undefined;
    tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
    customPrompt?: string | undefined;
    outputLanguage?: string | undefined;
    ignorePatterns?: string[] | undefined;
    notionPageId?: string | undefined;
    jiraDomain?: string | undefined;
    jiraEmail?: string | undefined;
    jiraIssueKey?: string | undefined;
    dataRetentionDays?: number | undefined;
    autoCleanupEnabled?: boolean | undefined;
    cleanupIntervalDays?: number | undefined;
    jiraApiToken?: string | undefined;
    enableTracking?: boolean | undefined;
    trackingInterval?: number | undefined;
    maxHistorySize?: number | undefined;
    maxCacheSize?: number | undefined;
    memoryProfilingEnabled?: boolean | undefined;
    enableSmartAlerts?: boolean | undefined;
    enableWeeklyDigest?: boolean | undefined;
    enableAutoTagging?: boolean | undefined;
    terminalTracking?: {
        enabled?: boolean | undefined;
        shells?: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[] | undefined;
        historyLimit?: number | undefined;
        enableRealtimeTracking?: boolean | undefined;
        respectHignore?: boolean | undefined;
    } | undefined;
}>;
export type StandupConfig = z.infer<typeof StandupConfigSchema>;
/**
 * Schema for workspace-level override configuration (.standup.json)
 */
export declare const WorkspaceConfigSchema: z.ZodObject<{
    tone: z.ZodOptional<z.ZodEnum<["brief", "detailed", "casual", "formal"]>>;
    ignorePatterns: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    notionPageId: z.ZodOptional<z.ZodString>;
    jiraDomain: z.ZodOptional<z.ZodString>;
    jiraIssueKey: z.ZodOptional<z.ZodString>;
    customPrompt: z.ZodOptional<z.ZodString>;
    outputLanguage: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
    customPrompt?: string | undefined;
    outputLanguage?: string | undefined;
    ignorePatterns?: string[] | undefined;
    notionPageId?: string | undefined;
    jiraDomain?: string | undefined;
    jiraIssueKey?: string | undefined;
}, {
    tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
    customPrompt?: string | undefined;
    outputLanguage?: string | undefined;
    ignorePatterns?: string[] | undefined;
    notionPageId?: string | undefined;
    jiraDomain?: string | undefined;
    jiraIssueKey?: string | undefined;
}>;
export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;
/**
 * Schema for activity data
 */
export declare const ActivitySchema: z.ZodObject<{
    filePath: z.ZodString;
    fileName: z.ZodString;
    projectName: z.ZodOptional<z.ZodString>;
    timestamp: z.ZodNumber;
    type: z.ZodEnum<["edit", "create", "delete"]>;
    linesChanged: z.ZodOptional<z.ZodNumber>;
    language: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    type: "delete" | "edit" | "create";
    filePath: string;
    fileName: string;
    linesChanged?: number | undefined;
    projectName?: string | undefined;
    language?: string | undefined;
}, {
    timestamp: number;
    type: "delete" | "edit" | "create";
    filePath: string;
    fileName: string;
    linesChanged?: number | undefined;
    projectName?: string | undefined;
    language?: string | undefined;
}>;
export type Activity = z.infer<typeof ActivitySchema>;
/**
 * Schema for standup history entry
 */
export declare const StandupHistorySchema: z.ZodObject<{
    id: z.ZodString;
    timestamp: z.ZodNumber;
    date: z.ZodString;
    summary: z.ZodString;
    activities: z.ZodArray<z.ZodObject<{
        filePath: z.ZodString;
        fileName: z.ZodString;
        projectName: z.ZodOptional<z.ZodString>;
        timestamp: z.ZodNumber;
        type: z.ZodEnum<["edit", "create", "delete"]>;
        linesChanged: z.ZodOptional<z.ZodNumber>;
        language: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        timestamp: number;
        type: "delete" | "edit" | "create";
        filePath: string;
        fileName: string;
        linesChanged?: number | undefined;
        projectName?: string | undefined;
        language?: string | undefined;
    }, {
        timestamp: number;
        type: "delete" | "edit" | "create";
        filePath: string;
        fileName: string;
        linesChanged?: number | undefined;
        projectName?: string | undefined;
        language?: string | undefined;
    }>, "many">;
    config: z.ZodObject<{
        triggerTime: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        activityDuration: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        tone: z.ZodOptional<z.ZodDefault<z.ZodEnum<["brief", "detailed", "casual", "formal"]>>>;
        customPrompt: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        outputLanguage: z.ZodOptional<z.ZodDefault<z.ZodString>>;
        notionPageId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        jiraDomain: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        jiraEmail: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        jiraIssueKey: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        jiraApiToken: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        ignorePatterns: z.ZodOptional<z.ZodDefault<z.ZodArray<z.ZodString, "many">>>;
        enableTracking: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        trackingInterval: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        maxHistorySize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        dataRetentionDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        autoCleanupEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        cleanupIntervalDays: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        maxCacheSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        memoryProfilingEnabled: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        enableSmartAlerts: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        enableWeeklyDigest: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        enableAutoTagging: z.ZodOptional<z.ZodDefault<z.ZodBoolean>>;
        terminalTracking: z.ZodOptional<z.ZodDefault<z.ZodOptional<z.ZodObject<{
            enabled: z.ZodDefault<z.ZodBoolean>;
            shells: z.ZodDefault<z.ZodArray<z.ZodEnum<["bash", "zsh", "powershell", "cmd", "fish"]>, "many">>;
            historyLimit: z.ZodDefault<z.ZodNumber>;
            enableRealtimeTracking: z.ZodDefault<z.ZodBoolean>;
            respectHignore: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            enabled: boolean;
            shells: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[];
            historyLimit: number;
            enableRealtimeTracking: boolean;
            respectHignore: boolean;
        }, {
            enabled?: boolean | undefined;
            shells?: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[] | undefined;
            historyLimit?: number | undefined;
            enableRealtimeTracking?: boolean | undefined;
            respectHignore?: boolean | undefined;
        }>>>>;
    }, "strip", z.ZodTypeAny, {
        triggerTime?: string | undefined;
        activityDuration?: number | undefined;
        tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
        customPrompt?: string | undefined;
        outputLanguage?: string | undefined;
        ignorePatterns?: string[] | undefined;
        notionPageId?: string | undefined;
        jiraDomain?: string | undefined;
        jiraEmail?: string | undefined;
        jiraIssueKey?: string | undefined;
        dataRetentionDays?: number | undefined;
        autoCleanupEnabled?: boolean | undefined;
        cleanupIntervalDays?: number | undefined;
        jiraApiToken?: string | undefined;
        enableTracking?: boolean | undefined;
        trackingInterval?: number | undefined;
        maxHistorySize?: number | undefined;
        maxCacheSize?: number | undefined;
        memoryProfilingEnabled?: boolean | undefined;
        enableSmartAlerts?: boolean | undefined;
        enableWeeklyDigest?: boolean | undefined;
        enableAutoTagging?: boolean | undefined;
        terminalTracking?: {
            enabled: boolean;
            shells: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[];
            historyLimit: number;
            enableRealtimeTracking: boolean;
            respectHignore: boolean;
        } | undefined;
    }, {
        triggerTime?: string | undefined;
        activityDuration?: number | undefined;
        tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
        customPrompt?: string | undefined;
        outputLanguage?: string | undefined;
        ignorePatterns?: string[] | undefined;
        notionPageId?: string | undefined;
        jiraDomain?: string | undefined;
        jiraEmail?: string | undefined;
        jiraIssueKey?: string | undefined;
        dataRetentionDays?: number | undefined;
        autoCleanupEnabled?: boolean | undefined;
        cleanupIntervalDays?: number | undefined;
        jiraApiToken?: string | undefined;
        enableTracking?: boolean | undefined;
        trackingInterval?: number | undefined;
        maxHistorySize?: number | undefined;
        maxCacheSize?: number | undefined;
        memoryProfilingEnabled?: boolean | undefined;
        enableSmartAlerts?: boolean | undefined;
        enableWeeklyDigest?: boolean | undefined;
        enableAutoTagging?: boolean | undefined;
        terminalTracking?: {
            enabled?: boolean | undefined;
            shells?: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[] | undefined;
            historyLimit?: number | undefined;
            enableRealtimeTracking?: boolean | undefined;
            respectHignore?: boolean | undefined;
        } | undefined;
    }>;
    tags: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    timestamp: number;
    config: {
        triggerTime?: string | undefined;
        activityDuration?: number | undefined;
        tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
        customPrompt?: string | undefined;
        outputLanguage?: string | undefined;
        ignorePatterns?: string[] | undefined;
        notionPageId?: string | undefined;
        jiraDomain?: string | undefined;
        jiraEmail?: string | undefined;
        jiraIssueKey?: string | undefined;
        dataRetentionDays?: number | undefined;
        autoCleanupEnabled?: boolean | undefined;
        cleanupIntervalDays?: number | undefined;
        jiraApiToken?: string | undefined;
        enableTracking?: boolean | undefined;
        trackingInterval?: number | undefined;
        maxHistorySize?: number | undefined;
        maxCacheSize?: number | undefined;
        memoryProfilingEnabled?: boolean | undefined;
        enableSmartAlerts?: boolean | undefined;
        enableWeeklyDigest?: boolean | undefined;
        enableAutoTagging?: boolean | undefined;
        terminalTracking?: {
            enabled: boolean;
            shells: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[];
            historyLimit: number;
            enableRealtimeTracking: boolean;
            respectHignore: boolean;
        } | undefined;
    };
    id: string;
    date: string;
    summary: string;
    activities: {
        timestamp: number;
        type: "delete" | "edit" | "create";
        filePath: string;
        fileName: string;
        linesChanged?: number | undefined;
        projectName?: string | undefined;
        language?: string | undefined;
    }[];
    tags?: string[] | undefined;
}, {
    timestamp: number;
    config: {
        triggerTime?: string | undefined;
        activityDuration?: number | undefined;
        tone?: "brief" | "detailed" | "casual" | "formal" | undefined;
        customPrompt?: string | undefined;
        outputLanguage?: string | undefined;
        ignorePatterns?: string[] | undefined;
        notionPageId?: string | undefined;
        jiraDomain?: string | undefined;
        jiraEmail?: string | undefined;
        jiraIssueKey?: string | undefined;
        dataRetentionDays?: number | undefined;
        autoCleanupEnabled?: boolean | undefined;
        cleanupIntervalDays?: number | undefined;
        jiraApiToken?: string | undefined;
        enableTracking?: boolean | undefined;
        trackingInterval?: number | undefined;
        maxHistorySize?: number | undefined;
        maxCacheSize?: number | undefined;
        memoryProfilingEnabled?: boolean | undefined;
        enableSmartAlerts?: boolean | undefined;
        enableWeeklyDigest?: boolean | undefined;
        enableAutoTagging?: boolean | undefined;
        terminalTracking?: {
            enabled?: boolean | undefined;
            shells?: ("powershell" | "cmd" | "bash" | "zsh" | "fish")[] | undefined;
            historyLimit?: number | undefined;
            enableRealtimeTracking?: boolean | undefined;
            respectHignore?: boolean | undefined;
        } | undefined;
    };
    id: string;
    date: string;
    summary: string;
    activities: {
        timestamp: number;
        type: "delete" | "edit" | "create";
        filePath: string;
        fileName: string;
        linesChanged?: number | undefined;
        projectName?: string | undefined;
        language?: string | undefined;
    }[];
    tags?: string[] | undefined;
}>;
export type StandupHistory = z.infer<typeof StandupHistorySchema>;
/**
 * Configuration validator class
 */
export declare class ConfigValidator {
    /**
     * Validate complete Standup configuration
     */
    static validateStandupConfig(config: any): StandupConfig;
    /**
     * Validate workspace configuration
     */
    static validateWorkspaceConfig(config: any): WorkspaceConfig;
    /**
     * Validate activity data
     */
    static validateActivity(data: any): Activity;
    /**
     * Validate standup history entry
     */
    static validateStandupHistory(data: any): StandupHistory;
    /**
     * Validate a specific configuration value
     */
    static validateConfigValue(key: string, value: any): void;
    /**
     * Format Zod error into a readable message
     */
    private static formatZodError;
    /**
     * Sanitize configuration by removing unknown keys
     */
    static sanitizeConfig(config: any): any;
    /**
     * Get default configuration
     */
    static getDefaults(): StandupConfig;
    /**
     * Merge user config with defaults
     */
    static mergeWithDefaults(userConfig: any): StandupConfig;
}
/**
 * Configuration migration system
 */
export declare class ConfigMigrator {
    private static readonly CONFIG_VERSION_KEY;
    private static readonly CURRENT_VERSION;
    /**
     * Check if configuration needs migration
     */
    static needsMigration(): boolean;
    /**
     * Get current configuration version
     */
    static getCurrentVersion(): number;
    /**
     * Migrate configuration to latest version
     */
    static migrate(): Promise<void>;
    /**
     * Migration from version 1 to 2
     * - Add new settings: enableSmartAlerts, enableWeeklyDigest, enableAutoTagging
     * - Rename: trackingInterval (was hard-coded)
     */
    private static migrateV1ToV2;
    private static log;
}
/**
 * Helper function to validate configuration from VS Code
 */
export declare function loadAndValidateConfig(): Promise<StandupConfig>;
//# sourceMappingURL=ConfigValidator.d.ts.map