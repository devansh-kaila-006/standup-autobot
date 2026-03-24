/**
 * Base error class for Standup Autobot
 * All custom errors should extend this class
 */
export class StandupError extends Error {
    constructor(
        message: string,
        public code: string,
        public details?: any
    ) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Convert error to a plain object for logging/serialization
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            details: this.details,
            stack: this.stack,
        };
    }

    /**
     * Get a user-friendly error message
     */
    getUserMessage(): string {
        return this.message;
    }
}

/**
 * API-related errors (network issues, API failures, etc.)
 */
export class APIError extends StandupError {
    constructor(
        message: string,
        public statusCode?: number,
        public apiEndpoint?: string,
        details?: any
    ) {
        super(message, 'API_ERROR', details);
    }

    override getUserMessage(): string {
        if (this.statusCode === 401) {
            return 'Authentication failed. Please check your API key.';
        }
        if (this.statusCode === 429) {
            return 'Rate limit exceeded. Please try again later.';
        }
        if (this.statusCode && this.statusCode >= 500) {
            return 'Service temporarily unavailable. Please try again later.';
        }
        return `API Error: ${this.message}`;
    }
}

/**
 * Configuration-related errors (invalid config, missing settings, etc.)
 */
export class ConfigurationError extends StandupError {
    constructor(
        message: string,
        public configKey?: string,
        details?: any
    ) {
        super(message, 'CONFIG_ERROR', details);
    }

    override getUserMessage(): string {
        if (this.configKey) {
            return `Invalid configuration for "${this.configKey}": ${this.message}`;
        }
        return `Configuration Error: ${this.message}`;
    }
}

/**
 * Activity tracking errors (file system issues, git errors, etc.)
 */
export class TrackingError extends StandupError {
    constructor(
        message: string,
        public trackingType?: 'file' | 'git' | 'terminal',
        details?: any
    ) {
        super(message, 'TRACKING_ERROR', details);
    }

    override getUserMessage(): string {
        if (this.trackingType === 'git') {
            return `Git tracking error: ${this.message}`;
        }
        if (this.trackingType === 'terminal') {
            return `Terminal tracking error: ${this.message}`;
        }
        if (this.trackingType === 'file') {
            return `File tracking error: ${this.message}`;
        }
        return `Tracking Error: ${this.message}`;
    }
}

/**
 * Storage-related errors (persistence issues, data corruption, etc.)
 */
export class StorageError extends StandupError {
    constructor(
        message: string,
        public storageKey?: string,
        details?: any
    ) {
        super(message, 'STORAGE_ERROR', details);
    }

    override getUserMessage(): string {
        return `Storage Error: ${this.message}`;
    }
}

/**
 * Validation errors for user input
 */
export class ValidationError extends StandupError {
    constructor(
        message: string,
        public field?: string,
        details?: any
    ) {
        super(message, 'VALIDATION_ERROR', details);
    }

    override getUserMessage(): string {
        if (this.field) {
            return `Invalid value for "${this.field}": ${this.message}`;
        }
        return `Validation Error: ${this.message}`;
    }
}

/**
 * Export-related errors (Notion, Jira, etc.)
 */
export class ExportError extends StandupError {
    constructor(
        message: string,
        public exportType?: 'notion' | 'jira' | 'teams' | 'email',
        details?: any
    ) {
        super(message, 'EXPORT_ERROR', details);
    }

    override getUserMessage(): string {
        if (this.exportType) {
            return `Failed to export to ${this.exportType}: ${this.message}`;
        }
        return `Export Error: ${this.message}`;
    }
}

/**
 * Helper function to determine if an error is a StandupError
 */
export function isStandupError(error: unknown): error is StandupError {
    return error instanceof StandupError;
}

/**
 * Helper function to safely get error message
 */
export function getErrorMessage(error: unknown): string {
    if (isStandupError(error)) {
        return error.getUserMessage();
    }
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

/**
 * Helper function to convert unknown error to StandupError
 */
export function toStandupError(error: unknown): StandupError {
    if (isStandupError(error)) {
        return error;
    }
    if (error instanceof Error) {
        return new StandupError(error.message, 'UNKNOWN_ERROR', {
            originalError: error.name,
            stack: error.stack,
        });
    }
    return new StandupError(String(error), 'UNKNOWN_ERROR');
}
