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
export declare class JiraService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Jira configuration from settings
     */
    private loadConfig;
    /**
     * Load API token from VS Code secrets
     */
    private loadApiToken;
    /**
     * Extract Jira issue keys from commit message
     */
    extractJiraKeys(message: string): string[];
    /**
     * Link commit to Jira issues
     */
    linkCommitToIssues(commitHash: string, commitMessage: string, branch?: string): Promise<string[]>;
    /**
     * Add remote link to Jira issue
     */
    private addRemoteLink;
    /**
     * Get commit URL (assuming GitHub/Bitbucket)
     */
    private getCommitUrl;
    /**
     * Update Jira issue status
     */
    updateIssueStatus(issueKey: string, status: string, comment?: string): Promise<void>;
    /**
     * Add comment to Jira issue
     */
    addComment(issueKey: string, comment: string): Promise<void>;
    /**
     * Get issue details
     */
    getIssue(issueKey: string): Promise<JiraIssue | null>;
    /**
     * Get all issues for current user
     */
    getUserIssues(jql?: string): Promise<JiraIssue[]>;
    /**
     * Get active sprint
     */
    getActiveSprint(): Promise<JiraSprint | null>;
    /**
     * Get sprint issues
     */
    getSprintIssues(sprintId: number): Promise<JiraIssue[]>;
    /**
     * Log work time to Jira issue
     */
    logWork(issueKey: string, timeSpentSeconds: number, comment?: string): Promise<void>;
    /**
     * Get available transitions for an issue
     */
    private getTransitions;
    /**
     * Make authenticated request to Jira API
     */
    private makeJiraRequest;
    /**
     * Test Jira connection
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
//# sourceMappingURL=JiraService.d.ts.map