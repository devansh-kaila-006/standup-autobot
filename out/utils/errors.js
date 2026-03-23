"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportError = exports.ValidationError = exports.StorageError = exports.TrackingError = exports.ConfigurationError = exports.APIError = exports.StandupError = void 0;
exports.isStandupError = isStandupError;
exports.getErrorMessage = getErrorMessage;
exports.toStandupError = toStandupError;
/**
 * Base error class for Standup Autobot
 * All custom errors should extend this class
 */
class StandupError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
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
    getUserMessage() {
        return this.message;
    }
}
exports.StandupError = StandupError;
/**
 * API-related errors (network issues, API failures, etc.)
 */
class APIError extends StandupError {
    constructor(message, statusCode, apiEndpoint, details) {
        super(message, 'API_ERROR', details);
        this.statusCode = statusCode;
        this.apiEndpoint = apiEndpoint;
    }
    getUserMessage() {
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
exports.APIError = APIError;
/**
 * Configuration-related errors (invalid config, missing settings, etc.)
 */
class ConfigurationError extends StandupError {
    constructor(message, configKey, details) {
        super(message, 'CONFIG_ERROR', details);
        this.configKey = configKey;
    }
    getUserMessage() {
        if (this.configKey) {
            return `Invalid configuration for "${this.configKey}": ${this.message}`;
        }
        return `Configuration Error: ${this.message}`;
    }
}
exports.ConfigurationError = ConfigurationError;
/**
 * Activity tracking errors (file system issues, git errors, etc.)
 */
class TrackingError extends StandupError {
    constructor(message, trackingType, details) {
        super(message, 'TRACKING_ERROR', details);
        this.trackingType = trackingType;
    }
    getUserMessage() {
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
exports.TrackingError = TrackingError;
/**
 * Storage-related errors (persistence issues, data corruption, etc.)
 */
class StorageError extends StandupError {
    constructor(message, storageKey, details) {
        super(message, 'STORAGE_ERROR', details);
        this.storageKey = storageKey;
    }
    getUserMessage() {
        return `Storage Error: ${this.message}`;
    }
}
exports.StorageError = StorageError;
/**
 * Validation errors for user input
 */
class ValidationError extends StandupError {
    constructor(message, field, details) {
        super(message, 'VALIDATION_ERROR', details);
        this.field = field;
    }
    getUserMessage() {
        if (this.field) {
            return `Invalid value for "${this.field}": ${this.message}`;
        }
        return `Validation Error: ${this.message}`;
    }
}
exports.ValidationError = ValidationError;
/**
 * Export-related errors (Notion, Jira, etc.)
 */
class ExportError extends StandupError {
    constructor(message, exportType, details) {
        super(message, 'EXPORT_ERROR', details);
        this.exportType = exportType;
    }
    getUserMessage() {
        if (this.exportType) {
            return `Failed to export to ${this.exportType}: ${this.message}`;
        }
        return `Export Error: ${this.message}`;
    }
}
exports.ExportError = ExportError;
/**
 * Helper function to determine if an error is a StandupError
 */
function isStandupError(error) {
    return error instanceof StandupError;
}
/**
 * Helper function to safely get error message
 */
function getErrorMessage(error) {
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
function toStandupError(error) {
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
//# sourceMappingURL=errors.js.map