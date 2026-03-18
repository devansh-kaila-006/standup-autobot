"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HistoryService = void 0;
/**
 * Service to manage standup history and daily activity logs in VS Code globalState.
 */
class HistoryService {
    constructor(context) {
        this.context = context;
    }
    /**
     * Saves a new standup entry and trims history to the last 30 days.
     */
    async saveStandup(text) {
        const history = this.getHistory();
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        const newEntry = {
            id: Date.now().toString(),
            date: dateStr,
            timestamp: now.getTime(),
            text
        };
        // Add new entry to the beginning
        history.unshift(newEntry);
        // Filter: Keep only entries from the last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();
        const trimmedHistory = history.filter(entry => entry.timestamp > cutoffTime);
        await this.context.globalState.update(HistoryService.HISTORY_KEY, trimmedHistory);
    }
    /**
     * Records or updates file activity for the current date.
     */
    async logActivity(fileCount) {
        const activities = this.getAllActivity();
        const today = new Date().toISOString().split('T')[0];
        const existingIndex = activities.findIndex(a => a.date === today);
        if (existingIndex >= 0) {
            // Set to the latest count (rather than accumulate, to avoid double counting on re-runs)
            activities[existingIndex].fileCount = fileCount;
        }
        else {
            // Create new entry
            activities.push({ date: today, fileCount });
        }
        // Keep only last 30 days of activity too
        if (activities.length > 30) {
            activities.shift();
        }
        await this.context.globalState.update(HistoryService.ACTIVITY_KEY, activities);
    }
    /**
     * Retrieves full history.
     */
    getHistory() {
        return this.context.globalState.get(HistoryService.HISTORY_KEY, []);
    }
    /**
     * Retrieves all activity data.
     */
    getAllActivity() {
        return this.context.globalState.get(HistoryService.ACTIVITY_KEY, []);
    }
    /**
     * Gets standups from the last 7 days for the digest.
     */
    getWeeklySummaries() {
        const history = this.getHistory();
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoffTime = sevenDaysAgo.getTime();
        return history.filter(entry => entry.timestamp > cutoffTime);
    }
}
exports.HistoryService = HistoryService;
HistoryService.HISTORY_KEY = 'standup.history';
HistoryService.ACTIVITY_KEY = 'standup.activityDaily';
//# sourceMappingURL=HistoryService.js.map