import * as vscode from 'vscode';

export interface StandupEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: number;
  text: string;
}

export interface DailyActivity {
  date: string; // YYYY-MM-DD
  fileCount: number;
}

/**
 * Service to manage standup history and daily activity logs in VS Code globalState.
 */
export class HistoryService {
  private static readonly HISTORY_KEY = 'standup.history';
  private static readonly ACTIVITY_KEY = 'standup.activityDaily';

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Saves a new standup entry and trims history to the last 30 days.
   */
  public async saveStandup(text: string): Promise<void> {
    const history = this.getHistory();
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];

    const newEntry: StandupEntry = {
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
  public async logActivity(fileCount: number): Promise<void> {
    const activities = this.getAllActivity();
    const today = new Date().toISOString().split('T')[0];
    
    const existingIndex = activities.findIndex(a => a.date === today);

    if (existingIndex >= 0) {
      // Set to the latest count (rather than accumulate, to avoid double counting on re-runs)
      activities[existingIndex].fileCount = fileCount;
    } else {
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
  public getHistory(): StandupEntry[] {
    return this.context.globalState.get<StandupEntry[]>(HistoryService.HISTORY_KEY, []);
  }

  /**
   * Retrieves all activity data.
   */
  public getAllActivity(): DailyActivity[] {
    return this.context.globalState.get<DailyActivity[]>(HistoryService.ACTIVITY_KEY, []);
  }

  /**
   * Gets standups from the last 7 days for the digest.
   */
  public getWeeklySummaries(): StandupEntry[] {
    const history = this.getHistory();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTime = sevenDaysAgo.getTime();

    return history.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Gets activity intensity for the last 7 days (normalized 0.0 to 1.0).
   */
  public getWeeklyActivityIntensity(): number[] {
    const activities = this.getAllActivity();
    const today = new Date();
    const result: number[] = new Array(7).fill(0);

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(today.getDate() - (6 - i)); // 0: 6 days ago, 6: today
        const dateStr = d.toISOString().split('T')[0];
        const activity = activities.find(a => a.date === dateStr);
        if (activity) {
            // Assume 10+ files per day is "high" (1.0)
            result[i] = Math.min(activity.fileCount / 10, 1.0);
        }
    }
    return result;
  }
}
