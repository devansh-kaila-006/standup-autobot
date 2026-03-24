"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TogglService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger();
class TogglService {
    constructor(context) {
        this.context = context;
        this.config = null;
        this.loadConfig();
    }
    /**
     * Load Toggl configuration
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('standup');
        this.config = {
            apiToken: '', // Loaded from secrets
            workspaceId: config.get('togglWorkspaceId', ''),
            apiUrl: 'https://api.track.toggl.com',
        };
        this.loadApiToken();
    }
    /**
     * Load API token from secrets
     */
    async loadApiToken() {
        try {
            const token = await this.context.secrets.get('standup.togglApiToken') || '';
            if (this.config) {
                this.config.apiToken = token;
            }
        }
        catch (error) {
            logger.error('Failed to load Toggl API token', error);
        }
    }
    /**
     * Get time entries for date range
     */
    async getTimeEntries(startDate, endDate) {
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
                return response.data.map((entry) => ({
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
        }
        catch (error) {
            logger.error('Failed to get Toggl time entries', error);
            return [];
        }
    }
    /**
     * Get time entries for today
     */
    async getTodayTimeEntries() {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        return await this.getTimeEntries(startOfDay, endOfDay);
    }
    /**
     * Get time entries for yesterday
     */
    async getYesterdayTimeEntries() {
        const now = new Date();
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        return await this.getTimeEntries(startOfYesterday, endOfYesterday);
    }
    /**
     * Get projects
     */
    async getProjects() {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }
        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/projects`;
            const response = await this.makeTogglRequest(url, 'GET');
            if (Array.isArray(response)) {
                return response.map((project) => ({
                    id: project.id,
                    name: project.name,
                    clientId: project.cid,
                    color: project.color,
                    active: project.active,
                }));
            }
            return [];
        }
        catch (error) {
            logger.error('Failed to get Toggl projects', error);
            return [];
        }
    }
    /**
     * Get clients
     */
    async getClients() {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }
        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/clients`;
            const response = await this.makeTogglRequest(url, 'GET');
            if (Array.isArray(response)) {
                return response.map((client) => ({
                    id: client.id,
                    name: client.name,
                }));
            }
            return [];
        }
        catch (error) {
            logger.error('Failed to get Toggl clients', error);
            return [];
        }
    }
    /**
     * Get tasks for project
     */
    async getTasks(projectId) {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return [];
        }
        try {
            const url = `${this.config.apiUrl}/api/v8/workspaces/${this.config.workspaceId}/projects/${projectId}/tasks`;
            const response = await this.makeTogglRequest(url, 'GET');
            if (Array.isArray(response)) {
                return response.map((task) => ({
                    id: task.id,
                    name: task.name,
                    projectId: task.pid,
                    active: task.active,
                }));
            }
            return [];
        }
        catch (error) {
            logger.error('Failed to get Toggl tasks', error);
            return [];
        }
    }
    /**
     * Create time entry
     */
    async createTimeEntry(description, projectId, taskId, tags) {
        if (!this.config || !this.config.apiToken || !this.config.workspaceId) {
            logger.warn('Toggl not configured');
            return null;
        }
        try {
            const url = `${this.config.apiUrl}/api/v8/time_entries`;
            const timeEntryData = {
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
        }
        catch (error) {
            logger.error('Failed to create Toggl time entry', error);
            return null;
        }
    }
    /**
     * Stop running time entry
     */
    async stopRunningTimeEntry() {
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
        }
        catch (error) {
            logger.error('Failed to stop Toggl time entry', error);
            return null;
        }
    }
    /**
     * Get current running time entry
     */
    async getCurrentTimeEntry() {
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
        }
        catch (error) {
            logger.error('Failed to get current Toggl time entry', error);
            return null;
        }
    }
    /**
     * Generate summary for standup
     */
    async generateSummary(dateRange) {
        let startDate;
        let endDate;
        const now = new Date();
        if (dateRange === 'today') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        }
        else if (dateRange === 'yesterday') {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
            endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
        }
        else {
            // Week - last 7 days
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            endDate = now;
        }
        const timeEntries = await this.getTimeEntries(startDate, endDate);
        const projects = await this.getProjects();
        const byProject = new Map();
        const byTag = new Map();
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
    async makeTogglRequest(url, method, data) {
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
                        }
                        catch {
                            resolve(responseData);
                        }
                    }
                    else {
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
    async testConnection() {
        if (!this.config || !this.config.apiToken) {
            throw new Error('Toggl not configured. Please set API token.');
        }
        try {
            const user = await this.getCurrentUser();
            return !!user;
        }
        catch (error) {
            logger.error('Toggl connection test failed', error);
            return false;
        }
    }
    /**
     * Get current user info
     */
    async getCurrentUser() {
        const url = `${this.config.apiUrl}/api/v8/me`;
        return await this.makeTogglRequest(url, 'GET');
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.TogglService = TogglService;
//# sourceMappingURL=TogglService.js.map