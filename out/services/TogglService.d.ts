/**
 * Toggl Time Tracking Integration Service
 *
 * Provides Toggl integration including:
 * - Fetch time entries for standup generation
 * - Project and client tracking
 * - Report generation
 * - Task categorization
 * - Productivity analysis
 */
import * as vscode from 'vscode';
export interface TogglConfig {
    apiToken: string;
    workspaceId: string;
    apiUrl: string;
}
export interface TogglTimeEntry {
    id: number;
    description: string;
    projectId?: number;
    taskId?: number;
    billable: boolean;
    start: string;
    end: string;
    duration: number;
    tags?: string[];
}
export interface TogglProject {
    id: number;
    name: string;
    clientId?: number;
    color: string;
    active: boolean;
}
export interface TogglClient {
    id: number;
    name: string;
}
export interface TogglTask {
    id: number;
    name: string;
    projectId: number;
    active: boolean;
}
export interface TogglSummary {
    title: string;
    timeEntries: TogglTimeEntry[];
    totalTime: number;
    byProject: Map<string, number>;
    byTag: Map<string, number>;
}
export declare class TogglService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Toggl configuration
     */
    private loadConfig;
    /**
     * Load API token from secrets
     */
    private loadApiToken;
    /**
     * Get time entries for date range
     */
    getTimeEntries(startDate: Date, endDate: Date): Promise<TogglTimeEntry[]>;
    /**
     * Get time entries for today
     */
    getTodayTimeEntries(): Promise<TogglTimeEntry[]>;
    /**
     * Get time entries for yesterday
     */
    getYesterdayTimeEntries(): Promise<TogglTimeEntry[]>;
    /**
     * Get projects
     */
    getProjects(): Promise<TogglProject[]>;
    /**
     * Get clients
     */
    getClients(): Promise<TogglClient[]>;
    /**
     * Get tasks for project
     */
    getTasks(projectId: number): Promise<TogglTask[]>;
    /**
     * Create time entry
     */
    createTimeEntry(description: string, projectId?: number, taskId?: number, tags?: string[]): Promise<TogglTimeEntry | null>;
    /**
     * Stop running time entry
     */
    stopRunningTimeEntry(): Promise<TogglTimeEntry | null>;
    /**
     * Get current running time entry
     */
    getCurrentTimeEntry(): Promise<TogglTimeEntry | null>;
    /**
     * Generate summary for standup
     */
    generateSummary(dateRange: 'today' | 'yesterday' | 'week'): Promise<TogglSummary>;
    /**
     * Make authenticated request to Toggl API
     */
    private makeTogglRequest;
    /**
     * Test Toggl connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Get current user info
     */
    private getCurrentUser;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=TogglService.d.ts.map