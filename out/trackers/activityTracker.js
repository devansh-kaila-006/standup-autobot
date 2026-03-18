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
class ActivityTracker {
    constructor(context) {
        this.context = context;
        // Threshold in milliseconds (60 seconds) to consider a file "active"
        this.ACTIVE_THRESHOLD = 60 * 1000;
        // Store data in memory: Key = File URI string, Value = Stats
        this.stats = new Map();
        // Load previously saved data
        this.loadState();
        // 1. Track file switches
        const activeTextEditorSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
            if (editor && editor.document.uri.scheme === 'file') {
                this.updateFileActivity(editor.document.uri.fsPath, 0);
            }
        });
        // 2. Track text modifications
        const textDocumentChangeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
            if (e.document.uri.scheme === 'file') {
                // Calculate lines changed in this specific edit
                const linesDelta = this.calculateLinesChanged(e);
                this.updateFileActivity(e.document.uri.fsPath, linesDelta);
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
        // Persist immediately on significant events to avoid data loss on crash
        this.saveState();
    }
    /**
     * Calculates rough lines changed based on content changes.
     */
    calculateLinesChanged(event) {
        let lines = 0;
        for (const change of event.contentChanges) {
            // Calculate the line span of the change. 
            const changeLines = change.range.end.line - change.range.start.line + 1;
            lines += Math.max(1, changeLines);
        }
        return lines;
    }
    /**
     * Runs every second to check if the currently active file should accumulate time.
     */
    startTimer() {
        this.intervalTimer = setInterval(() => {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor || activeEditor.document.uri.scheme !== 'file') {
                return;
            }
            const filePath = activeEditor.document.uri.fsPath;
            const fileStats = this.stats.get(filePath);
            if (fileStats) {
                const now = Date.now();
                const timeSinceLastActive = now - fileStats.lastActiveTimestamp;
                // If the file was modified or switched to within the threshold, count this second.
                if (timeSinceLastActive < this.ACTIVE_THRESHOLD) {
                    fileStats.timeSeconds++;
                }
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
     * Save current stats to VS Code global state.
     */
    saveState() {
        const plainObj = Object.fromEntries(this.stats.entries());
        this.context.globalState.update('activityTrackerData', plainObj);
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
        if (this.intervalTimer) {
            clearInterval(this.intervalTimer);
        }
        this.disposable.dispose();
        this.saveState(); // Final save on dispose
    }
}
exports.ActivityTracker = ActivityTracker;
//# sourceMappingURL=activityTracker.js.map