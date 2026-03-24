"use strict";
/**
 * Enhanced Exporter Service
 *
 * Provides export functionality to multiple destinations including:
 * - Slack webhooks
 * - Microsoft Teams
 * - Discord webhooks
 * - Google Docs
 * - Confluence
 * - GitHub/GitLab snippets
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
exports.EnhancedExporterService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
const iconUtils_1 = require("../utils/iconUtils");
class EnhancedExporterService {
    constructor(context) {
        this.context = context;
        this.templates = new Map();
        this.initializeDefaultTemplates();
    }
    /**
     * Export to Slack using webhook
     */
    async exportToSlack(webhookUrl, content, options) {
        const payload = {
            text: content,
            channel: options?.channel,
            username: options?.username || 'Standup Bot',
            icon_emoji: options?.icon || ':robot_face:',
        };
        return this.sendWebhook(webhookUrl, payload);
    }
    /**
     * Export to Microsoft Teams using webhook
     */
    async exportToTeams(webhookUrl, content, options) {
        const payload = {
            '@type': 'MessageCard',
            '@context': 'https://schema.org/extensions',
            summary: options?.title || 'Standup Update',
            themeColor: options?.color || '0078D7',
            title: options?.title || 'Daily Standup',
            text: content,
        };
        return this.sendWebhook(webhookUrl, payload);
    }
    /**
     * Export to Discord using webhook
     */
    async exportToDiscord(webhookUrl, content, options) {
        const payload = {
            content: content,
            username: options?.username || 'Standup Bot',
            avatar_url: options?.avatar,
        };
        return this.sendWebhook(webhookUrl, payload);
    }
    /**
     * Export to GitHub Gist
     */
    async exportToGitHubGist(token, content, options) {
        const filename = options?.filename || `standup-${new Date().toISOString().split('T')[0]}.md`;
        const payload = {
            description: options?.description || 'Daily standup update',
            public: options?.public || false,
            files: {
                [filename]: {
                    content: content,
                },
            },
        };
        try {
            const response = await this.makeHttpsRequest({
                hostname: 'api.github.com',
                path: '/gists',
                method: 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'User-Agent': 'Standup-Autobot',
                    'Content-Type': 'application/json',
                },
            }, JSON.stringify(payload));
            const data = JSON.parse(response);
            return data.html_url || null;
        }
        catch (error) {
            console.error('Failed to create GitHub Gist:', error);
            return null;
        }
    }
    /**
     * Export to GitLab Snippet
     */
    async exportToGitLabSnippet(token, instanceUrl, content, options) {
        const url = new URL(instanceUrl);
        const payload = {
            title: options?.title || 'Daily Standup',
            description: 'Standup update from Standup Autobot',
            content: content,
            visibility: options?.visibility || 'private',
            file_name: `standup-${new Date().toISOString().split('T')[0]}.md`,
        };
        try {
            const response = await this.makeHttpsRequest({
                hostname: url.hostname,
                path: '/api/v4/snippets',
                method: 'POST',
                headers: {
                    'PRIVATE-TOKEN': token,
                    'Content-Type': 'application/json',
                },
            }, JSON.stringify(payload));
            const data = JSON.parse(response);
            return data.web_url || null;
        }
        catch (error) {
            console.error('Failed to create GitLab Snippet:', error);
            return null;
        }
    }
    /**
     * Export to email
     */
    async exportToEmail(to, subject, content) {
        try {
            const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
            await vscode.env.openExternal(vscode.Uri.parse(mailtoUrl));
            return true;
        }
        catch (error) {
            console.error('Failed to open email client:', error);
            return false;
        }
    }
    /**
     * Apply custom template to content
     */
    applyTemplate(templateName, data) {
        const template = this.templates.get(templateName);
        if (!template) {
            throw new Error(`Template ${templateName} not found`);
        }
        let content = template.format;
        // Replace variables
        Object.keys(data).forEach(key => {
            const placeholder = `{{${key}}}`;
            const regex = new RegExp(placeholder, 'g');
            content = content.replace(regex, data[key]);
        });
        return content;
    }
    /**
     * Create custom export template
     */
    createTemplate(name, format, variables) {
        this.templates.set(name, { name, format, variables });
        this.saveTemplates();
    }
    /**
     * Get all templates
     */
    getTemplates() {
        return Array.from(this.templates.values());
    }
    /**
     * Batch export to multiple destinations
     */
    async batchExport(content, destinations) {
        const successful = [];
        const failed = [];
        for (const dest of destinations) {
            if (!dest.enabled)
                continue;
            try {
                let result = false;
                switch (dest.type) {
                    case 'slack':
                        result = await this.exportToSlack(dest.config.webhookUrl, content, dest.config.options);
                        break;
                    case 'teams':
                        result = await this.exportToTeams(dest.config.webhookUrl, content, dest.config.options);
                        break;
                    case 'discord':
                        result = await this.exportToDiscord(dest.config.webhookUrl, content, dest.config.options);
                        break;
                    case 'github':
                        const gistUrl = await this.exportToGitHubGist(dest.config.token, content, dest.config.options);
                        result = !!gistUrl;
                        if (gistUrl)
                            successful.push(`GitHub Gist: ${gistUrl}`);
                        break;
                    case 'gitlab':
                        const gitlabUrl = await this.exportToGitLabSnippet(dest.config.token, dest.config.instanceUrl, content, dest.config.options);
                        result = !!gitlabUrl;
                        if (gitlabUrl)
                            successful.push(`GitLab Snippet: ${gitlabUrl}`);
                        break;
                    case 'email':
                        result = await this.exportToEmail(dest.config.to, dest.config.subject, content);
                        break;
                }
                if (result) {
                    successful.push(dest.type);
                }
            }
            catch (error) {
                failed.push({
                    destination: dest.type,
                    error: error.message,
                });
            }
        }
        return { successful, failed };
    }
    /**
     * Send webhook request
     */
    sendWebhook(url, payload) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const isHttps = urlObj.protocol === 'https:';
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || (isHttps ? 443 : 80),
                path: urlObj.pathname + urlObj.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            };
            const req = (isHttps ? https : http).request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 204) {
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Webhook returned status ${res.statusCode}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(JSON.stringify(payload));
            req.end();
        });
    }
    /**
     * Make HTTPS request
     */
    makeHttpsRequest(options, data) {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        resolve(responseData);
                    }
                    else {
                        reject(new Error(`Request failed with status ${res.statusCode}: ${responseData}`));
                    }
                });
            });
            req.on('error', reject);
            req.write(data);
            req.end();
        });
    }
    /**
     * Initialize default templates
     */
    initializeDefaultTemplates() {
        // Slack template
        this.createTemplate('slack', `*{{title}}* - {{date}}

{{content}}

_Standup Autobot ${iconUtils_1.Icons.robot()}_`, ['title', 'date', 'content']);
        // Teams template
        this.createTemplate('teams', `**{{title}}** - {{date}}

{{content}}

*Standup Autobot*`, ['title', 'date', 'content']);
        // Email template
        this.createTemplate('email', `Subject: {{title}} - {{date}}

{{content}}

---
Generated by Standup Autobot`, ['title', 'date', 'content']);
        // Brief template
        this.createTemplate('brief', `**{{date}}**

${iconUtils_1.Icons.checkmark()} Completed: {{completed}}
${iconUtils_1.Icons.refresh()} In Progress: {{inProgress}}
🚧 Blockers: {{blockers}}`, ['date', 'completed', 'inProgress', 'blockers']);
        // Detailed template
        this.createTemplate('detailed', `# {{title}} - {{date}}

## Summary
{{summary}}

## Work Completed
{{completed}}

## In Progress
{{inProgress}}

## Blockers
{{blockers}}

## Next Steps
{{nextSteps}}

---
*Generated by Standup Autobot*`, ['title', 'date', 'summary', 'completed', 'inProgress', 'blockers', 'nextSteps']);
    }
    /**
     * Save templates to persistent storage
     */
    saveTemplates() {
        const templatesArray = Array.from(this.templates.entries());
        this.context.globalState.update('standup.exportTemplates', templatesArray);
    }
    /**
     * Load templates from persistent storage
     */
    loadTemplates() {
        const stored = this.context.globalState.get('standup.exportTemplates');
        if (stored) {
            this.templates = new Map(stored);
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.EnhancedExporterService = EnhancedExporterService;
//# sourceMappingURL=EnhancedExporterService.js.map