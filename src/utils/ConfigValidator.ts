import { z } from 'zod';
import { ConfigurationError, ValidationError } from './errors';

/**
 * Zod schema for Standup configuration
 */
export const StandupConfigSchema = z.object({
    // Core settings
    triggerTime: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').default('09:00'),
    activityDuration: z.number().int().min(1).max(168).default(24), // 1 hour to 1 week

    // AI settings
    tone: z.enum(['brief', 'detailed', 'casual', 'formal']).default('casual'),
    customPrompt: z.string().max(1000).default(''),
    outputLanguage: z.string().min(1).max(100).default('English'),

    // Integration settings
    notionPageId: z.string().optional(),
    jiraDomain: z.string().optional(),
    jiraEmail: z.string().optional(),
    jiraIssueKey: z.string().optional(),
    jiraApiToken: z.string().optional(),

    // Tracking settings
    ignorePatterns: z.array(z.string()).default([
        '**/node_modules/**',
        '**/.git/**',
        '**/out/**',
        '**/dist/**',
    ]),

    // Advanced settings
    enableTracking: z.boolean().default(true),
    trackingInterval: z.number().int().min(1000).max(60000).default(5000), // 1s to 60s
    maxHistorySize: z.number().int().min(10).max(10000).default(1000),

    // Phase 2.2: Memory management settings
    dataRetentionDays: z.number().int().min(1).max(365).default(30),
    autoCleanupEnabled: z.boolean().default(false),
    cleanupIntervalDays: z.number().int().min(1).max(90).default(7),
    maxCacheSize: z.number().int().min(10).max(1000).default(100),
    memoryProfilingEnabled: z.boolean().default(true),

    // Feature flags
    enableSmartAlerts: z.boolean().default(true),
    enableWeeklyDigest: z.boolean().default(true),
    enableAutoTagging: z.boolean().default(true),

    // Phase 2: Terminal tracking settings
    terminalTracking: z.object({
        enabled: z.boolean().default(true),
        shells: z.array(z.enum(['bash', 'zsh', 'powershell', 'cmd', 'fish'])).default(['bash', 'zsh', 'powershell']),
        historyLimit: z.number().int().min(1).max(100).default(20),
        enableRealtimeTracking: z.boolean().default(false),
        respectHignore: z.boolean().default(true),
    }).optional().default({
        enabled: true,
        shells: ['bash', 'zsh', 'powershell'],
        historyLimit: 20,
        enableRealtimeTracking: false,
        respectHignore: true,
    }),
});

export type StandupConfig = z.infer<typeof StandupConfigSchema>;

/**
 * Schema for workspace-level override configuration (.standup.json)
 */
export const WorkspaceConfigSchema = z.object({
    // Override tone
    tone: z.enum(['brief', 'detailed', 'casual', 'formal']).optional(),

    // Override ignore patterns
    ignorePatterns: z.array(z.string()).optional(),

    // Override integration settings
    notionPageId: z.string().optional(),
    jiraDomain: z.string().optional(),
    jiraIssueKey: z.string().optional(),

    // Custom prompt for this workspace
    customPrompt: z.string().max(1000).optional(),

    // Override language
    outputLanguage: z.string().min(1).max(100).optional(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

/**
 * Schema for activity data
 */
export const ActivitySchema = z.object({
    filePath: z.string(),
    fileName: z.string(),
    projectName: z.string().optional(),
    timestamp: z.number(),
    type: z.enum(['edit', 'create', 'delete']),
    linesChanged: z.number().int().min(0).optional(),
    language: z.string().optional(),
});

export type Activity = z.infer<typeof ActivitySchema>;

/**
 * Schema for standup history entry
 */
export const StandupHistorySchema = z.object({
    id: z.string().uuid(),
    timestamp: z.number(),
    date: z.string(),
    summary: z.string(),
    activities: z.array(ActivitySchema),
    config: StandupConfigSchema.partial(),
    tags: z.array(z.string()).optional(),
});

export type StandupHistory = z.infer<typeof StandupHistorySchema>;

/**
 * Configuration validator class
 */
export class ConfigValidator {
    /**
     * Validate complete Standup configuration
     */
    static validateStandupConfig(config: any): StandupConfig {
        try {
            return StandupConfigSchema.parse(config);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = this.formatZodError(error);
                throw new ConfigurationError(
                    `Invalid configuration: ${message}`,
                    undefined,
                    { zodErrors: error.errors }
                );
            }
            throw error;
        }
    }

    /**
     * Validate workspace configuration
     */
    static validateWorkspaceConfig(config: any): WorkspaceConfig {
        try {
            return WorkspaceConfigSchema.parse(config);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = this.formatZodError(error);
                throw new ConfigurationError(
                    `Invalid workspace configuration: ${message}`,
                    undefined,
                    { zodErrors: error.errors }
                );
            }
            throw error;
        }
    }

    /**
     * Validate activity data
     */
    static validateActivity(data: any): Activity {
        try {
            return ActivitySchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = this.formatZodError(error);
                throw new ValidationError(
                    `Invalid activity data: ${message}`,
                    undefined,
                    { zodErrors: error.errors }
                );
            }
            throw error;
        }
    }

    /**
     * Validate standup history entry
     */
    static validateStandupHistory(data: any): StandupHistory {
        try {
            return StandupHistorySchema.parse(data);
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = this.formatZodError(error);
                throw new ValidationError(
                    `Invalid history entry: ${message}`,
                    undefined,
                    { zodErrors: error.errors }
                );
            }
            throw error;
        }
    }

    /**
     * Validate a specific configuration value
     */
    static validateConfigValue(key: string, value: any): void {
        try {
            // Create a partial schema with just this key
            const fieldSchema = StandupConfigSchema.shape[key as keyof typeof StandupConfigSchema.shape];
            if (fieldSchema) {
                fieldSchema.parse(value);
            } else {
                throw new ConfigurationError(`Unknown configuration key: ${key}`, key);
            }
        } catch (error) {
            if (error instanceof z.ZodError) {
                const message = this.formatZodError(error);
                throw new ConfigurationError(
                    `Invalid value for "${key}": ${message}`,
                    key,
                    { value, zodErrors: error.errors }
                );
            }
            throw error;
        }
    }

    /**
     * Format Zod error into a readable message
     */
    private static formatZodError(error: z.ZodError): string {
        const issues = error.errors.map((issue) => {
            const path = issue.path.join('.');
            const message = issue.message;
            return path ? `${path}: ${message}` : message;
        });

        return issues.join(', ');
    }

    /**
     * Sanitize configuration by removing unknown keys
     */
    static sanitizeConfig(config: any): any {
        const keys = Object.keys(config);
        const validKeys = Object.keys(StandupConfigSchema.shape);

        const sanitized: any = {};
        for (const key of keys) {
            if (validKeys.includes(key)) {
                sanitized[key] = config[key];
            }
        }

        return sanitized;
    }

    /**
     * Get default configuration
     */
    static getDefaults(): StandupConfig {
        return StandupConfigSchema.parse({});
    }

    /**
     * Merge user config with defaults
     */
    static mergeWithDefaults(userConfig: any): StandupConfig {
        const defaults = this.getDefaults();
        const sanitized = this.sanitizeConfig(userConfig);

        return {
            ...defaults,
            ...sanitized,
        };
    }
}

/**
 * Configuration migration system
 */
export class ConfigMigrator {
    private static readonly CONFIG_VERSION_KEY = 'standup.configVersion';
    private static readonly CURRENT_VERSION = 2;

    /**
     * Check if configuration needs migration
     */
    static needsMigration(): boolean {
        const version = this.getCurrentVersion();
        return version < this.CURRENT_VERSION;
    }

    /**
     * Get current configuration version
     */
    static getCurrentVersion(): number {
        // In a real implementation, this would read from globalState
        return 1; // Default to version 1 for now
    }

    /**
     * Migrate configuration to latest version
     */
    static async migrate(): Promise<void> {
        let version = this.getCurrentVersion();

        this.log(`Starting configuration migration from v${version} to v${this.CURRENT_VERSION}`);

        while (version < this.CURRENT_VERSION) {
            switch (version) {
                case 1:
                    await this.migrateV1ToV2();
                    version = 2;
                    break;
                default:
                    this.log(`No migration needed for version ${version}`);
                    version++;
            }
        }

        this.log('Configuration migration completed');
    }

    /**
     * Migration from version 1 to 2
     * - Add new settings: enableSmartAlerts, enableWeeklyDigest, enableAutoTagging
     * - Rename: trackingInterval (was hard-coded)
     */
    private static async migrateV1ToV2(): Promise<void> {
        this.log('Migrating from v1 to v2');

        // In a real implementation, this would:
        // 1. Read current config from workspace state
        // 2. Add new fields with defaults
        // 3. Update config version
        // 4. Save updated config

        this.log('v1 -> v2 migration complete');
    }

    private static log(message: string): void {
        console.log(`[ConfigMigrator] ${message}`);
    }
}

/**
 * Helper function to validate configuration from VS Code
 */
export async function loadAndValidateConfig(): Promise<StandupConfig> {
    const config = vscode.workspace.getConfiguration('standup');

    // Convert VS Code configuration to plain object
    const rawConfig: any = {};
    for (const key of Object.keys(StandupConfigSchema.shape)) {
        const value = config.get(key);
        if (value !== undefined) {
            rawConfig[key] = value;
        }
    }

    // Merge with defaults
    const mergedConfig = ConfigValidator.mergeWithDefaults(rawConfig);

    // Validate
    return ConfigValidator.validateStandupConfig(mergedConfig);
}

// Import vscode at the bottom to avoid circular dependency
import * as vscode from 'vscode';
