/**
 * Configuration Service
 *
 * Centralized configuration management for the entire application.
 * Provides access to all settings with proper defaults and validation.
 */

import * as vscode from 'vscode';

export interface AppConfig {
    // Timing & Durations
    apiTimeout: number;
    apiRetryAttempts: number;
    apiRetryDelay: number;
    dashboardRefreshInterval: number;
    cacheTTL: number;

    // Limits & Thresholds
    historyPageSize: number;
    maxCacheSize: number;
    rateLimitRequestsPerMinute: number;
    rateLimitBurstSize: number;
    maxFileSize: number;

    // Notifications
    notificationRetentionDays: number;
    maxNotificationsPerDay: number;

    // API URLs
    githubApiUrl: string;
    notionApiUrl: string;
    jiraApiBaseUrl: string;
    slackApiUrl: string;
    teamsAuthorityUrl: string;
    teamsGraphApiUrl: string;
    azureDevOpsApiUrl: string;
    harvestApiUrl: string;
    togglApiUrl: string;

    // CDN URLs
    cdnReactUrl: string;
    cdnReactDOMUrl: string;
    cdnBabelUrl: string;
    cdnTailwindUrl: string;
    cdnMarkedUrl: string;
    cdnChartJsUrl: string;

    // Placeholders
    defaultImagePlaceholder: string;
}

export class ConfigurationService {
    private static instance: ConfigurationService;
    private config: vscode.WorkspaceConfiguration;

    private constructor() {
        this.config = vscode.workspace.getConfiguration('standup');
        this.watchForChanges();
    }

    public static getInstance(): ConfigurationService {
        if (!ConfigurationService.instance) {
            ConfigurationService.instance = new ConfigurationService();
        }
        return ConfigurationService.instance;
    }

    /**
     * Watch for configuration changes and update cached values
     */
    private watchForChanges(): void {
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('standup')) {
                this.config = vscode.workspace.getConfiguration('standup');
            }
        });
    }

    /**
     * Get configuration value with fallback
     */
    private get<T>(key: string, defaultValue: T): T {
        return this.config.get<T>(key, defaultValue);
    }

    /**
     * Get all application configuration
     */
    public getConfig(): AppConfig {
        return {
            // Timing & Durations
            apiTimeout: this.get<number>('apiTimeout', 30000),
            apiRetryAttempts: this.get<number>('apiRetryAttempts', 3),
            apiRetryDelay: this.get<number>('apiRetryDelay', 1000),
            dashboardRefreshInterval: this.get<number>('dashboardRefreshInterval', 5000),
            cacheTTL: this.get<number>('cacheTTL', 300000),

            // Limits & Thresholds
            historyPageSize: this.get<number>('historyPageSize', 20),
            maxCacheSize: this.get<number>('maxCacheSize', 100),
            rateLimitRequestsPerMinute: this.get<number>('rateLimitRequestsPerMinute', 60),
            rateLimitBurstSize: this.get<number>('rateLimitBurstSize', 10),
            maxFileSize: this.get<number>('maxFileSize', 10485760),

            // Notifications
            notificationRetentionDays: this.get<number>('notificationRetentionDays', 30),
            maxNotificationsPerDay: this.get<number>('maxNotificationsPerDay', 50),

            // API URLs
            githubApiUrl: this.get<string>('githubApiUrl', 'https://api.github.com'),
            notionApiUrl: this.get<string>('notionApiUrl', 'https://api.notion.com'),
            jiraApiBaseUrl: this.get<string>('jiraApiBaseUrl', 'https://{domain}.atlassian.net'),
            slackApiUrl: this.get<string>('slackApiUrl', 'https://slack.com/api'),
            teamsAuthorityUrl: this.get<string>('teamsAuthorityUrl', 'https://login.microsoftonline.com'),
            teamsGraphApiUrl: this.get<string>('teamsGraphApiUrl', 'https://graph.microsoft.com'),
            azureDevOpsApiUrl: this.get<string>('azureDevOpsApiUrl', 'https://dev.azure.com'),
            harvestApiUrl: this.get<string>('harvestApiUrl', 'https://api.harvestapp.com'),
            togglApiUrl: this.get<string>('togglApiUrl', 'https://api.track.toggl.com'),

            // CDN URLs
            cdnReactUrl: this.get<string>('cdnReactUrl', 'https://unpkg.com/react@18/umd/react.production.min.js'),
            cdnReactDOMUrl: this.get<string>('cdnReactDOMUrl', 'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js'),
            cdnBabelUrl: this.get<string>('cdnBabelUrl', 'https://unpkg.com/@babel/standalone/babel.min.js'),
            cdnTailwindUrl: this.get<string>('cdnTailwindUrl', 'https://cdn.tailwindcss.com'),
            cdnMarkedUrl: this.get<string>('cdnMarkedUrl', 'https://cdn.jsdelivr.net/npm/marked/marked.min.js'),
            cdnChartJsUrl: this.get<string>('cdnChartJsUrl', 'https://cdn.jsdelivr.net/npm/chart.js'),

            // Placeholders
            defaultImagePlaceholder: this.get<string>('defaultImagePlaceholder', 'https://adaptivecards.io/content/cats/1.png'),
        };
    }

    /**
     * Get API configuration for fetch requests
     */
    public getApiConfig(): { timeout: number; retryAttempts: number; retryDelay: number } {
        return {
            timeout: this.getConfig().apiTimeout,
            retryAttempts: this.getConfig().apiRetryAttempts,
            retryDelay: this.getConfig().apiRetryDelay,
        };
    }

    /**
     * Get cache configuration
     */
    public getCacheConfig(): { maxSize: number; ttl: number } {
        return {
            maxSize: this.getConfig().maxCacheSize,
            ttl: this.getConfig().cacheTTL,
        };
    }

    /**
     * Get rate limiting configuration
     */
    public getRateLimitConfig(): { requestsPerMinute: number; burstSize: number } {
        return {
            requestsPerMinute: this.getConfig().rateLimitRequestsPerMinute,
            burstSize: this.getConfig().rateLimitBurstSize,
        };
    }

    /**
     * Get API base URL for a service
     */
    public getApiUrl(service: 'github' | 'notion' | 'jira' | 'slack' | 'teams' | 'azureDevOps' | 'harvest' | 'toggl'): string {
        const config = this.getConfig();

        switch (service) {
            case 'github':
                return config.githubApiUrl;
            case 'notion':
                return config.notionApiUrl;
            case 'jira':
                return config.jiraApiBaseUrl;
            case 'slack':
                return config.slackApiUrl;
            case 'teams':
                return config.teamsGraphApiUrl;
            case 'azureDevOps':
                return config.azureDevOpsApiUrl;
            case 'harvest':
                return config.harvestApiUrl;
            case 'toggl':
                return config.togglApiUrl;
            default:
                throw new Error(`Unknown service: ${service}`);
        }
    }

    /**
     * Get CDN URLs
     */
    public getCdnUrls(): {
        react: string;
        reactDOM: string;
        babel: string;
        tailwind: string;
        marked: string;
        chartJs: string;
    } {
        const config = this.getConfig();
        return {
            react: config.cdnReactUrl,
            reactDOM: config.cdnReactDOMUrl,
            babel: config.cdnBabelUrl,
            tailwind: config.cdnTailwindUrl,
            marked: config.cdnMarkedUrl,
            chartJs: config.cdnChartJsUrl,
        };
    }

    /**
     * Format Jira API base URL with domain
     */
    public getJiraApiUrl(domain: string): string {
        const baseUrl = this.getConfig().jiraApiBaseUrl;
        return baseUrl.replace('{domain}', domain);
    }

    /**
     * Update configuration value
     */
    public async update<T>(key: string, value: T, target?: vscode.ConfigurationTarget): Promise<void> {
        await this.config.update(key, value, target);
    }
}

// Export singleton instance
export const configService = ConfigurationService.getInstance();
