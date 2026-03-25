/**
 * Jira Integration Service
 *
 * Provides enhanced Jira integration including:
 * - Auto-link commits to Jira issues
 * - Update Jira status based on activity
 * - Fetch Jira sprint data
 * - Work item tracking
 */

import * as vscode from 'vscode';
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('JiraService');

export interface JiraConfig {
    domain: string;
    email: string;
    apiToken: string;
    projectKey: string;
}

export interface JiraIssue {
    id: string;
    key: string;
    summary: string;
    status: string;
    assignee?: string;
    priority?: string;
    issuetype?: string;
    description?: string;
}

export interface JiraSprint {
    id: number;
    name: string;
    state: string;
    startDate: string;
    endDate: string;
    goal?: string;
}

export interface JiraWorkLog {
    id: string;
    issueId: string;
    timeSpent: number;
    started: string;
    comment?: string;
}

export class JiraService {
    private config: JiraConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Jira configuration from settings
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            domain: config.get<string>('jiraDomain', ''),
            email: config.get<string>('jiraEmail', ''),
            apiToken: '', // Loaded from secrets
            projectKey: '',
        };

        // Load API token from secrets
        this.loadApiToken();
    }

    /**
     * Load API token from VS Code secrets
     */
    private async loadApiToken(): Promise<void> {
        try {
            this.config!.apiToken = await this.context.secrets.get('standup.jiraToken') || '';
        } catch (error) {
            logger.error('Failed to load Jira API token', error);
        }
    }

    /**
     * Extract Jira issue keys from commit message
     */
    public extractJiraKeys(message: string): string[] {
        if (!this.config || !this.config.domain) {
            return [];
        }

        // Match Jira issue keys (e.g., PROJ-123, TASK-456)
        const jiraKeyPattern = /\b([A-Z][A-Z0-9]+-\d+)\b/g;
        const matches = message.match(jiraKeyPattern);

        return matches || [];
    }

    /**
     * Link commit to Jira issues
     */
    public async linkCommitToIssues(
        commitHash: string,
        commitMessage: string,
        branch?: string
    ): Promise<string[]> {
        if (!this.config || !this.config.apiToken) {
            logger.warn('Jira not configured');
            return [];
        }

        const jiraKeys = this.extractJiraKeys(commitMessage);
        if (jiraKeys.length === 0) {
            return [];
        }

        const linkedIssues: string[] = [];

        for (const issueKey of jiraKeys) {
            try {
                // Add remote link to commit
                await this.addRemoteLink(issueKey, commitHash, commitMessage);
                linkedIssues.push(issueKey);

                // Optionally update status
                await this.updateIssueStatus(issueKey, 'In Progress');
            } catch (error) {
                logger.error(`Failed to link commit to Jira issue ${issueKey}`, error);
            }
        }

        return linkedIssues;
    }

    /**
     * Add remote link to Jira issue
     */
    private async addRemoteLink(
        issueKey: string,
        commitHash: string,
        commitMessage: string
    ): Promise<void> {
        if (!this.config) return;

        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/remotelink`;

        const payload = {
            globalId: `commit=${commitHash}`,
            title: `Commit: ${commitHash.substring(0, 7)}`,
            url: this.getCommitUrl(commitHash),
            relationship: 'com.atlassian.jira.ext.commit'
        };

        await this.makeJiraRequest(url, 'POST', payload);
    }

    /**
     * Get commit URL (assuming GitHub/Bitbucket)
     */
    private getCommitUrl(commitHash: string): string {
        // Try to get git remote URL
        // For now, return a placeholder
        return `https://github.com/commit/${commitHash}`;
    }

    /**
     * Update Jira issue status
     */
    public async updateIssueStatus(
        issueKey: string,
        status: string,
        comment?: string
    ): Promise<void> {
        if (!this.config) return;

        // First, get valid transitions for the issue
        const transitions = await this.getTransitions(issueKey);
        const transition = transitions.find(t =>
            t.to.name.toLowerCase() === status.toLowerCase()
        );

        if (transition) {
            const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/transitions`;

            await this.makeJiraRequest(url, 'POST', {
                transition: {
                    id: transition.id
                }
            });

            if (comment) {
                await this.addComment(issueKey, comment);
            }
        }
    }

    /**
     * Add comment to Jira issue
     */
    public async addComment(issueKey: string, comment: string): Promise<void> {
        if (!this.config) return;

        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/comment`;

        await this.makeJiraRequest(url, 'POST', {
            body: comment
        });
    }

    /**
     * Get issue details
     */
    public async getIssue(issueKey: string): Promise<JiraIssue | null> {
        if (!this.config) return null;

        try {
            const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}`;
            const response = await this.makeJiraRequest(url, 'GET');

            return {
                id: response.id,
                key: response.key,
                summary: response.fields.summary,
                status: response.fields.status.name,
                assignee: response.fields.assignee?.displayName,
                priority: response.fields.priority?.name,
                issuetype: response.fields.issuetype?.name,
                description: response.fields.description,
            };
        } catch (error) {
            logger.error(`Failed to get Jira issue ${issueKey}`, error);
            return null;
        }
    }

    /**
     * Get all issues for current user
     */
    public async getUserIssues(jql?: string): Promise<JiraIssue[]> {
        if (!this.config) return [];

        try {
            // Default JQL: assignee = currentUser() AND status != Done
            const defaultJQL = `assignee = currentUser() AND status != Done ORDER BY created DESC`;
            const query = jql || defaultJQL;

            const url = `https://${this.config.domain}.atlassian.net/rest/api/3/search?jql=${encodeURIComponent(query)}`;

            const response = await this.makeJiraRequest(url, 'GET');

            return response.issues.map((issue: any) => ({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                assignee: issue.fields.assignee?.displayName,
                priority: issue.fields.priority?.name,
                issuetype: issue.fields.issuetype?.name,
            }));
        } catch (error) {
            logger.error('Failed to get Jira issues', error);
            return [];
        }
    }

    /**
     * Get active sprint
     */
    public async getActiveSprint(): Promise<JiraSprint | null> {
        if (!this.config || !this.config.projectKey) return null;

        try {
            const url = `https://${this.config.domain}.atlassian.net/rest/agile/1.0/sprint/query?jql=${encodeURIComponent(`project = ${this.config.projectKey} AND state = active`)}`;

            const response = await this.makeJiraRequest(url, 'GET');

            if (response.values && response.values.length > 0) {
                const sprint = response.values[0];
                return {
                    id: sprint.id,
                    name: sprint.name,
                    state: sprint.state,
                    startDate: sprint.startDate,
                    endDate: sprint.endDate,
                    goal: sprint.goal,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to get active sprint', error);
            return null;
        }
    }

    /**
     * Get sprint issues
     */
    public async getSprintIssues(sprintId: number): Promise<JiraIssue[]> {
        if (!this.config) return [];

        try {
            const url = `https://${this.config.domain}.atlassian.net/rest/agile/1.0/sprint/${sprintId}/issue`;

            const response = await this.makeJiraRequest(url, 'GET');

            return response.issues.map((issue: any) => ({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                assignee: issue.fields.assignee?.displayName,
                priority: issue.fields.priority?.name,
                issuetype: issue.fields.issuetype?.name,
            }));
        } catch (error) {
            logger.error(`Failed to get sprint ${sprintId} issues`, error);
            return [];
        }
    }

    /**
     * Log work time to Jira issue
     */
    public async logWork(
        issueKey: string,
        timeSpentSeconds: number,
        comment?: string
    ): Promise<void> {
        if (!this.config) return;

        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/worklog`;

        await this.makeJiraRequest(url, 'POST', {
            timeSpentSeconds,
            comment,
            started: new Date().toISOString(),
        });
    }

    /**
     * Get available transitions for an issue
     */
    private async getTransitions(issueKey: string): Promise<any[]> {
        if (!this.config) return [];

        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/transitions`;
        const response = await this.makeJiraRequest(url, 'GET');

        return response.transitions || [];
    }

    /**
     * Make authenticated request to Jira API
     */
    private async makeJiraRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT',
        data?: any
    ): Promise<any> {
        if (!this.config) {
            throw new Error('Jira not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            if (!this.config) {
                reject(new Error('Jira configuration not loaded'));
                return;
            }

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Basic ${Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64')}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
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
                        reject(new Error(`Jira API error (${res.statusCode}): ${responseData}`));
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
     * Test Jira connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.domain) {
            throw new Error('Jira not configured. Please set jiraDomain in settings.');
        }

        try {
            const currentUser = await this.getCurrentUser();
            return !!currentUser;
        } catch (error) {
            logger.error('Jira connection test failed', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    private async getCurrentUser(): Promise<any> {
        if (!this.config) {
            throw new Error('Jira configuration not loaded');
        }
        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/myself`;
        return await this.makeJiraRequest(url, 'GET');
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
