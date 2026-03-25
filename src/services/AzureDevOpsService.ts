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
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('AzureDevOpsService');

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

export class AzureDevOpsService {
    private config: AzureDevOpsConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Azure DevOps configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            organization: config.get<string>('azureOrganization', ''),
            project: config.get<string>('azureProject', ''),
            pat: '', // Loaded from secrets
            apiUrl: 'https://dev.azure.com',
        };

        this.loadApiToken();
    }

    /**
     * Load API token from secrets
     */
    private async loadApiToken(): Promise<void> {
        try {
            const pat = await this.context.secrets.get('standup.azurePat') || '';
            if (this.config) {
                this.config.pat = pat;
            }
        } catch (error) {
            logger.error('Failed to load Azure DevOps PAT', error);
        }
    }

    /**
     * Extract work item IDs from commit message
     */
    public extractWorkItemIds(message: string): number[] {
        const patterns = [
            /#(\d+)\b/g,                      // #12345
            /(work[ -]?item)[:\s]+(\d+)/gi,   // work item 12345, work-item: 12345
            /(wi)[:\s]+(\d+)/gi,              // wi 12345
        ];

        const workItemIds = new Set<number>();

        for (const pattern of patterns) {
            const matches = Array.from(message.matchAll(pattern));
            for (const match of matches) {
                const id = parseInt(match[match.length - 1], 10);
                if (!isNaN(id)) {
                    workItemIds.add(id);
                }
            }
        }

        return Array.from(workItemIds);
    }

    /**
     * Link commit to Azure DevOps work items
     */
    public async linkCommitToWorkItems(
        commitHash: string,
        commitMessage: string,
        branch?: string
    ): Promise<number[]> {
        if (!this.config || !this.config.pat) {
            logger.warn('Azure DevOps not configured');
            return [];
        }

        const workItemIds = this.extractWorkItemIds(commitMessage);
        if (workItemIds.length === 0) {
            return [];
        }

        const linkedItems: number[] = [];

        for (const workItemId of workItemIds) {
            try {
                // Add comment to work item
                const comment = this.formatCommitComment(commitHash, commitMessage, branch);
                await this.addWorkItemComment(workItemId, comment);
                linkedItems.push(workItemId);

                // Optionally update state
                await this.updateWorkItemState(workItemId, 'Active');
            } catch (error) {
                logger.error(`Failed to link commit to work item ${workItemId}`, error);
            }
        }

        return linkedItems;
    }

    /**
     * Format commit as a comment
     */
    private formatCommitComment(
        commitHash: string,
        commitMessage: string,
        branch?: string
    ): string {
        const lines: string[] = [];

        lines.push('### Standup Autobot Activity');
        lines.push('');
        lines.push(`**Commit**: ${commitHash.substring(0, 7)}`);
        if (commitMessage) {
            lines.push(`**Message**: ${commitMessage}`);
        }
        if (branch) {
            lines.push(`**Branch**: ${branch}`);
        }
        lines.push('');
        lines.push(`*Automatically generated by Standup Autobot on ${new Date().toISOString()}*`);

        return lines.join('\n');
    }

    /**
     * Add comment to work item
     */
    public async addWorkItemComment(workItemId: number, comment: string): Promise<void> {
        if (!this.config) return;

        const url = `${this.config.apiUrl}/${this.config.organization}/_apis/wit/workitems/${workItemId}/comments?api-version=7.0`;

        await this.makeAzureRequest(url, 'POST', { text: comment });
    }

    /**
     * Get work item details
     */
    public async getWorkItem(workItemId: number): Promise<AzureWorkItem | null> {
        if (!this.config) return null;

        try {
            const url = `${this.config.apiUrl}/${this.config.organization}/_apis/wit/workitems/${workItemId}?api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'GET');

            const fields = response.fields;

            return {
                id: response.id,
                rev: response.rev,
                identifier: fields['System.WorkItemType'] + ' ' + response.id,
                workItemType: fields['System.WorkItemType'],
                title: fields['System.Title'],
                state: fields['System.State'],
                assignedTo: fields['System.AssignedTo']?.displayName,
                priority: fields['Microsoft.VSTS.Common.Priority'],
                severity: fields['Microsoft.VSTS.Common.Severity'],
                tags: fields['System.Tags']?.split(';').filter((t: string) => t.trim()) || [],
                url: response.url,
                createdDate: fields['System.CreatedDate'],
                changedDate: fields['System.ChangedDate'],
            };
        } catch (error) {
            logger.error(`Failed to get work item ${workItemId}`, error);
            return null;
        }
    }

    /**
     * Get work items for current user
     */
    public async getUserWorkItems(state?: string): Promise<AzureWorkItem[]> {
        if (!this.config) return [];

        try {
            // Build WIQL query
            const wiql = {
                query: `SELECT [System.Id], [System.WorkItemType], [System.Title], [System.State], [System.AssignedTo], [System.Tags]
                        FROM WorkItems
                        WHERE [System.TeamProject] = '${this.config.project}'
                        ${state ? `AND [System.State] = '${state}'` : ''}
                        AND [System.AssignedTo] = @Me
                        ORDER BY [System.ChangedDate] DESC`
            };

            const url = `${this.config.apiUrl}/${this.config.organization}/_apis/wit/wiql?api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'POST', wiql);

            if (response.workItems && response.workItems.length > 0) {
                const ids = response.workItems.map((wi: any) => wi.id);
                return await this.getWorkItemsByIds(ids);
            }

            return [];
        } catch (error) {
            logger.error('Failed to get user work items', error);
            return [];
        }
    }

    /**
     * Get work items by IDs
     */
    private async getWorkItemsByIds(ids: number[]): Promise<AzureWorkItem[]> {
        if (!this.config || ids.length === 0) return [];

        try {
            const idsStr = ids.join(',');
            const url = `${this.config.apiUrl}/${this.config.organization}/_apis/wit/workitems?ids=${idsStr}&api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'GET');

            const workItems: AzureWorkItem[] = [];

            for (const item of response.value) {
                const fields = item.fields;
                workItems.push({
                    id: item.id,
                    rev: item.rev,
                    identifier: fields['System.WorkItemType'] + ' ' + item.id,
                    workItemType: fields['System.WorkItemType'],
                    title: fields['System.Title'],
                    state: fields['System.State'],
                    assignedTo: fields['System.AssignedTo']?.displayName,
                    priority: fields['Microsoft.VSTS.Common.Priority'],
                    severity: fields['Microsoft.VSTS.Common.Severity'],
                    tags: fields['System.Tags']?.split(';').filter((t: string) => t.trim()) || [],
                    url: item.url,
                    createdDate: fields['System.CreatedDate'],
                    changedDate: fields['System.ChangedDate'],
                });
            }

            return workItems;
        } catch (error) {
            logger.error('Failed to get work items by IDs', error);
            return [];
        }
    }

    /**
     * Update work item state
     */
    public async updateWorkItemState(
        workItemId: number,
        state: string,
        comment?: string
    ): Promise<void> {
        if (!this.config) return;

        const workItem = await this.getWorkItem(workItemId);
        if (!workItem) return;

        // First, get the valid transitions for this work item type
        const url = `${this.config.apiUrl}/${this.config.organization}/_apis/wit/workitems/${workItemId}?api-version=7.0`;

        const patchDoc = [
            {
                op: 'add',
                path: '/fields/System.State',
                value: state,
            },
        ];

        await this.makeAzureRequest(url, 'PATCH', patchDoc);

        if (comment) {
            await this.addWorkItemComment(workItemId, comment);
        }
    }

    /**
     * Get pull requests
     */
    public async getPullRequests(status: 'active' | 'abandoned' | 'completed' = 'active'): Promise<AzurePullRequest[]> {
        if (!this.config) return [];

        try {
            const url = `${this.config.apiUrl}/${this.config.organization}/_apis/git/pullrequests?searchTarget.repoName=${this.config.project}&status=${status}&api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'GET');

            return response.value.map((pr: any) => ({
                id: pr.pullRequestId,
                title: pr.title,
                description: pr.description,
                status: pr.status,
                createdBy: pr.createdBy.displayName,
                createdDate: pr.creationDate,
                sourceRefName: pr.sourceRefName,
                targetRefName: pr.targetRefName,
                mergeStatus: pr.mergeStatus,
                reviewers: pr.reviewers || [],
                url: pr.url,
            }));
        } catch (error) {
            logger.error('Failed to get pull requests', error);
            return [];
        }
    }

    /**
     * Get pull requests for current user
     */
    public async getUserPullRequests(): Promise<AzurePullRequest[]> {
        if (!this.config) return [];

        try {
            const url = `${this.config.apiUrl}/${this.config.organization}/_apis/git/pullrequests?searchTarget.repoName=${this.config.project}&creatorId=@me&status=active&api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'GET');

            return response.value.map((pr: any) => ({
                id: pr.pullRequestId,
                title: pr.title,
                description: pr.description,
                status: pr.status,
                createdBy: pr.createdBy.displayName,
                createdDate: pr.creationDate,
                sourceRefName: pr.sourceRefName,
                targetRefName: pr.targetRefName,
                mergeStatus: pr.mergeStatus,
                reviewers: pr.reviewers || [],
                url: pr.url,
            }));
        } catch (error) {
            logger.error('Failed to get user pull requests', error);
            return [];
        }
    }

    /**
     * Get builds
     */
    public async getBuilds(branchFilter?: string): Promise<AzureBuild[]> {
        if (!this.config) return [];

        try {
            let url = `${this.config.apiUrl}/${this.config.organization}/${this.config.project}/_apis/build/builds?api-version=7.0`;

            if (branchFilter) {
                url += `&branchName=${branchFilter}`;
            }

            const response = await this.makeAzureRequest(url, 'GET');

            return response.value.map((build: any) => ({
                id: build.id,
                buildNumber: build.buildNumber,
                status: build.status,
                result: build.result,
                sourceBranch: build.sourceBranch,
                sourceVersion: build.sourceVersion,
                priority: build.priority,
                reason: build.reason,
                queueTime: build.queueTime,
                startTime: build.startTime,
                finishTime: build.finishTime,
                url: build.url,
            }));
        } catch (error) {
            logger.error('Failed to get builds', error);
            return [];
        }
    }

    /**
     * Get releases
     */
    public async getReleases(): Promise<AzureRelease[]> {
        if (!this.config) return [];

        try {
            const url = `${this.config.apiUrl}/${this.config.organization}/${this.config.project}/_apis/release/releases?api-version=7.0`;
            const response = await this.makeAzureRequest(url, 'GET');

            return response.value.map((release: any) => ({
                id: release.id,
                name: release.name,
                status: release.status,
                createdOn: release.createdOn,
                modifiedOn: release.modifiedOn,
                environments: release.environments || [],
            }));
        } catch (error) {
            logger.error('Failed to get releases', error);
            return [];
        }
    }

    /**
     * Create new work item
     */
    public async createWorkItem(
        workItemType: string,
        title: string,
        description?: string,
        assignedTo?: string,
        tags?: string[]
    ): Promise<AzureWorkItem | null> {
        if (!this.config) return null;

        try {
            const url = `${this.config.apiUrl}/${this.config.organization}/${this.config.project}/_apis/wit/workitems/$${workItemType}?api-version=7.0`;

            const patchDoc = [
                {
                    op: 'add',
                    path: '/fields/System.Title',
                    value: title,
                },
            ];

            if (description) {
                patchDoc.push({
                    op: 'add',
                    path: '/fields/System.Description',
                    value: description,
                });
            }

            if (assignedTo) {
                patchDoc.push({
                    op: 'add',
                    path: '/fields/System.AssignedTo',
                    value: assignedTo,
                });
            }

            if (tags && tags.length > 0) {
                patchDoc.push({
                    op: 'add',
                    path: '/fields/System.Tags',
                    value: tags.join(';'),
                });
            }

            const response = await this.makeAzureRequest(url, 'PATCH', patchDoc);

            const fields = response.fields;

            return {
                id: response.id,
                rev: response.rev,
                identifier: fields['System.WorkItemType'] + ' ' + response.id,
                workItemType: fields['System.WorkItemType'],
                title: fields['System.Title'],
                state: fields['System.State'],
                assignedTo: fields['System.AssignedTo']?.displayName,
                priority: fields['Microsoft.VSTS.Common.Priority'],
                tags: fields['System.Tags']?.split(';').filter((t: string) => t.trim()) || [],
                url: response.url,
                createdDate: fields['System.CreatedDate'],
                changedDate: fields['System.ChangedDate'],
            };
        } catch (error) {
            logger.error('Failed to create work item', error);
            return null;
        }
    }

    /**
     * Make authenticated request to Azure DevOps API
     */
    private async makeAzureRequest(
        url: string,
        method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.pat) {
            throw new Error('Azure DevOps not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Basic ${Buffer.from(':' + (this.config?.pat || '')).toString('base64')}`,
                    'Accept': 'application/json',
                    'Content-Type': method === 'PATCH' ? 'application/json-patch+json' : 'application/json',
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
                        reject(new Error(`Azure DevOps API error (${res.statusCode}): ${responseData}`));
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
     * Test Azure DevOps connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.pat) {
            throw new Error('Azure DevOps not configured. Please set organization, project, and PAT.');
        }

        try {
            const user = await this.getCurrentUser();
            return !!user;
        } catch (error) {
            logger.error('Azure DevOps connection test failed', error);
            return false;
        }
    }

    /**
     * Get current user info
     */
    private async getCurrentUser(): Promise<any> {
        const url = `${this.config?.apiUrl || 'https://dev.azure.com'}/${this.config?.organization || ''}/_apis/connections/connections?api-version=7.0`;
        return await this.makeAzureRequest(url, 'GET');
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
