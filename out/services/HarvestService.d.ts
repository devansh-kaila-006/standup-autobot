/**
 * Harvest Time Tracking Integration Service
 *
 * Provides Harvest integration including:
 * - Fetch time entries for standup generation
 * - Project and client tracking
 * - Task management
 * - Invoice and expense tracking
 * - Productivity analysis
 */
import * as vscode from 'vscode';
export interface HarvestConfig {
    accountId: string;
    accessToken: string;
    apiUrl: string;
}
export interface HarvestTimeEntry {
    id: number;
    spentDate: string;
    hours: number;
    roundedHours: number;
    notes?: string;
    isLocked: boolean;
    isClosed: boolean;
    isBilled: boolean;
    timerStartedAt?: string;
    startedAt?: string;
    endedAt?: string;
    isRunning: boolean;
    billable: boolean;
    billableStatus: string;
    projectId?: number;
    taskId?: number;
    userId: number;
    createdAt: string;
    updatedAt: string;
}
export interface HarvestProject {
    id: number;
    name: string;
    code?: string;
    clientId?: number;
    isActive: boolean;
    isBillable: boolean;
    isFixedFee: boolean;
    billBy: string;
    hourlyRate?: number;
    budget?: number;
    budgetIsMonthly: boolean;
    notifyWhenOverBudget: boolean;
    overBudgetNotificationPercentage: number;
    showBudgetToAll: boolean;
    costBudget?: number;
    costBudgetIncludeExpenses: boolean;
    fee?: number;
    feeBy: string;
    notes?: string;
    startsOn?: string;
    endsOn?: string;
}
export interface HarvestClient {
    id: number;
    name: string;
    isActive: boolean;
    currency: string;
}
export interface HarvestTask {
    id: number;
    name: string;
    billableByDefault: boolean;
    defaultHourlyRate: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface HarvestUser {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    telephone?: string;
    timezone: string;
    hasAccessToAllFutureProjects: boolean;
    isAdmin: boolean;
    isProjectManager: boolean;
    canSeeRates: boolean;
    canCreateProjects: boolean;
    canCreateInvoices: boolean;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
export interface HarvestSummary {
    title: string;
    timeEntries: HarvestTimeEntry[];
    totalHours: number;
    byProject: Map<string, number>;
    byTask: Map<string, number>;
}
export declare class HarvestService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Harvest configuration
     */
    private loadConfig;
    /**
     * Load access token from secrets
     */
    private loadAccessToken;
    /**
     * Get time entries for date range
     */
    getTimeEntries(startDate: Date, endDate: Date): Promise<HarvestTimeEntry[]>;
    /**
     * Get time entries for today
     */
    getTodayTimeEntries(): Promise<HarvestTimeEntry[]>;
    /**
     * Get time entries for yesterday
     */
    getYesterdayTimeEntries(): Promise<HarvestTimeEntry[]>;
    /**
     * Get projects
     */
    getProjects(): Promise<HarvestProject[]>;
    /**
     * Get clients
     */
    getClients(): Promise<HarvestClient[]>;
    /**
     * Get tasks
     */
    getTasks(): Promise<HarvestTask[]>;
    /**
     * Get current user
     */
    getCurrentUser(): Promise<HarvestUser | null>;
    /**
     * Create time entry
     */
    createTimeEntry(projectId: number, taskId: number, spentDate: string, hours: number, notes?: string): Promise<HarvestTimeEntry | null>;
    /**
     * Start timer for task
     */
    startTimer(projectId: number, taskId: number, notes?: string): Promise<HarvestTimeEntry | null>;
    /**
     * Stop running timer
     */
    stopRunningTimer(): Promise<HarvestTimeEntry | null>;
    /**
     * Generate summary for standup
     */
    generateSummary(dateRange: 'today' | 'yesterday' | 'week'): Promise<HarvestSummary>;
    /**
     * Make authenticated request to Harvest API
     */
    private makeHarvestRequest;
    /**
     * Test Harvest connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=HarvestService.d.ts.map