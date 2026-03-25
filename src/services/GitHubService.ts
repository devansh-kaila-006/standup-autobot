/**
 * GitHub Issues Integration Service
 *
 * Provides GitHub Issues integration including:
 * - Link activities to issues
 * - Auto-update issue status
 * - Pull request tracking
 * - Issue management
 */

import * as vscode from 'vscode';
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('GitHubService');

export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
    apiUrl: string;
}

export interface GitHubIssue {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
    assignee?: string;
    labels: string[];
    pull_request?: {
        html_url: string;
        merged: boolean;
        draft: boolean;
    };
    body?: string;
    created_at: string;
    updated_at: string;
}

export interface GitHubComment {
    id: number;
    body: string;
    user: string;
    created_at: string;
}

export class GitHubService {
    private config: GitHubConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load GitHub configuration
     */
    private loadConfig(): void {
        this.loadGitRemoteInfo();
        this.loadApiToken();
    }

    /**
     * Load API token from secrets
     */
    private async loadApiToken(): Promise<void> {
        try {
            const token = await this.context.secrets.get('standup.githubToken') || '';
            if (this.config) {
                this.config.token = token;
            }
        } catch (error) {
            logger.error('Failed to load GitHub token', error);
        }
    }

    /**
     * Load git remote info to get owner/repo
     */
    private async loadGitRemoteInfo(): Promise<void> {
        try {
            // Get git remote info from workspace
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                logger.warn('No workspace folder found');
                return;
            }

            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            // Get GitHub remote URL
            const { stdout } = await execAsync('git remote get-url origin', {
                cwd: workspaceFolder.uri.fsPath,
            });

            const match = stdout.match(/github\.com[:/]([^/]+)\/([^/]+)\.git/);
            if (match) {
                this.config = {
                    token: '',
                    owner: match[1],
                    repo: match[2].replace('.git', ''),
                    apiUrl: 'https://api.github.com',
                };
            }
        } catch (error) {
            logger.error('Failed to load git remote info', error);
        }
    }

    /**
     * Extract GitHub issue/PR references from message
     */
    public extractGitHubReferences(message: string): string[] {
        const patterns = [
            /#(\d+)\b/g,                    // #123
            /([a-zA-Z0-9_-]+\/\d+)\/\d+/g,  // owner/repo/123/456
            /([a-zA-Z0-9_-]+)#(\d+)/g,        // owner/repo#123
        ];

        const refs: string[] = [];

        for (const pattern of patterns) {
            const matches = message.match(pattern);
            if (matches) {
                refs.push(...matches);
            }
        }

        return Array.from(new Set(refs)); // Remove duplicates
    }

    /**
     * Link activity to GitHub issues
     */
    public async linkActivityToIssues(
        activityType: 'commit' | 'pr' | 'issue',
        details: {
            hash?: string;
            message?: string;
            branch?: string;
            files?: string[];
        }
    ): Promise<number[]> {
        if (!this.config || !this.config.token) {
            logger.warn('GitHub not configured');
            return [];
        }

        const linkedIssues: number[] = [];
        const message = details.message || '';

        // Extract issue/PR numbers from message
        const refs = this.extractGitHubReferences(message);

        for (const ref of refs) {
            try {
                // Parse the reference to get issue number
                const issueNumber = this.extractIssueNumber(ref);
                if (!issueNumber) continue;

                // Add comment to issue
                const comment = this.formatActivityComment(activityType, details);
                await this.addIssueComment(issueNumber, comment);
                linkedIssues.push(issueNumber);

                // If it's a PR, we can also check if it should be linked
                if (activityType === 'pr') {
                    await this.updatePRStatus(issueNumber);
                }
            } catch (error) {
                logger.error(`Failed to link activity to GitHub issue ${ref}`, error);
            }
        }

        return linkedIssues;
    }

    /**
     * Extract issue number from reference
     */
    private extractIssueNumber(ref: string): number | null {
        // Extract number from various formats:
        // #123 -> 123
        // owner/repo#123 -> 123
        // owner/repo/123/456 -> 456 (PR)
        const match = ref.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : null;
    }

    /**
     * Format activity as a comment
     */
    private formatActivityComment(
        activityType: 'commit' | 'pr' | 'issue',
        details: {
            hash?: string;
            message?: string;
            branch?: string;
            files?: string[];
        }
    ): string {
        const lines: string[] = [];

        if (activityType === 'commit') {
            lines.push('### Standup Autobot Activity');
            lines.push('');
            lines.push(`**Commit**: ${details.hash ? details.hash.substring(0, 7) : 'N/A'}`);
            if (details.message) {
                lines.push(`**Message**: ${details.message}`);
            }
            if (details.files && details.files.length > 0) {
                lines.push('');
                lines.push('**Files changed**:');
                details.files.slice(0, 10).forEach(file => {
                    lines.push(`- ${file}`);
                });
                if (details.files.length > 10) {
                    lines.push(`- ... and ${details.files.length - 10} more`);
                }
            }
            lines.push('');
            lines.push(`*Automatically generated by Standup Autobot on ${new Date().toISOString()}*`);
        }

        return lines.join('\n');
    }

    /**
     * Add comment to GitHub issue
     */
    public async addIssueComment(
        issueNumber: number,
        comment: string
    ): Promise<void> {
        if (!this.config) return;

        const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}/comments`;

        await this.makeGitHubRequest(url, 'POST', { body: comment });
    }

    /**
     * Get issue details
     */
    public async getIssue(issueNumber: number): Promise<GitHubIssue | null> {
        if (!this.config) return null;

        try {
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}`;
            const response = await this.makeGitHubRequest(url, 'GET');

            return {
                id: response.id,
                number: response.number,
                title: response.title,
                state: response.state,
                assignee: response.assignee?.login,
                labels: response.labels.map((l: any) => l.name),
                pull_request: response.pull_request,
                body: response.body,
                created_at: response.created_at,
                updated_at: response.updated_at,
            };
        } catch (error) {
            logger.error(`Failed to get GitHub issue ${issueNumber}`, error);
            return null;
        }
    }

    /**
     * Get user's open issues
     */
    public async getUserIssues(state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
        if (!this.config) return [];

        try {
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues?state=${state}&per_page=100`;
            const response = await this.makeGitHubRequest(url, 'GET');

            return response.map((issue: any) => ({
                id: issue.id,
                number: issue.number,
                title: issue.title,
                state: issue.state,
                assignee: issue.assignee?.login,
                labels: issue.labels.map((l: any) => l.name),
                pull_request: issue.pull_request,
                created_at: issue.created_at,
                updated_at: issue.updated_at,
            }));
        } catch (error) {
            logger.error('Failed to get GitHub issues', error);
            return [];
        }
    }

    /**
     * Get pull requests
     */
    public async getPullRequests(state: 'open' | 'closed' | 'all' = 'open'): Promise<GitHubIssue[]> {
        if (!this.config) return [];

        try {
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/pulls?state=${state}&per_page=100`;
            const response = await this.makeGitHubRequest(url, 'GET');

            return response.map((pr: any) => ({
                id: pr.id,
                number: pr.number,
                title: pr.title,
                state: pr.state,
                assignee: pr.assignee?.login,
                labels: pr.labels.map((l: any) => l.name),
                pull_request: {
                    html_url: pr.html_url,
                    merged: pr.merged,
                    draft: pr.draft,
                },
                body: pr.body,
                created_at: pr.created_at,
                updated_at: pr.updated_at,
            }));
        } catch (error) {
            logger.error('Failed to get pull requests', error);
            return [];
        }
    }

    /**
     * Update issue status
     */
    public async updateIssueStatus(
        issueNumber: number,
        state: 'open' | 'closed',
        comment?: string
    ): Promise<void> {
        if (!this.config) return;

        const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}`;

        const data: any = { state };
        if (comment) {
            data.body = comment;
        }

        await this.makeGitHubRequest(url, 'PATCH', data);
    }

    /**
     * Add label to issue
     */
    public async addLabel(issueNumber: number, label: string): Promise<void> {
        if (!this.config) return;

        const issue = await this.getIssue(issueNumber);
        if (!issue) return;

        const labels = [...issue.labels, label];
        const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues/${issueNumber}`;

        await this.makeGitHubRequest(url, 'PATCH', { labels });
    }

    /**
     * Create new issue
     */
    public async createIssue(
        title: string,
        body: string,
        labels?: string[],
        assignees?: string[]
    ): Promise<GitHubIssue | null> {
        if (!this.config) return null;

        try {
            const url = `${this.config.apiUrl}/repos/${this.config.owner}/${this.config.repo}/issues`;
            const data: any = {
                title,
                body,
            };

            if (labels && labels.length > 0) {
                data.labels = labels;
            }

            if (assignees && assignees.length > 0) {
                data.assignees = assignees;
            }

            const response = await this.makeGitHubRequest(url, 'POST', data);

            return {
                id: response.id,
                number: response.number,
                title: response.title,
                state: response.state,
                assignee: response.assignee?.login,
                labels: response.labels.map((l: any) => l.name),
                body: response.body,
                created_at: response.created_at,
                updated_at: response.updated_at,
            };
        } catch (error) {
            logger.error('Failed to create GitHub issue', error);
            return null;
        }
    }

    /**
     * Update PR status
     */
    private async updatePRStatus(prNumber: number): Promise<void> {
        // This is a placeholder - actual implementation would check PR status
        // and potentially update labels or add comments
        logger.info(`Checking PR ${prNumber} status`);
    }

    /**
     * Make authenticated request to GitHub API
     */
    private async makeGitHubRequest(
        url: string,
        method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.token) {
            throw new Error('GitHub not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.config?.token || ''}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'Standup-Autobot',
                    ...(data && { 'Content-Type': 'application/json' }),
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
                        reject(new Error(`GitHub API error (${res.statusCode}): ${responseData}`));
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
     * Test GitHub connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.token) {
            throw new Error('GitHub not configured. Please set GitHub token.');
        }

        try {
            const user = await this.getCurrentUser();
            return !!user;
        } catch (error) {
            logger.error('GitHub connection test failed', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    private async getCurrentUser(): Promise<any> {
        const url = `${this.config?.apiUrl || 'https://api.github.com'}/user`;
        return await this.makeGitHubRequest(url, 'GET');
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
