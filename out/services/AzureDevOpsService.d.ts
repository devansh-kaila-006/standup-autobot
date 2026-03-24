/**
 * Azure DevOps Integration Service
 *
 * Provides Azure DevOps integration including:
 * - Work item tracking and linking
 * - Pull request management
 * - Build and release pipeline integration
 * - Commit to work item association
 * - Test case management
 */
import * as vscode from 'vscode';
export interface AzureDevOpsConfig {
    organization: string;
    project: string;
    pat: string;
    apiUrl: string;
}
export interface AzureWorkItem {
    id: number;
    rev: number;
    identifier: string;
    workItemType: string;
    title: string;
    state: string;
    assignedTo?: string;
    priority?: number;
    severity?: string;
    tags: string[];
    url: string;
    createdDate: string;
    changedDate: string;
}
export interface AzurePullRequest {
    id: number;
    title: string;
    description: string;
    status: 'active' | 'abandoned' | 'completed';
    createdBy: string;
    createdDate: string;
    sourceRefName: string;
    targetRefName: string;
    mergeStatus: string;
    reviewers: AzureReviewer[];
    url: string;
}
export interface AzureReviewer {
    reviewerUrl: string;
    vote: number;
    displayName: string;
}
export interface AzureBuild {
    id: number;
    buildNumber: string;
    status: string;
    result: string;
    sourceBranch: string;
    sourceVersion: string;
    priority: number;
    reason: string;
    queueTime: string;
    startTime: string;
    finishTime: string;
    url: string;
}
export interface AzureRelease {
    id: number;
    name: string;
    status: string;
    createdOn: string;
    modifiedOn: string;
    environments: AzureEnvironment[];
}
export interface AzureEnvironment {
    id: number;
    name: string;
    status: string;
    releaseDeployments: AzureDeployment[];
}
export interface AzureDeployment {
    id: number;
    status: string;
    completedOn: string;
}
export declare class AzureDevOpsService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Azure DevOps configuration
     */
    private loadConfig;
    /**
     * Load API token from secrets
     */
    private loadApiToken;
    /**
     * Extract work item IDs from commit message
     */
    extractWorkItemIds(message: string): number[];
    /**
     * Link commit to Azure DevOps work items
     */
    linkCommitToWorkItems(commitHash: string, commitMessage: string, branch?: string): Promise<number[]>;
    /**
     * Format commit as a comment
     */
    private formatCommitComment;
    /**
     * Add comment to work item
     */
    addWorkItemComment(workItemId: number, comment: string): Promise<void>;
    /**
     * Get work item details
     */
    getWorkItem(workItemId: number): Promise<AzureWorkItem | null>;
    /**
     * Get work items for current user
     */
    getUserWorkItems(state?: string): Promise<AzureWorkItem[]>;
    /**
     * Get work items by IDs
     */
    private getWorkItemsByIds;
    /**
     * Update work item state
     */
    updateWorkItemState(workItemId: number, state: string, comment?: string): Promise<void>;
    /**
     * Get pull requests
     */
    getPullRequests(status?: 'active' | 'abandoned' | 'completed'): Promise<AzurePullRequest[]>;
    /**
     * Get pull requests for current user
     */
    getUserPullRequests(): Promise<AzurePullRequest[]>;
    /**
     * Get builds
     */
    getBuilds(branchFilter?: string): Promise<AzureBuild[]>;
    /**
     * Get releases
     */
    getReleases(): Promise<AzureRelease[]>;
    /**
     * Create new work item
     */
    createWorkItem(workItemType: string, title: string, description?: string, assignedTo?: string, tags?: string[]): Promise<AzureWorkItem | null>;
    /**
     * Make authenticated request to Azure DevOps API
     */
    private makeAzureRequest;
    /**
     * Test Azure DevOps connection
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
//# sourceMappingURL=AzureDevOpsService.d.ts.map