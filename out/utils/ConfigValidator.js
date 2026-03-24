"use strict";
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
exports.ConfigMigrator = exports.ConfigValidator = exports.StandupHistorySchema = exports.ActivitySchema = exports.WorkspaceConfigSchema = exports.StandupConfigSchema = void 0;
exports.loadAndValidateConfig = loadAndValidateConfig;
const zod_1 = require("zod");
const errors_1 = require("./errors");
/**
 * Zod schema for Standup configuration
 */
exports.StandupConfigSchema = zod_1.z.object({
    // Core settings
    triggerTime: zod_1.z.string().regex(/^\d{2}:\d{2}$/, 'Time must be in HH:MM format').default('09:00'),
    activityDuration: zod_1.z.number().int().min(1).max(168).default(24), // 1 hour to 1 week
    // AI settings
    tone: zod_1.z.enum(['brief', 'detailed', 'casual', 'formal']).default('casual'),
    customPrompt: zod_1.z.string().max(1000).default(''),
    outputLanguage: zod_1.z.string().min(1).max(100).default('English'),
    // Integration settings
    notionPageId: zod_1.z.string().optional(),
    jiraDomain: zod_1.z.string().optional(),
    jiraEmail: zod_1.z.string().optional(),
    jiraIssueKey: zod_1.z.string().optional(),
    jiraApiToken: zod_1.z.string().optional(),
    // Tracking settings
    ignorePatterns: zod_1.z.array(zod_1.z.string()).default([
        '**/node_modules/**',
        '**/.git/**',
        '**/out/**',
        '**/dist/**',
    ]),
    // Advanced settings
    enableTracking: zod_1.z.boolean().default(true),
    trackingInterval: zod_1.z.number().int().min(1000).max(60000).default(5000), // 1s to 60s
    maxHistorySize: zod_1.z.number().int().min(10).max(10000).default(1000),
    // Phase 2.2: Memory management settings
    dataRetentionDays: zod_1.z.number().int().min(1).max(365).default(30),
    autoCleanupEnabled: zod_1.z.boolean().default(false),
    cleanupIntervalDays: zod_1.z.number().int().min(1).max(90).default(7),
    maxCacheSize: zod_1.z.number().int().min(10).max(1000).default(100),
    memoryProfilingEnabled: zod_1.z.boolean().default(true),
    // Feature flags
    enableSmartAlerts: zod_1.z.boolean().default(true),
    enableWeeklyDigest: zod_1.z.boolean().default(true),
    enableAutoTagging: zod_1.z.boolean().default(true),
    // Phase 2: Terminal tracking settings
    terminalTracking: zod_1.z.object({
        enabled: zod_1.z.boolean().default(true),
        shells: zod_1.z.array(zod_1.z.enum(['bash', 'zsh', 'powershell', 'cmd', 'fish'])).default(['bash', 'zsh', 'powershell']),
        historyLimit: zod_1.z.number().int().min(1).max(100).default(20),
        enableRealtimeTracking: zod_1.z.boolean().default(false),
        respectHignore: zod_1.z.boolean().default(true),
    }).optional().default({
        enabled: true,
        shells: ['bash', 'zsh', 'powershell'],
        historyLimit: 20,
        enableRealtimeTracking: false,
        respectHignore: true,
    }),
});
/**
 * Schema for workspace-level override configuration (.standup.json)
 */
exports.WorkspaceConfigSchema = zod_1.z.object({
    // Override tone
    tone: zod_1.z.enum(['brief', 'detailed', 'casual', 'formal']).optional(),
    // Override ignore patterns
    ignorePatterns: zod_1.z.array(zod_1.z.string()).optional(),
    // Override integration settings
    notionPageId: zod_1.z.string().optional(),
    jiraDomain: zod_1.z.string().optional(),
    jiraIssueKey: zod_1.z.string().optional(),
    // Custom prompt for this workspace
    customPrompt: zod_1.z.string().max(1000).optional(),
    // Override language
    outputLanguage: zod_1.z.string().min(1).max(100).optional(),
});
/**
 * Schema for activity data
 */
exports.ActivitySchema = zod_1.z.object({
    filePath: zod_1.z.string(),
    fileName: zod_1.z.string(),
    projectName: zod_1.z.string().optional(),
    timestamp: zod_1.z.number(),
    type: zod_1.z.enum(['edit', 'create', 'delete']),
    linesChanged: zod_1.z.number().int().min(0).optional(),
    language: zod_1.z.string().optional(),
});
/**
 * Schema for standup history entry
 */
exports.StandupHistorySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.number(),
    date: zod_1.z.string(),
    summary: zod_1.z.string(),
    activities: zod_1.z.array(exports.ActivitySchema),
    config: exports.StandupConfigSchema.partial(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
});
/**
 * Configuration validator class
 */
class ConfigValidator {
    /**
     * Validate complete Standup configuration
     */
    static validateStandupConfig(config) {
        try {
            return exports.StandupConfigSchema.parse(config);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const message = this.formatZodError(error);
                throw new errors_1.ConfigurationError(`Invalid configuration: ${message}`, undefined, { zodErrors: error.errors });
            }
            throw error;
        }
    }
    /**
     * Validate workspace configuration
     */
    static validateWorkspaceConfig(config) {
        try {
            return exports.WorkspaceConfigSchema.parse(config);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const message = this.formatZodError(error);
                throw new errors_1.ConfigurationError(`Invalid workspace configuration: ${message}`, undefined, { zodErrors: error.errors });
            }
            throw error;
        }
    }
    /**
     * Validate activity data
     */
    static validateActivity(data) {
        try {
            return exports.ActivitySchema.parse(data);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const message = this.formatZodError(error);
                throw new errors_1.ValidationError(`Invalid activity data: ${message}`, undefined, { zodErrors: error.errors });
            }
            throw error;
        }
    }
    /**
     * Validate standup history entry
     */
    static validateStandupHistory(data) {
        try {
            return exports.StandupHistorySchema.parse(data);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const message = this.formatZodError(error);
                throw new errors_1.ValidationError(`Invalid history entry: ${message}`, undefined, { zodErrors: error.errors });
            }
            throw error;
        }
    }
    /**
     * Validate a specific configuration value
     */
    static validateConfigValue(key, value) {
        try {
            // Create a partial schema with just this key
            const fieldSchema = exports.StandupConfigSchema.shape[key];
            if (fieldSchema) {
                fieldSchema.parse(value);
            }
            else {
                throw new errors_1.ConfigurationError(`Unknown configuration key: ${key}`, key);
            }
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                const message = this.formatZodError(error);
                throw new errors_1.ConfigurationError(`Invalid value for "${key}": ${message}`, key, { value, zodErrors: error.errors });
            }
            throw error;
        }
    }
    /**
     * Format Zod error into a readable message
     */
    static formatZodError(error) {
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
    static sanitizeConfig(config) {
        const keys = Object.keys(config);
        const validKeys = Object.keys(exports.StandupConfigSchema.shape);
        const sanitized = {};
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
    static getDefaults() {
        return exports.StandupConfigSchema.parse({});
    }
    /**
     * Merge user config with defaults
     */
    static mergeWithDefaults(userConfig) {
        const defaults = this.getDefaults();
        const sanitized = this.sanitizeConfig(userConfig);
        return {
            ...defaults,
            ...sanitized,
        };
    }
}
exports.ConfigValidator = ConfigValidator;
/**
 * Configuration migration system
 */
class ConfigMigrator {
    /**
     * Check if configuration needs migration
     */
    static needsMigration() {
        const version = this.getCurrentVersion();
        return version < this.CURRENT_VERSION;
    }
    /**
     * Get current configuration version
     */
    static getCurrentVersion() {
        // In a real implementation, this would read from globalState
        return 1; // Default to version 1 for now
    }
    /**
     * Migrate configuration to latest version
     */
    static async migrate() {
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
    static async migrateV1ToV2() {
        this.log('Migrating from v1 to v2');
        // In a real implementation, this would:
        // 1. Read current config from workspace state
        // 2. Add new fields with defaults
        // 3. Update config version
        // 4. Save updated config
        this.log('v1 -> v2 migration complete');
    }
    static log(message) {
        console.log(`[ConfigMigrator] ${message}`);
    }
}
exports.ConfigMigrator = ConfigMigrator;
ConfigMigrator.CONFIG_VERSION_KEY = 'standup.configVersion';
ConfigMigrator.CURRENT_VERSION = 2;
/**
 * Helper function to validate configuration from VS Code
 */
async function loadAndValidateConfig() {
    const config = vscode.workspace.getConfiguration('standup');
    // Convert VS Code configuration to plain object
    const rawConfig = {};
    for (const key of Object.keys(exports.StandupConfigSchema.shape)) {
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
const vscode = __importStar(require("vscode"));
//# sourceMappingURL=ConfigValidator.js.map