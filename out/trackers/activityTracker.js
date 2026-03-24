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
exports.ActivityTracker = void 0;
const vscode = __importStar(require("vscode"));
const ignore_1 = require("../utils/ignore");
const ConfigManager_1 = require("../utils/ConfigManager");
const debounce_1 = require("../utils/debounce");
const performanceMonitor_1 = require("../utils/performanceMonitor");
const rateLimiter_1 = require("../utils/rateLimiter");
class ActivityTracker {
    constructor(context) {
        this.context = context;
        // Threshold in milliseconds (60 seconds) to consider a file "active"
        this.ACTIVE_THRESHOLD = 60 * 1000;
        // Store data in memory: Key = File URI string, Value = Stats
        this.stats = new Map();
        this.pendingSaves = new Set();
        // Performance optimization: Rate limiter for file system events
        this.activityRateLimiter = (0, rateLimiter_1.createRateLimiter)({
            maxCalls: 100, // Maximum 100 activity updates
            timeframe: 10000, // Within 10 seconds
            queue: false, // Don't queue, just drop excess calls
        });
        // Load previously saved data
        this.loadState();
        // Create debounced saveState (save after 1 second of inactivity)
        const debouncedFn = (0, debounce_1.debounce)(this.saveStateImmediate.bind(this), 1000);
        this.debouncedSaveState = () => debouncedFn.execute();
        // 1. Track file switches (with rate limiting)
        const activeTextEditorSubscription = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
            if (editor && editor.document.uri.scheme === 'file') {
                await this.activityRateLimiter.execute(() => this.updateFileActivity(editor.document.uri.fsPath, 0));
            }
        });
        // 2. Track text modifications (rate-limited and debounced to reduce overhead)
        const textDocumentChangeSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
            if (e.document.uri.scheme === 'file') {
                // Calculate lines changed in this specific edit
                const linesDelta = this.calculateLinesChanged(e);
                await this.activityRateLimiter.execute(() => this.updateFileActivity(e.document.uri.fsPath, linesDelta));
            }
        });
        // 3. Start the heartbeat timer to accumulate time
        this.startTimer();
        // Combine subscriptions for cleanup
        this.disposable = vscode.Disposable.from(activeTextEditorSubscription, textDocumentChangeSubscription);
    }
    /**
     * Updates the last active timestamp and increments line counters.
     */
    updateFileActivity(filePath, linesAdded) {
        const stop = performanceMonitor_1.globalPerformanceMonitor.start('activityTracker.updateFileActivity');
        try {
            // 1. Check if tracking is paused
            if (this.context.globalState.get('standup.paused', false)) {
                return;
            }
            // 2. Check if file is ignored
            const ignorePatterns = ConfigManager_1.ConfigManager.get('ignorePatterns');
            if ((0, ignore_1.isIgnored)(filePath, ignorePatterns)) {
                return;
            }
            const currentStats = this.stats.get(filePath) || {
                timeSeconds: 0,
                linesChanged: 0,
                lastActiveTimestamp: 0,
            };
            // Update stats
            currentStats.linesChanged += linesAdded;
            currentStats.lastActiveTimestamp = Date.now();
            this.stats.set(filePath, currentStats);
            // Mark this file as pending save
            this.pendingSaves.add(filePath);
            // Debounce save to reduce VS Code state operations
            this.debouncedSaveState();
        }
        finally {
            stop();
        }
    }
    /**
     * Calculates rough lines changed based on content changes.
     */
    calculateLinesChanged(event) {
        const stop = performanceMonitor_1.globalPerformanceMonitor.start('activityTracker.calculateLinesChanged');
        try {
            let lines = 0;
            for (const change of event.contentChanges) {
                // Calculate the line span of the change.
                const changeLines = change.range.end.line - change.range.start.line + 1;
                lines += Math.max(1, changeLines);
            }
            return lines;
        }
        finally {
            stop();
        }
    }
    /**
     * Runs every second to check if the currently active file should accumulate time.
     */
    startTimer() {
        this.intervalTimer = setInterval(() => {
            const stop = performanceMonitor_1.globalPerformanceMonitor.start('activityTracker.timerTick');
            try {
                const activeEditor = vscode.window.activeTextEditor;
                if (!activeEditor || activeEditor.document.uri.scheme !== 'file') {
                    return;
                }
                const filePath = activeEditor.document.uri.fsPath;
                const fileStats = this.stats.get(filePath);
                if (fileStats) {
                    const now = Date.now();
                    const timeSinceLastActive = now - fileStats.lastActiveTimestamp;
                    // If the file modified or switched to within the threshold, count this second.
                    if (timeSinceLastActive < this.ACTIVE_THRESHOLD) {
                        fileStats.timeSeconds++;
                    }
                }
            }
            finally {
                stop();
            }
        }, 1000);
    }
    /**
     * Returns the report in the requested format.
     */
    getTopFiles(limit = 5) {
        const report = [];
        this.stats.forEach((value, key) => {
            // Format seconds to "X mins" (rounded)
            const minutes = Math.round(value.timeSeconds / 60);
            // Only include files that have at least 1 minute or 1 line change tracked
            if (minutes > 0 || value.linesChanged > 0) {
                report.push({
                    file: key,
                    timeSpent: `${minutes} mins`,
                    linesChanged: value.linesChanged,
                });
            }
        });
        // Sort by line changes descending (or could be timeSpent)
        return report
            .sort((a, b) => b.linesChanged - a.linesChanged)
            .slice(0, limit);
    }
    /**
     * Returns the total number of unique files touched during the session.
     */
    getFileCount() {
        return this.stats.size;
    }
    /**
     * Save current stats to VS Code global state (immediate).
     */
    saveStateImmediate() {
        const plainObj = Object.fromEntries(this.stats.entries());
        this.context.globalState.update('activityTrackerData', plainObj);
        this.pendingSaves.clear();
    }
    /**
     * Save current stats to VS Code global state (debounced).
     */
    saveState() {
        // Use debounced version to reduce write operations
        this.debouncedSaveState();
    }
    /**
     * Load stats from VS Code global state.
     */
    loadState() {
        const storedData = this.context.globalState.get('activityTrackerData');
        if (storedData) {
            this.stats = new Map(Object.entries(storedData));
        }
    }
    reset() {
        this.stats.clear();
        this.saveState();
    }
    dispose() {
        // Cancel any pending debounced saves
        if (this.debouncedSaveState && typeof this.debouncedSaveState.cancel === 'function') {
            this.debouncedSaveState.cancel();
        }
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
        }
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
        this.disposable.dispose();
        // Final save on dispose (immediate)
        this.saveStateImmediate();
    }
    /**
     * Get performance statistics for the activity tracker
     */
    getPerformanceStats() {
        const activityOperations = performanceMonitor_1.globalPerformanceMonitor.getStats('activityTracker.updateFileActivity');
        const calculateLinesOps = performanceMonitor_1.globalPerformanceMonitor.getStats('activityTracker.calculateLinesChanged');
        const timerTickOps = performanceMonitor_1.globalPerformanceMonitor.getStats('activityTracker.timerTick');
        const recommendations = [];
        // Check performance and generate recommendations
        if (activityOperations && activityOperations.averageDuration > 10) {
            recommendations.push('File activity updates are averaging >10ms. Consider reducing file system checks.');
        }
        if (this.stats.size > 1000) {
            recommendations.push('Large number of tracked files (>1000). Consider implementing automatic cleanup.');
        }
        if (this.pendingSaves.size > 50) {
            recommendations.push('Many pending saves (>50). Save operations may be bottlenecked.');
        }
        return {
            activityOperations: activityOperations?.averageDuration || 0,
            rateLimiterStats: {
                availableCalls: 100, // Rate limiter configured for 100 calls per 10 seconds
                queueLength: 0, // Queue is disabled
            },
            recommendations,
        };
    }
}
exports.ActivityTracker = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map