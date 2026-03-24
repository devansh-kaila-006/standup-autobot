import * as vscode from 'vscode';
export interface ActivityReport {
    file: string;
    timeSpent: string;
    linesChanged: number;
}
export declare class ActivityTracker {
    private context;
    private readonly ACTIVE_THRESHOLD;
    private stats;
    private disposable;
    private intervalTimer?;
    private debouncedSaveState;
    private pendingSaves;
    private saveTimer?;
    private activityRateLimiter;
    constructor(context: vscode.ExtensionContext);
    /**
     * Updates the last active timestamp and increments line counters.
     */
    private updateFileActivity;
    /**
     * Calculates rough lines changed based on content changes.
     */
    private calculateLinesChanged;
    /**
     * Runs every second to check if the currently active file should accumulate time.
     */
    private startTimer;
    /**
     * Returns the report in the requested format.
     */
    getTopFiles(limit?: number): ActivityReport[];
    /**
     * Returns the total number of unique files touched during the session.
     */
    getFileCount(): number;
    /**
     * Save current stats to VS Code global state (immediate).
     */
    private saveStateImmediate;
    /**
     * Save current stats to VS Code global state (debounced).
     */
    private saveState;
    /**
     * Load stats from VS Code global state.
     */
    private loadState;
    reset(): void;
    dispose(): void;
    /**
     * Get performance statistics for the activity tracker
     */
    getPerformanceStats(): {
        activityOperations: any;
        rateLimiterStats: {
            availableCalls: number;
            queueLength: number;
        };
        recommendations: string[];
    };
}
//# sourceMappingURL=activityTracker.d.ts.map