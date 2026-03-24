import * as vscode from 'vscode';
import { StandupError } from './errors';
import { Icons } from './iconUtils';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
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
export class Logger {
    private outputChannel: vscode.OutputChannel;
    private logBuffer: LogEntry[] = [];
    private maxBufferSize = 1000;
    private currentLevel: LogLevel;

    constructor(
        private name: string,
        level: LogLevel = LogLevel.INFO
    ) {
        this.outputChannel = vscode.window.createOutputChannel(`Standup Autobot: ${name}`);
        this.currentLevel = level;
    }

    /**
     * Set the minimum log level
     */
    setLevel(level: LogLevel): void {
        this.currentLevel = level;
    }

    /**
     * Get the current log level
     */
    getLevel(): LogLevel {
        return this.currentLevel;
    }

    /**
     * Log debug message
     */
    debug(message: string, context?: any): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * Log info message
     */
    info(message: string, context?: any): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * Log warning message
     */
    warn(message: string, context?: any): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * Log error message
     */
    error(message: string, error?: Error | StandupError | unknown, context?: any): void {
        let errorContext;

        if (error instanceof Error) {
            errorContext = {
                name: error.name,
                message: error.message,
                code: error instanceof StandupError ? error.code : undefined,
                stack: error.stack,
            };
        } else if (error && typeof error === 'object') {
            errorContext = {
                name: (error as any).name || 'Unknown',
                message: (error as any).message || String(error),
                code: (error as any).code,
                stack: (error as any).stack,
            };
        } else if (error !== undefined) {
            errorContext = {
                name: 'Unknown',
                message: String(error),
            };
        }

        this.log(LogLevel.ERROR, message, { ...context, error: errorContext });
    }

    /**
     * Internal logging method
     */
    private log(level: LogLevel, message: string, context?: any): void {
        if (level < this.currentLevel) {
            return;
        }

        const entry: LogEntry = {
            level,
            levelName: LogLevel[level],
            message,
            timestamp: new Date().toISOString(),
            context,
        };

        // Add to buffer
        this.logBuffer.push(entry);
        if (this.logBuffer.length > this.maxBufferSize) {
            this.logBuffer.shift();
        }

        // Output to channel
        const formattedMessage = this.formatEntry(entry);
        this.outputChannel.appendLine(formattedMessage);

        // Also output to console for development
        if (process.env.NODE_ENV === 'development') {
            const consoleMethod = level === LogLevel.ERROR ? console.error :
                                 level === LogLevel.WARN ? console.warn :
                                 level === LogLevel.DEBUG ? console.debug :
                                 console.log;
            consoleMethod(`[${this.name}]`, formattedMessage);
        }
    }

    /**
     * Format a log entry for output
     */
    private formatEntry(entry: LogEntry): string {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        let message = `[${time}] [${entry.levelName}] ${entry.message}`;

        if (entry.context) {
            if (entry.context.error) {
                message += `\n  Error: ${entry.context.error.name}: ${entry.context.error.message}`;
                if (entry.context.error.code) {
                    message += ` (Code: ${entry.context.error.code})`;
                }
                if (entry.context.error.stack) {
                    message += `\n  Stack: ${entry.context.error.stack}`;
                }
                // Don't log the error object again in context
                const { error, ...rest } = entry.context;
                if (Object.keys(rest).length > 0) {
                    message += `\n  Context: ${JSON.stringify(rest, null, 2)}`;
                }
            } else {
                message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
            }
        }

        return message;
    }

    /**
     * Get all log entries
     */
    getLogs(): LogEntry[] {
        return [...this.logBuffer];
    }

    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level: LogLevel): LogEntry[] {
        return this.logBuffer.filter(entry => entry.level >= level);
    }

    /**
     * Get logs as JSON string
     */
    getLogsAsJSON(): string {
        return JSON.stringify(this.logBuffer, null, 2);
    }

    /**
     * Get logs as markdown
     */
    getLogsAsMarkdown(): string {
        const lines: string[] = ['# Standup Autobot Logs', ''];

        for (const entry of this.logBuffer) {
            const icon = entry.level === LogLevel.ERROR ? Icons.xmark() :
                        entry.level === LogLevel.WARN ? Icons.warning() :
                        entry.level === LogLevel.DEBUG ? '🔍' :
                        Icons.info();

            lines.push(`### ${icon} ${entry.levelName} - ${entry.timestamp}`);
            lines.push(entry.message);

            if (entry.context) {
                lines.push('**Context:**');
                lines.push('```json');
                lines.push(JSON.stringify(entry.context, null, 2));
                lines.push('```');
            }
            lines.push('');
        }

        return lines.join('\n');
    }

    /**
     * Clear all logs
     */
    clear(): void {
        this.logBuffer = [];
        this.outputChannel.clear();
    }

    /**
     * Show the output channel
     */
    show(): void {
        this.outputChannel.show();
    }

    /**
     * Dispose of the output channel
     */
    dispose(): void {
        this.outputChannel.dispose();
    }
}

/**
 * Global logger instance
 */
let globalLogger: Logger | null = null;

/**
 * Initialize the global logger
 */
export function initLogger(level: LogLevel = LogLevel.INFO): Logger {
    if (!globalLogger) {
        globalLogger = new Logger('Main', level);
    }
    return globalLogger;
}

/**
 * Get the global logger instance
 */
export function getLogger(): Logger {
    if (!globalLogger) {
        globalLogger = initLogger();
    }
    return globalLogger;
}

/**
 * Create a named logger
 */
export function createLogger(name: string, level?: LogLevel): Logger {
    return new Logger(name, level);
}
