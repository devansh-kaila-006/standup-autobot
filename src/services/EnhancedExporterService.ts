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

import * as vscode from 'vscode';
import * as https from 'https';
import * as http from 'http';

export interface ExportDestination {
    type: 'slack' | 'teams' | 'discord' | 'github' | 'gitlab' | 'google-docs' | 'confluence' | 'email';
    enabled: boolean;
    config: any;
}

export interface ExportTemplate {
    name: string;
    format: string;
    variables: string[];
}

export class EnhancedExporterService {
    private templates: Map<string, ExportTemplate> = new Map();

    constructor(private context: vscode.ExtensionContext) {
        this.initializeDefaultTemplates();
    }

    /**
     * Export to Slack using webhook
     */
    public async exportToSlack(webhookUrl: string, content: string, options?: { channel?: string; username?: string; icon?: string }): Promise<boolean> {
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
    public async exportToTeams(webhookUrl: string, content: string, options?: { title?: string; color?: string }): Promise<boolean> {
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
    public async exportToDiscord(webhookUrl: string, content: string, options?: { username?: string; avatar?: string }): Promise<boolean> {
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
    public async exportToGitHubGist(token: string, content: string, options?: { filename?: string; description?: string; public?: boolean }): Promise<string | null> {
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
        } catch (error) {
            console.error('Failed to create GitHub Gist:', error);
            return null;
        }
    }

    /**
     * Export to GitLab Snippet
     */
    public async exportToGitLabSnippet(token: string, instanceUrl: string, content: string, options?: { title?: string; visibility?: 'private' | 'public' | 'internal' }): Promise<string | null> {
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
        } catch (error) {
            console.error('Failed to create GitLab Snippet:', error);
            return null;
        }
    }

    /**
     * Export to email
     */
    public async exportToEmail(to: string, subject: string, content: string): Promise<boolean> {
        try {
            const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(content)}`;
            await vscode.env.openExternal(vscode.Uri.parse(mailtoUrl));
            return true;
        } catch (error) {
            console.error('Failed to open email client:', error);
            return false;
        }
    }

    /**
     * Apply custom template to content
     */
    public applyTemplate(templateName: string, data: any): string {
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
    public createTemplate(name: string, format: string, variables: string[]): void {
        this.templates.set(name, { name, format, variables });
        this.saveTemplates();
    }

    /**
     * Get all templates
     */
    public getTemplates(): ExportTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * Batch export to multiple destinations
     */
    public async batchExport(content: string, destinations: ExportDestination[]): Promise<{
        successful: string[];
        failed: Array<{ destination: string; error: string }>;
    }> {
        const successful: string[] = [];
        const failed: Array<{ destination: string; error: string }> = [];

        for (const dest of destinations) {
            if (!dest.enabled) continue;

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
                        if (gistUrl) successful.push(`GitHub Gist: ${gistUrl}`);
                        break;
                    case 'gitlab':
                        const gitlabUrl = await this.exportToGitLabSnippet(dest.config.token, dest.config.instanceUrl, content, dest.config.options);
                        result = !!gitlabUrl;
                        if (gitlabUrl) successful.push(`GitLab Snippet: ${gitlabUrl}`);
                        break;
                    case 'email':
                        result = await this.exportToEmail(dest.config.to, dest.config.subject, content);
                        break;
                }

                if (result) {
                    successful.push(dest.type);
                }
            } catch (error) {
                failed.push({
                    destination: dest.type,
                    error: (error as Error).message,
                });
            }
        }

        return { successful, failed };
    }

    /**
     * Send webhook request
     */
    private sendWebhook(url: string, payload: any): Promise<boolean> {
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
                    } else {
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
    private makeHttpsRequest(options: https.RequestOptions, data: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        resolve(responseData);
                    } else {
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
    private initializeDefaultTemplates(): void {
        // Slack template
        this.createTemplate(
            'slack',
            `*{{title}}* - {{date}}

{{content}}

_Standup Autobot 🤖_`,
            ['title', 'date', 'content']
        );

        // Teams template
        this.createTemplate(
            'teams',
            `**{{title}}** - {{date}}

{{content}}

*Standup Autobot*`,
            ['title', 'date', 'content']
        );

        // Email template
        this.createTemplate(
            'email',
            `Subject: {{title}} - {{date}}

{{content}}

---
Generated by Standup Autobot`,
            ['title', 'date', 'content']
        );

        // Brief template
        this.createTemplate(
            'brief',
            `**{{date}}**

✅ Completed: {{completed}}
🔄 In Progress: {{inProgress}}
🚧 Blockers: {{blockers}}`,
            ['date', 'completed', 'inProgress', 'blockers']
        );

        // Detailed template
        this.createTemplate(
            'detailed',
            `# {{title}} - {{date}}

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
*Generated by Standup Autobot*`,
            ['title', 'date', 'summary', 'completed', 'inProgress', 'blockers', 'nextSteps']
        );
    }

    /**
     * Save templates to persistent storage
     */
    private saveTemplates(): void {
        const templatesArray = Array.from(this.templates.entries());
        this.context.globalState.update('standup.exportTemplates', templatesArray);
    }

    /**
     * Load templates from persistent storage
     */
    private loadTemplates(): void {
        const stored = this.context.globalState.get<any[]>('standup.exportTemplates');
        if (stored) {
            this.templates = new Map(stored);
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
