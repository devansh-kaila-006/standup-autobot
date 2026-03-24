/**
 * Base error class for Standup Autobot
 * All custom errors should extend this class
 */
export declare class StandupError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
    /**
     * Convert error to a plain object for logging/serialization
     */
    toJSON(): {
        name: string;
        message: string;
        code: string;
        details: any;
        stack: string | undefined;
    };
    /**
     * Get a user-friendly error message
     */
    getUserMessage(): string;
}
/**
 * API-related errors (network issues, API failures, etc.)
 */
export declare class APIError extends StandupError {
    statusCode?: number | undefined;
    apiEndpoint?: string | undefined;
    constructor(message: string, statusCode?: number | undefined, apiEndpoint?: string | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Configuration-related errors (invalid config, missing settings, etc.)
 */
export declare class ConfigurationError extends StandupError {
    configKey?: string | undefined;
    constructor(message: string, configKey?: string | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Activity tracking errors (file system issues, git errors, etc.)
 */
export declare class TrackingError extends StandupError {
    trackingType?: "file" | "git" | "terminal" | undefined;
    constructor(message: string, trackingType?: "file" | "git" | "terminal" | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Storage-related errors (persistence issues, data corruption, etc.)
 */
export declare class StorageError extends StandupError {
    storageKey?: string | undefined;
    constructor(message: string, storageKey?: string | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Validation errors for user input
 */
export declare class ValidationError extends StandupError {
    field?: string | undefined;
    constructor(message: string, field?: string | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Export-related errors (Notion, Jira, etc.)
 */
export declare class ExportError extends StandupError {
    exportType?: "notion" | "jira" | "teams" | "email" | undefined;
    constructor(message: string, exportType?: "notion" | "jira" | "teams" | "email" | undefined, details?: any);
    getUserMessage(): string;
}
/**
 * Helper function to determine if an error is a StandupError
 */
export declare function isStandupError(error: unknown): error is StandupError;
/**
 * Helper function to safely get error message
 */
export declare function getErrorMessage(error: unknown): string;
/**
 * Helper function to convert unknown error to StandupError
 */
export declare function toStandupError(error: unknown): StandupError;
//# sourceMappingURL=errors.d.ts.map