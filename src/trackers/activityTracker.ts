import * as vscode from 'vscode';
import { isIgnored } from '../utils/ignore';
import { ConfigManager } from '../utils/ConfigManager';
import { debounce } from '../utils/debounce';
import { globalPerformanceMonitor } from '../utils/performanceMonitor';
import { createRateLimiter } from '../utils/rateLimiter';

interface FileStats {
  /** Total accumulated seconds the user was actively working on this file */
  timeSeconds: number;
  /** Total lines changed (added/deleted/modified) */
  linesChanged: number;
  /** Timestamp of the last interaction (edit or switch) */
  lastActiveTimestamp: number;
}

export interface ActivityReport {
  file: string;
  timeSpent: string;
  linesChanged: number;
}

export class ActivityTracker {
  // Threshold in milliseconds (60 seconds) to consider a file "active"
  private readonly ACTIVE_THRESHOLD = 60 * 1000;

  // Store data in memory: Key = File URI string, Value = Stats
  private stats: Map<string, FileStats> = new Map();

  private disposable: vscode.Disposable;
  private intervalTimer?: NodeJS.Timeout;
  private debouncedSaveState: () => void;
  private pendingSaves: Set<string> = new Set();
  private saveTimer?: NodeJS.Timeout;

  // Performance optimization: Rate limiter for file system events
  private activityRateLimiter = createRateLimiter({
    maxCalls: 100, // Maximum 100 activity updates
    timeframe: 10000, // Within 10 seconds
    queue: false, // Don't queue, just drop excess calls
  });

  constructor(private context: vscode.ExtensionContext) {
    // Load previously saved data
    this.loadState();

    // Create debounced saveState (save after 1 second of inactivity)
    const debouncedFn = debounce(
      this.saveStateImmediate.bind(this),
      1000
    );
    this.debouncedSaveState = () => debouncedFn.execute();

    // 1. Track file switches (with rate limiting)
    const activeTextEditorSubscription = vscode.window.onDidChangeActiveTextEditor(async (editor) => {
      if (editor && editor.document.uri.scheme === 'file') {
        await this.activityRateLimiter.execute(
          () => this.updateFileActivity(editor.document.uri.fsPath, 0)
        );
      }
    });

    // 2. Track text modifications (rate-limited and debounced to reduce overhead)
    const textDocumentChangeSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
      if (e.document.uri.scheme === 'file') {
        // Calculate lines changed in this specific edit
        const linesDelta = this.calculateLinesChanged(e);
        await this.activityRateLimiter.execute(
          () => this.updateFileActivity(e.document.uri.fsPath, linesDelta)
        );
      }
    });

    // 3. Start the heartbeat timer to accumulate time
    this.startTimer();

    // Combine subscriptions for cleanup
    this.disposable = vscode.Disposable.from(
      activeTextEditorSubscription,
      textDocumentChangeSubscription
    );
  }

  /**
   * Updates the last active timestamp and increments line counters.
   */
  private updateFileActivity(filePath: string, linesAdded: number) {
    const stop = globalPerformanceMonitor.start('activityTracker.updateFileActivity');
    try {
      // 1. Check if tracking is paused
      if (this.context.globalState.get<boolean>('standup.paused', false)) {
        return;
      }

      // 2. Check if file is ignored
      const ignorePatterns = ConfigManager.get<string[]>('ignorePatterns');
      if (isIgnored(filePath, ignorePatterns)) {
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
    } finally {
      stop();
    }
  }

  /**
   * Calculates rough lines changed based on content changes.
   */
  private calculateLinesChanged(event: vscode.TextDocumentChangeEvent): number {
    const stop = globalPerformanceMonitor.start('activityTracker.calculateLinesChanged');
    try {
      let lines = 0;
      for (const change of event.contentChanges) {
        // Calculate the line span of the change.
        const changeLines = change.range.end.line - change.range.start.line + 1;
        lines += Math.max(1, changeLines);
      }
      return lines;
    } finally {
      stop();
    }
  }

  /**
   * Runs every second to check if the currently active file should accumulate time.
   */
  private startTimer() {
    this.intervalTimer = setInterval(() => {
      const stop = globalPerformanceMonitor.start('activityTracker.timerTick');
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
      } finally {
        stop();
      }
    }, 1000);
  }

  /**
   * Returns the report in the requested format.
   */
  public getTopFiles(limit: number = 5): ActivityReport[] {
    const report: ActivityReport[] = [];

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
   * Returns the report for files tracked since the last daily trigger time.
   * This resets at the configured trigger time (e.g., 9:00 AM) rather than midnight.
   */
  public getTopFilesToday(limit: number = 5): ActivityReport[] {
    const triggerTime = this.getLastTriggerTime();
    const report: ActivityReport[] = [];

    this.stats.forEach((value, key) => {
      // Only include files active since the last trigger time
      if (value.lastActiveTimestamp < triggerTime) {
        return;
      }

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
  public getFileCount(): number {
    return this.stats.size;
  }

  /**
   * Returns the number of files tracked since the last daily trigger time.
   * This resets at the configured trigger time (e.g., 9:00 AM) rather than midnight.
   */
  public getFileCountToday(): number {
    const triggerTime = this.getLastTriggerTime();
    let count = 0;

    for (const [_, stats] of this.stats.entries()) {
      if (stats.lastActiveTimestamp >= triggerTime) {
        count++;
      }
    }

    return count;
  }

  /**
   * Calculates the last trigger time based on the configured trigger time.
   * For example, if trigger time is 09:00 and it's currently 14:00, returns 09:00 today.
   * If it's currently 08:00, returns 09:00 yesterday.
   */
  private getLastTriggerTime(): number {
    const config = vscode.workspace.getConfiguration('standup');
    const triggerTimeStr = config.get<string>('triggerTime', '09:00');

    const [hours, minutes] = triggerTimeStr.split(':').map(Number);
    const now = new Date();
    const triggerTimeToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      hours,
      minutes,
      0,
      0
    );

    // If the trigger time hasn't occurred yet today, use yesterday's trigger time
    if (triggerTimeToday > now) {
      triggerTimeToday.setDate(triggerTimeToday.getDate() - 1);
    }

    return triggerTimeToday.getTime();
  }

  /**
   * Save current stats to VS Code global state (immediate).
   */
  private saveStateImmediate() {
    const plainObj = Object.fromEntries(this.stats.entries());
    this.context.globalState.update('activityTrackerData', plainObj);
    this.pendingSaves.clear();
  }

  /**
   * Save current stats to VS Code global state (debounced).
   */
  private saveState() {
    // Use debounced version to reduce write operations
    this.debouncedSaveState();
  }

  /**
   * Load stats from VS Code global state.
   */
  private loadState() {
    const storedData = this.context.globalState.get<Record<string, FileStats>>('activityTrackerData');
    if (storedData) {
      this.stats = new Map(Object.entries(storedData));
    }
  }

  public reset(): void {
    this.stats.clear();
    this.saveState();
  }

  public dispose() {
    // Cancel any pending debounced saves
    if (this.debouncedSaveState && typeof (this.debouncedSaveState as any).cancel === 'function') {
      (this.debouncedSaveState as any).cancel();
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
  public getPerformanceStats(): {
    activityOperations: any;
    rateLimiterStats: {
      availableCalls: number;
      queueLength: number;
    };
    recommendations: string[];
  } {
    const activityOperations = globalPerformanceMonitor.getStats('activityTracker.updateFileActivity');
    const calculateLinesOps = globalPerformanceMonitor.getStats('activityTracker.calculateLinesChanged');
    const timerTickOps = globalPerformanceMonitor.getStats('activityTracker.timerTick');

    const recommendations: string[] = [];

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
