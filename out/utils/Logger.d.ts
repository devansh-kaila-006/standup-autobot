import { StandupError } from './errors';
export declare enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}
export interface LogEntry {
    level: LogLevel;
    levelName: string;
    message: string;
    timestamp: string;
    context?: any;
    error?: {
        name: string;
        message: string;
        code?: string;
        stack?: string;
    };
}
/**
 * Structured logging system for Standup Autobot
 * Provides consistent logging with different levels and context
 */
export declare class Logger {
    private name;
    private outputChannel;
    private logBuffer;
    private maxBufferSize;
    private currentLevel;
    constructor(name: string, level?: LogLevel);
    /**
     * Set the minimum log level
     */
    setLevel(level: LogLevel): void;
    /**
     * Get the current log level
     */
    getLevel(): LogLevel;
    /**
     * Log debug message
     */
    debug(message: string, context?: any): void;
    /**
     * Log info message
     */
    info(message: string, context?: any): void;
    /**
     * Log warning message
     */
    warn(message: string, context?: any): void;
    /**
     * Log error message
     */
    error(message: string, error?: Error | StandupError, context?: any): void;
    /**
     * Internal logging method
     */
    private log;
    /**
     * Format a log entry for output
     */
    private formatEntry;
    /**
     * Get all log entries
     */
    getLogs(): LogEntry[];
    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[];
    /**
     * Get logs as JSON string
     */
    getLogsAsJSON(): string;
    /**
     * Get logs as markdown
     */
    getLogsAsMarkdown(): string;
    /**
     * Clear all logs
     */
    clear(): void;
    /**
     * Show the output channel
     */
    show(): void;
    /**
     * Dispose of the output channel
     */
    dispose(): void;
}
/**
 * Initialize the global logger
 */
export declare function initLogger(level?: LogLevel): Logger;
/**
 * Get the global logger instance
 */
export declare function getLogger(): Logger;
/**
 * Create a named logger
 */
export declare function createLogger(name: string, level?: LogLevel): Logger;
//# sourceMappingURL=Logger.d.ts.map