"use strict";
/**
 * Jira Integration Service
 *
 * Provides enhanced Jira integration including:
 * - Auto-link commits to Jira issues
 * - Update Jira status based on activity
 * - Fetch Jira sprint data
 * - Work item tracking
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
exports.JiraService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('JiraService');
class JiraService {
    constructor(context) {
        this.context = context;
        this.config = null;
        this.loadConfig();
    }
    /**
     * Load Jira configuration from settings
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('standup');
        this.config = {
            domain: config.get('jiraDomain', ''),
            email: config.get('jiraEmail', ''),
            apiToken: '', // Loaded from secrets
            projectKey: '',
        };
        // Load API token from secrets
        this.loadApiToken();
    }
    /**
     * Load API token from VS Code secrets
     */
    async loadApiToken() {
        try {
            this.config.apiToken = await this.context.secrets.get('standup.jiraToken') || '';
        }
        catch (error) {
            logger.error('Failed to load Jira API token', error);
        }
    }
    /**
     * Extract Jira issue keys from commit message
     */
    extractJiraKeys(message) {
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
    async linkCommitToIssues(commitHash, commitMessage, branch) {
        if (!this.config || !this.config.apiToken) {
            logger.warn('Jira not configured');
            return [];
        }
        const jiraKeys = this.extractJiraKeys(commitMessage);
        if (jiraKeys.length === 0) {
            return [];
        }
        const linkedIssues = [];
        for (const issueKey of jiraKeys) {
            try {
                // Add remote link to commit
                await this.addRemoteLink(issueKey, commitHash, commitMessage);
                linkedIssues.push(issueKey);
                // Optionally update status
                await this.updateIssueStatus(issueKey, 'In Progress');
            }
            catch (error) {
                logger.error(`Failed to link commit to Jira issue ${issueKey}`, error);
            }
        }
        return linkedIssues;
    }
    /**
     * Add remote link to Jira issue
     */
    async addRemoteLink(issueKey, commitHash, commitMessage) {
        if (!this.config)
            return;
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
    getCommitUrl(commitHash) {
        // Try to get git remote URL
        // For now, return a placeholder
        return `https://github.com/commit/${commitHash}`;
    }
    /**
     * Update Jira issue status
     */
    async updateIssueStatus(issueKey, status, comment) {
        if (!this.config)
            return;
        // First, get valid transitions for the issue
        const transitions = await this.getTransitions(issueKey);
        const transition = transitions.find(t => t.to.name.toLowerCase() === status.toLowerCase());
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
    async addComment(issueKey, comment) {
        if (!this.config)
            return;
        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/comment`;
        await this.makeJiraRequest(url, 'POST', {
            body: comment
        });
    }
    /**
     * Get issue details
     */
    async getIssue(issueKey) {
        if (!this.config)
            return null;
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
        }
        catch (error) {
            logger.error(`Failed to get Jira issue ${issueKey}`, error);
            return null;
        }
    }
    /**
     * Get all issues for current user
     */
    async getUserIssues(jql) {
        if (!this.config)
            return [];
        try {
            // Default JQL: assignee = currentUser() AND status != Done
            const defaultJQL = `assignee = currentUser() AND status != Done ORDER BY created DESC`;
            const query = jql || defaultJQL;
            const url = `https://${this.config.domain}.atlassian.net/rest/api/3/search?jql=${encodeURIComponent(query)}`;
            const response = await this.makeJiraRequest(url, 'GET');
            return response.issues.map((issue) => ({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                assignee: issue.fields.assignee?.displayName,
                priority: issue.fields.priority?.name,
                issuetype: issue.fields.issuetype?.name,
            }));
        }
        catch (error) {
            logger.error('Failed to get Jira issues', error);
            return [];
        }
    }
    /**
     * Get active sprint
     */
    async getActiveSprint() {
        if (!this.config || !this.config.projectKey)
            return null;
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
        }
        catch (error) {
            logger.error('Failed to get active sprint', error);
            return null;
        }
    }
    /**
     * Get sprint issues
     */
    async getSprintIssues(sprintId) {
        if (!this.config)
            return [];
        try {
            const url = `https://${this.config.domain}.atlassian.net/rest/agile/1.0/sprint/${sprintId}/issue`;
            const response = await this.makeJiraRequest(url, 'GET');
            return response.issues.map((issue) => ({
                id: issue.id,
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                assignee: issue.fields.assignee?.displayName,
                priority: issue.fields.priority?.name,
                issuetype: issue.fields.issuetype?.name,
            }));
        }
        catch (error) {
            logger.error(`Failed to get sprint ${sprintId} issues`, error);
            return [];
        }
    }
    /**
     * Log work time to Jira issue
     */
    async logWork(issueKey, timeSpentSeconds, comment) {
        if (!this.config)
            return;
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
    async getTransitions(issueKey) {
        if (!this.config)
            return [];
        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/issue/${issueKey}/transitions`;
        const response = await this.makeJiraRequest(url, 'GET');
        return response.transitions || [];
    }
    /**
     * Make authenticated request to Jira API
     */
    async makeJiraRequest(url, method, data) {
        if (!this.config) {
            throw new Error('Jira not configured');
        }
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
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
                        }
                        catch {
                            resolve(responseData);
                        }
                    }
                    else {
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
    async testConnection() {
        if (!this.config || !this.config.domain) {
            throw new Error('Jira not configured. Please set jiraDomain in settings.');
        }
        try {
            const currentUser = await this.getCurrentUser();
            return !!currentUser;
        }
        catch (error) {
            logger.error('Jira connection test failed', error);
            return false;
        }
    }
    /**
     * Get current user info
     */
    async getCurrentUser() {
        const url = `https://${this.config.domain}.atlassian.net/rest/api/3/myself`;
        return await this.makeJiraRequest(url, 'GET');
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.JiraService = JiraService;
//# sourceMappingURL=JiraService.js.map