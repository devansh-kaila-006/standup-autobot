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
exports.Logger = exports.LogLevel = void 0;
exports.initLogger = initLogger;
exports.getLogger = getLogger;
exports.createLogger = createLogger;
const vscode = __importStar(require("vscode"));
const errors_1 = require("./errors");
const iconUtils_1 = require("./iconUtils");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
/**
 * Structured logging system for Standup Autobot
 * Provides consistent logging with different levels and context
 */
class Logger {
    constructor(name, level = LogLevel.INFO) {
        this.name = name;
        this.logBuffer = [];
        this.maxBufferSize = 1000;
        this.outputChannel = vscode.window.createOutputChannel(`Standup Autobot: ${name}`);
        this.currentLevel = level;
    }
    /**
     * Set the minimum log level
     */
    setLevel(level) {
        this.currentLevel = level;
    }
    /**
     * Get the current log level
     */
    getLevel() {
        return this.currentLevel;
    }
    /**
     * Log debug message
     */
    debug(message, context) {
        this.log(LogLevel.DEBUG, message, context);
    }
    /**
     * Log info message
     */
    info(message, context) {
        this.log(LogLevel.INFO, message, context);
    }
    /**
     * Log warning message
     */
    warn(message, context) {
        this.log(LogLevel.WARN, message, context);
    }
    /**
     * Log error message
     */
    error(message, error, context) {
        let errorContext;
        if (error instanceof Error) {
            errorContext = {
                name: error.name,
                message: error.message,
                code: error instanceof errors_1.StandupError ? error.code : undefined,
                stack: error.stack,
            };
        }
        else if (error && typeof error === 'object') {
            errorContext = {
                name: error.name || 'Unknown',
                message: error.message || String(error),
                code: error.code,
                stack: error.stack,
            };
        }
        else if (error !== undefined) {
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
    log(level, message, context) {
        if (level < this.currentLevel) {
            return;
        }
        const entry = {
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
    formatEntry(entry) {
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
            }
            else {
                message += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
            }
        }
        return message;
    }
    /**
     * Get all log entries
     */
    getLogs() {
        return [...this.logBuffer];
    }
    /**
     * Get logs filtered by level
     */
    getLogsByLevel(level) {
        return this.logBuffer.filter(entry => entry.level >= level);
    }
    /**
     * Get logs as JSON string
     */
    getLogsAsJSON() {
        return JSON.stringify(this.logBuffer, null, 2);
    }
    /**
     * Get logs as markdown
     */
    getLogsAsMarkdown() {
        const lines = ['# Standup Autobot Logs', ''];
        for (const entry of this.logBuffer) {
            const icon = entry.level === LogLevel.ERROR ? iconUtils_1.Icons.xmark() :
                entry.level === LogLevel.WARN ? iconUtils_1.Icons.warning() :
                    entry.level === LogLevel.DEBUG ? '🔍' :
                        iconUtils_1.Icons.info();
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
    clear() {
        this.logBuffer = [];
        this.outputChannel.clear();
    }
    /**
     * Show the output channel
     */
    show() {
        this.outputChannel.show();
    }
    /**
     * Dispose of the output channel
     */
    dispose() {
        this.outputChannel.dispose();
    }
}
exports.Logger = Logger;
/**
 * Global logger instance
 */
let globalLogger = null;
/**
 * Initialize the global logger
 */
function initLogger(level = LogLevel.INFO) {
    if (!globalLogger) {
        globalLogger = new Logger('Main', level);
    }
    return globalLogger;
}
/**
 * Get the global logger instance
 */
function getLogger() {
    if (!globalLogger) {
        globalLogger = initLogger();
    }
    return globalLogger;
}
/**
 * Create a named logger
 */
function createLogger(name, level) {
    return new Logger(name, level);
}
//# sourceMappingURL=Logger.js.map