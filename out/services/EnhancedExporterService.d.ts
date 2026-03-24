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
export declare class EnhancedExporterService {
    private context;
    private templates;
    constructor(context: vscode.ExtensionContext);
    /**
     * Export to Slack using webhook
     */
    exportToSlack(webhookUrl: string, content: string, options?: {
        channel?: string;
        username?: string;
        icon?: string;
    }): Promise<boolean>;
    /**
     * Export to Microsoft Teams using webhook
     */
    exportToTeams(webhookUrl: string, content: string, options?: {
        title?: string;
        color?: string;
    }): Promise<boolean>;
    /**
     * Export to Discord using webhook
     */
    exportToDiscord(webhookUrl: string, content: string, options?: {
        username?: string;
        avatar?: string;
    }): Promise<boolean>;
    /**
     * Export to GitHub Gist
     */
    exportToGitHubGist(token: string, content: string, options?: {
        filename?: string;
        description?: string;
        public?: boolean;
    }): Promise<string | null>;
    /**
     * Export to GitLab Snippet
     */
    exportToGitLabSnippet(token: string, instanceUrl: string, content: string, options?: {
        title?: string;
        visibility?: 'private' | 'public' | 'internal';
    }): Promise<string | null>;
    /**
     * Export to email
     */
    exportToEmail(to: string, subject: string, content: string): Promise<boolean>;
    /**
     * Apply custom template to content
     */
    applyTemplate(templateName: string, data: any): string;
    /**
     * Create custom export template
     */
    createTemplate(name: string, format: string, variables: string[]): void;
    /**
     * Get all templates
     */
    getTemplates(): ExportTemplate[];
    /**
     * Batch export to multiple destinations
     */
    batchExport(content: string, destinations: ExportDestination[]): Promise<{
        successful: string[];
        failed: Array<{
            destination: string;
            error: string;
        }>;
    }>;
    /**
     * Send webhook request
     */
    private sendWebhook;
    /**
     * Make HTTPS request
     */
    private makeHttpsRequest;
    /**
     * Initialize default templates
     */
    private initializeDefaultTemplates;
    /**
     * Save templates to persistent storage
     */
    private saveTemplates;
    /**
     * Load templates from persistent storage
     */
    private loadTemplates;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=EnhancedExporterService.d.ts.map