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
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('HarvestService');

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

export class HarvestService {
    private config: HarvestConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Harvest configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            accountId: config.get<string>('harvestAccountId', ''),
            accessToken: '', // Loaded from secrets
            apiUrl: 'https://api.harvestapp.com/v2',
        };

        this.loadAccessToken();
    }

    /**
     * Load access token from secrets
     */
    private async loadAccessToken(): Promise<void> {
        try {
            const token = await this.context.secrets.get('standup.harvestAccessToken') || '';
            if (this.config) {
                this.config.accessToken = token;
            }
        } catch (error) {
            logger.error('Failed to load Harvest access token', error);
        }
    }

    /**
     * Get time entries for date range
     */
    public async getTimeEntries(startDate: Date, endDate: Date): Promise<HarvestTimeEntry[]> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return [];
        }

        try {
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];

            const url = `${this.config.apiUrl}/time_entries?from=${startDateStr}&to=${endDateStr}`;

            const response = await this.makeHarvestRequest(url, 'GET');

            if (response.time_entries) {
                return response.time_entries.map((entry: any) => ({
                    id: entry.id,
                    spentDate: entry.spent_date,
                    hours: entry.hours,
                    roundedHours: entry.rounded_hours,
                    notes: entry.notes,
                    isLocked: entry.is_locked,
                    isClosed: entry.is_closed,
                    isBilled: entry.is_billed,
                    timerStartedAt: entry.timer_started_at,
                    startedAt: entry.started_at,
                    endedAt: entry.ended_at,
                    isRunning: entry.is_running,
                    billable: entry.billable,
                    billableStatus: entry.billable_status,
                    projectId: entry.project?.id,
                    taskId: entry.task?.id,
                    userId: entry.user?.id,
                    createdAt: entry.created_at,
                    updatedAt: entry.updated_at,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Harvest time entries', error);
            return [];
        }
    }

    /**
     * Get time entries for today
     */
    public async getTodayTimeEntries(): Promise<HarvestTimeEntry[]> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        return await this.getTimeEntries(startOfDay, endOfDay);
    }

    /**
     * Get time entries for yesterday
     */
    public async getYesterdayTimeEntries(): Promise<HarvestTimeEntry[]> {
        const now = new Date();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

        return await this.getTimeEntries(startOfYesterday, endOfYesterday);
    }

    /**
     * Get projects
     */
    public async getProjects(): Promise<HarvestProject[]> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/projects`;
            const response = await this.makeHarvestRequest(url, 'GET');

            if (response.projects) {
                return response.projects.map((project: any) => ({
                    id: project.id,
                    name: project.name,
                    code: project.code,
                    clientId: project.client?.id,
                    isActive: project.is_active,
                    isBillable: project.is_billable,
                    isFixedFee: project.is_fixed_fee,
                    billBy: project.bill_by,
                    hourlyRate: project.hourly_rate,
                    budget: project.budget,
                    budgetIsMonthly: project.budget_is_monthly,
                    notifyWhenOverBudget: project.notify_when_over_budget,
                    overBudgetNotificationPercentage: project.over_budget_notification_percentage,
                    showBudgetToAll: project.show_budget_to_all,
                    costBudget: project.cost_budget,
                    costBudgetIncludeExpenses: project.cost_budget_include_expenses,
                    fee: project.fee,
                    feeBy: project.fee_by,
                    notes: project.notes,
                    startsOn: project.starts_on,
                    endsOn: project.ends_on,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Harvest projects', error);
            return [];
        }
    }

    /**
     * Get clients
     */
    public async getClients(): Promise<HarvestClient[]> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/clients`;
            const response = await this.makeHarvestRequest(url, 'GET');

            if (response.clients) {
                return response.clients.map((client: any) => ({
                    id: client.id,
                    name: client.name,
                    isActive: client.is_active,
                    currency: client.currency,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Harvest clients', error);
            return [];
        }
    }

    /**
     * Get tasks
     */
    public async getTasks(): Promise<HarvestTask[]> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/tasks`;
            const response = await this.makeHarvestRequest(url, 'GET');

            if (response.tasks) {
                return response.tasks.map((task: any) => ({
                    id: task.id,
                    name: task.name,
                    billableByDefault: task.billable_by_default,
                    defaultHourlyRate: task.default_hourly_rate,
                    isActive: task.is_active,
                    createdAt: task.created_at,
                    updatedAt: task.updated_at,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Harvest tasks', error);
            return [];
        }
    }

    /**
     * Get current user
     */
    public async getCurrentUser(): Promise<HarvestUser | null> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return null;
        }

        try {
            const url = `${this.config.apiUrl}/users/me`;
            const response = await this.makeHarvestRequest(url, 'GET');

            if (response) {
                return {
                    id: response.id,
                    firstName: response.first_name,
                    lastName: response.last_name,
                    email: response.email,
                    telephone: response.telephone,
                    timezone: response.timezone,
                    hasAccessToAllFutureProjects: response.has_access_to_all_future_projects,
                    isAdmin: response.is_admin,
                    isProjectManager: response.is_project_manager,
                    canSeeRates: response.can_see_rates,
                    canCreateProjects: response.can_create_projects,
                    canCreateInvoices: response.can_create_invoices,
                    isActive: response.is_active,
                    createdAt: response.created_at,
                    updatedAt: response.updated_at,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to get Harvest current user', error);
            return null;
        }
    }

    /**
     * Create time entry
     */
    public async createTimeEntry(
        projectId: number,
        taskId: number,
        spentDate: string,
        hours: number,
        notes?: string
    ): Promise<HarvestTimeEntry | null> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return null;
        }

        try {
            const url = `${this.config.apiUrl}/time_entries`;

            const timeEntryData: any = {
                project_id: projectId,
                task_id: taskId,
                spent_date: spentDate,
                hours,
            };

            if (notes) {
                timeEntryData.notes = notes;
            }

            const response = await this.makeHarvestRequest(url, 'POST', timeEntryData);

            if (response) {
                return {
                    id: response.id,
                    spentDate: response.spent_date,
                    hours: response.hours,
                    roundedHours: response.rounded_hours,
                    notes: response.notes,
                    isLocked: response.is_locked,
                    isClosed: response.is_closed,
                    isBilled: response.is_billed,
                    isRunning: response.is_running,
                    billable: response.billable,
                    billableStatus: response.billable_status,
                    projectId: response.project?.id,
                    taskId: response.task?.id,
                    userId: response.user?.id,
                    createdAt: response.created_at,
                    updatedAt: response.updated_at,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to create Harvest time entry', error);
            return null;
        }
    }

    /**
     * Start timer for task
     */
    public async startTimer(
        projectId: number,
        taskId: number,
        notes?: string
    ): Promise<HarvestTimeEntry | null> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return null;
        }

        try {
            const url = `${this.config.apiUrl}/time_entries`;

            const timeEntryData: any = {
                project_id: projectId,
                task_id: taskId,
                started_at: new Date().toISOString(),
            };

            if (notes) {
                timeEntryData.notes = notes;
            }

            const response = await this.makeHarvestRequest(url, 'POST', timeEntryData);

            if (response) {
                return {
                    id: response.id,
                    spentDate: response.spent_date,
                    hours: response.hours,
                    roundedHours: response.rounded_hours,
                    notes: response.notes,
                    isLocked: response.is_locked,
                    isClosed: response.is_closed,
                    isBilled: response.is_billed,
                    isRunning: response.is_running,
                    billable: response.billable,
                    billableStatus: response.billable_status,
                    projectId: response.project?.id,
                    taskId: response.task?.id,
                    userId: response.user?.id,
                    createdAt: response.created_at,
                    updatedAt: response.updated_at,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to start Harvest timer', error);
            return null;
        }
    }

    /**
     * Stop running timer
     */
    public async stopRunningTimer(): Promise<HarvestTimeEntry | null> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            logger.warn('Harvest not configured');
            return null;
        }

        try {
            // Get current user's running time entry
            const currentUser = await this.getCurrentUser();
            if (!currentUser) {
                return null;
            }

            const todayEntries = await this.getTodayTimeEntries();
            const runningEntry = todayEntries.find(entry => entry.isRunning && entry.userId === currentUser.id);

            if (!runningEntry) {
                return null;
            }

            const url = `${this.config.apiUrl}/time_entries/${runningEntry.id}/stop`;
            const response = await this.makeHarvestRequest(url, 'PATCH', {});

            if (response) {
                return {
                    id: response.id,
                    spentDate: response.spent_date,
                    hours: response.hours,
                    roundedHours: response.rounded_hours,
                    notes: response.notes,
                    isLocked: response.is_locked,
                    isClosed: response.is_closed,
                    isBilled: response.is_billed,
                    isRunning: response.is_running,
                    billable: response.billable,
                    billableStatus: response.billable_status,
                    projectId: response.project?.id,
                    taskId: response.task?.id,
                    userId: response.user?.id,
                    createdAt: response.created_at,
                    updatedAt: response.updated_at,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to stop Harvest timer', error);
            return null;
        }
    }

    /**
     * Generate summary for standup
     */
    public async generateSummary(dateRange: 'today' | 'yesterday' | 'week'): Promise<HarvestSummary> {
        let startDate: Date;
        let endDate: Date;
        const now = new Date();

        if (dateRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        } else if (dateRange === 'yesterday') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        } else {
            // Week - last 7 days
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
        }

        const timeEntries = await this.getTimeEntries(startDate, endDate);
        const projects = await this.getProjects();
        const tasks = await this.getTasks();

        const byProject = new Map<string, number>();
        const byTask = new Map<string, number>();
        let totalHours = 0;

        for (const entry of timeEntries) {
            const hours = entry.hours;
            totalHours += hours;

            // Group by project
            if (entry.projectId) {
                const project = projects.find(p => p.id === entry.projectId);
                const projectName = project ? project.name : 'Unknown Project';
                byProject.set(projectName, (byProject.get(projectName) || 0) + hours);
            }

            // Group by task
            if (entry.taskId) {
                const task = tasks.find(t => t.id === entry.taskId);
                const taskName = task ? task.name : 'Unknown Task';
                byTask.set(taskName, (byTask.get(taskName) || 0) + hours);
            }
        }

        return {
            title: `Time Summary for ${dateRange}`,
            timeEntries,
            totalHours,
            byProject,
            byTask,
        };
    }

    /**
     * Make authenticated request to Harvest API
     */
    private async makeHarvestRequest(
        url: string,
        method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            throw new Error('Harvest not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Harvest-Account-Id': this.config.accountId,
                    'User-Agent': 'Standup Autobot',
                    'Content-Type': 'application/json',
                },
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            resolve(JSON.parse(responseData));
                        } catch {
                            resolve(responseData);
                        }
                    } else {
                        reject(new Error(`Harvest API error (${res.statusCode}): ${responseData}`));
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Test Harvest connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.accessToken || !this.config.accountId) {
            throw new Error('Harvest not configured. Please set account ID and access token.');
        }

        try {
            const user = await this.getCurrentUser();
            return !!user;
        } catch (error) {
            logger.error('Harvest connection test failed', error);
            return false;
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
