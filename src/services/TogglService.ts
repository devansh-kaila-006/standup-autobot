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
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('TogglService');

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

export class TogglService {
    private config: TogglConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Toggl configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            apiToken: '', // Loaded from secrets
            workspaceId: config.get<string>('togglWorkspaceId', ''),
            apiUrl: 'https://api.track.toggl.com',
        };

        this.loadApiToken();
    }

    /**
     * Load API token from secrets
     */
    private async loadApiToken(): Promise<void> {
        try {
            const token = await this.context.secrets.get('standup.togglApiToken') || '';
            if (this.config) {
                this.config.apiToken = token;
            }
        } catch (error) {
            logger.error('Failed to load Toggl API token', error);
        }
    }

    /**
     * Get time entries for date range
     */
    public async getTimeEntries(startDate: Date, endDate: Date): Promise<TogglTimeEntry[]> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }

        try {
            const startDateStr = startDate.toISOString();
            const endDateStr = endDate.toISOString();

            const url = `${this.config.apiUrl}/reports/api/v2/details?workspace_id=${this.config.workspaceId}&since=${startDateStr}&until=${endDateStr}&user_agent=standup_autobot`;

            const response = await this.makeTogglRequest(url, 'GET');

            if (response.data) {
                return response.data.map((entry: any) => ({
                    id: entry.id,
                    description: entry.description || '',
                    projectId: entry.pid,
                    taskId: entry.tid,
                    billable: entry.billable,
                    start: entry.start,
                    end: entry.end,
                    duration: entry.dur,
                    tags: entry.tags || [],
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Toggl time entries', error);
            return [];
        }
    }

    /**
     * Get time entries for today
     */
    public async getTodayTimeEntries(): Promise<TogglTimeEntry[]> {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        return await this.getTimeEntries(startOfDay, endOfDay);
    }

    /**
     * Get time entries for yesterday
     */
    public async getYesterdayTimeEntries(): Promise<TogglTimeEntry[]> {
        const now = new Date();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);

        return await this.getTimeEntries(startOfYesterday, endOfYesterday);
    }

    /**
     * Get projects
     */
    public async getProjects(): Promise<TogglProject[]> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/projects`;
            const response = await this.makeTogglRequest(url, 'GET');

            if (Array.isArray(response)) {
                return response.map((project: any) => ({
                    id: project.id,
                    name: project.name,
                    clientId: project.cid,
                    color: project.color,
                    active: project.active,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Toggl projects', error);
            return [];
        }
    }

    /**
     * Get clients
     */
    public async getClients(): Promise<TogglClient[]> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/clients`;
            const response = await this.makeTogglRequest(url, 'GET');

            if (Array.isArray(response)) {
                return response.map((client: any) => ({
                    id: client.id,
                    name: client.name,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Toggl clients', error);
            return [];
        }
    }

    /**
     * Get tasks for project
     */
    public async getTasks(projectId: number): Promise<TogglTask[]> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }

        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/projects/${projectId}/tasks`;
            const response = await this.makeTogglRequest(url, 'GET');

            if (Array.isArray(response)) {
                return response.map((task: any) => ({
                    id: task.id,
                    name: task.name,
                    projectId: task.pid,
                    active: task.active,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Toggl tasks', error);
            return [];
        }
    }

    /**
     * Create time entry
     */
    public async createTimeEntry(
        description: string,
        projectId?: number,
        taskId?: number,
        tags?: string[]
    ): Promise<TogglTimeEntry | null> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return null;
        }

        try {
            const url = `${this.config.apiUrl}/api/v8/time_entries`;

            const timeEntryData: any = {
                time_entry: {
                    description,
                    wid: parseInt(this.config.workspaceId),
                    start: new Date().toISOString(),
                    duration: -1, // -1 means running
                    created_with: 'Standup Autobot',
                },
            };

            if (projectId) {
                timeEntryData.time_entry.pid = projectId;
            }

            if (taskId) {
                timeEntryData.time_entry.tid = taskId;
            }

            if (tags && tags.length > 0) {
                timeEntryData.time_entry.tags = tags;
            }

            const response = await this.makeTogglRequest(url, 'POST', timeEntryData);

            if (response.data) {
                return {
                    id: response.data.id,
                    description: response.data.description,
                    projectId: response.data.pid,
                    taskId: response.data.tid,
                    billable: response.data.billable,
                    start: response.data.start,
                    end: response.data.stop,
                    duration: response.data.duration,
                    tags: response.data.tags || [],
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to create Toggl time entry', error);
            return null;
        }
    }

    /**
     * Stop running time entry
     */
    public async stopRunningTimeEntry(): Promise<TogglTimeEntry | null> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return null;
        }

        try {
            // Get current time entry
            const currentEntry = await this.getCurrentTimeEntry();
            if (!currentEntry) {
                return null;
            }

            const url = `${this.config.apiUrl}/api/v8/time_entries/${currentEntry.id}/stop`;
            const response = await this.makeTogglRequest(url, 'PUT');

            if (response.data) {
                return {
                    id: response.data.id,
                    description: response.data.description,
                    projectId: response.data.pid,
                    taskId: response.data.tid,
                    billable: response.data.billable,
                    start: response.data.start,
                    end: response.data.stop,
                    duration: response.data.duration,
                    tags: response.data.tags || [],
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to stop Toggl time entry', error);
            return null;
        }
    }

    /**
     * Get current running time entry
     */
    public async getCurrentTimeEntry(): Promise<TogglTimeEntry | null> {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return null;
        }

        try {
            const url = `${this.config.apiUrl}/api/v8/time_entries/current`;
            const response = await this.makeTogglRequest(url, 'GET');

            if (response && response.data) {
                return {
                    id: response.data.id,
                    description: response.data.description,
                    projectId: response.data.pid,
                    taskId: response.data.tid,
                    billable: response.data.billable,
                    start: response.data.start,
                    end: response.data.stop,
                    duration: response.data.duration,
                    tags: response.data.tags || [],
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to get current Toggl time entry', error);
            return null;
        }
    }

    /**
     * Generate summary for standup
     */
    public async generateSummary(dateRange: 'today' | 'yesterday' | 'week'): Promise<TogglSummary> {
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

        const byProject = new Map<string, number>();
        const byTag = new Map<string, number>();
        let totalTime = 0;

        for (const entry of timeEntries) {
            const durationMs = entry.duration;
            totalTime += durationMs;

            // Group by project
            if (entry.projectId) {
                const project = projects.find(p => p.id === entry.projectId);
                const projectName = project ? project.name : 'Unknown Project';
                byProject.set(projectName, (byProject.get(projectName) || 0) + durationMs);
            }

            // Group by tags
            if (entry.tags) {
                for (const tag of entry.tags) {
                    byTag.set(tag, (byTag.get(tag) || 0) + durationMs);
                }
            }
        }

        return {
            title: `Time Summary for ${dateRange}`,
            timeEntries,
            totalTime,
            byProject,
            byTag,
        };
    }

    /**
     * Make authenticated request to Toggl API
     */
    private async makeTogglRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.apiToken) {
            throw new Error('Toggl not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': 'Basic ' + Buffer.from(this.config.apiToken + ':api_token').toString('base64'),
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
                        reject(new Error(`Toggl API error (${res.statusCode}): ${responseData}`));
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
     * Test Toggl connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.apiToken) {
            throw new Error('Toggl not configured. Please set API token.');
        }

        try {
            const user = await this.getCurrentUser();
            return !!user;
        } catch (error) {
            logger.error('Toggl connection test failed', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    private async getCurrentUser(): Promise<any> {
        const url = `${this.config.apiUrl}/api/v8/me`;
        return await this.makeTogglRequest(url, 'GET');
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
