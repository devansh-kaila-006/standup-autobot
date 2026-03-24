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
export declare class GitHubService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load GitHub configuration
     */
    private loadConfig;
    /**
     * Load API token from secrets
     */
    private loadApiToken;
    /**
     * Load git remote info to get owner/repo
     */
    private loadGitRemoteInfo;
    /**
     * Extract GitHub issue/PR references from message
     */
    extractGitHubReferences(message: string): string[];
    /**
     * Link activity to GitHub issues
     */
    linkActivityToIssues(activityType: 'commit' | 'pr' | 'issue', details: {
        hash?: string;
        message?: string;
        branch?: string;
        files?: string[];
    }): Promise<number[]>;
    /**
     * Extract issue number from reference
     */
    private extractIssueNumber;
    /**
     * Format activity as a comment
     */
    private formatActivityComment;
    /**
     * Add comment to GitHub issue
     */
    addIssueComment(issueNumber: number, comment: string): Promise<void>;
    /**
     * Get issue details
     */
    getIssue(issueNumber: number): Promise<GitHubIssue | null>;
    /**
     * Get user's open issues
     */
    getUserIssues(state?: 'open' | 'closed' | 'all'): Promise<GitHubIssue[]>;
    /**
     * Get pull requests
     */
    getPullRequests(state?: 'open' | 'closed' | 'all'): Promise<GitHubIssue[]>;
    /**
     * Update issue status
     */
    updateIssueStatus(issueNumber: number, state: 'open' | 'closed', comment?: string): Promise<void>;
    /**
     * Add label to issue
     */
    addLabel(issueNumber: number, label: string): Promise<void>;
    /**
     * Create new issue
     */
    createIssue(title: string, body: string, labels?: string[], assignees?: string[]): Promise<GitHubIssue | null>;
    /**
     * Update PR status
     */
    private updatePRStatus;
    /**
     * Make authenticated request to GitHub API
     */
    private makeGitHubRequest;
    /**
     * Test GitHub connection
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
//# sourceMappingURL=GitHubService.d.ts.map