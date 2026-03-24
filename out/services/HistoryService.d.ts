import * as vscode from 'vscode';
export interface StandupEntry {
    id: string;
    date: string;
    timestamp: number;
    text: string;
}
export interface DailyActivity {
    date: string;
    fileCount: number;
}
/**
 * Service to manage standup history and daily activity logs in VS Code globalState.
 */
export declare class HistoryService {
    private context;
    private static readonly HISTORY_KEY;
    private static readonly ACTIVITY_KEY;
    constructor(context: vscode.ExtensionContext);
    /**
     * Generates a unique ID for standup entries.
     */
    private generateUniqueId;
    /**
     * Saves a new standup entry and trims history to the last 30 days.
     */
    saveStandup(text: string): Promise<void>;
    /**
     * Records or updates file activity for the current date.
     */
    logActivity(fileCount: number): Promise<void>;
    /**
     * Retrieves full history.
     */
    getHistory(): StandupEntry[];
    /**
     * Retrieves all activity data.
     */
    getAllActivity(): DailyActivity[];
    /**
     * Gets standups from the last 7 days for the digest.
     */
    getWeeklySummaries(): StandupEntry[];
    /**
     * Gets activity intensity for the last 7 days (normalized 0.0 to 1.0).
     */
    getWeeklyActivityIntensity(): number[];
}
//# sourceMappingURL=HistoryService.d.ts.map