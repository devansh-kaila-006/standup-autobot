"use strict";
/**
 * Analytics Service
 *
 * Provides advanced analytics and insights for developer activity data.
 * Generates productivity reports, trend analysis, and custom dashboards.
 *
 * @example
 * ```typescript
 * const analytics = new AnalyticsService(context);
 * const insights = await analytics.getProductivityInsights(30);
 * console.log(`Most productive hours: ${insights.mostProductiveHours}`);
 * ```
 *
 * @class AnalyticsService
 * @public
 */
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
exports.AnalyticsService = void 0;
const vscode = __importStar(require("vscode"));
/**
 * Analytics Service class for providing developer activity insights.
 *
 * @class
 * @public
 * @example
 * ```typescript
 * const analytics = new AnalyticsService(extensionContext);
 * const metrics = await analytics.getProductivityInsights(30);
 * ```
 */
class AnalyticsService {
    /**
     * Creates a new AnalyticsService instance.
     *
     * @param context - VS Code extension context for accessing global state
     * @public
     * @constructor
     */
    constructor(context) {
        this.context = context;
    }
    /**
     * Get productivity insights based on historical activity data.
     *
     * Analyzes activity from the last N days to provide:
     * - Most productive hours (top 3 hours with highest activity)
     * - Average session length in minutes
     * - Total active time in hours
     * - Peak productivity day
     * - Activity distribution by type (file/git/terminal)
     *
     * @param days - Number of days to analyze (default: 30)
     * @returns Promise resolving to productivity metrics
     * @public
     * @example
     * ```typescript
     * const insights = await analytics.getProductivityInsights(7);
     * console.log(`Peak hour: ${insights.mostProductiveHours[0]}:00`);
     * ```
     */
    async getProductivityInsights(days = 30) {
        const activityLog = this.context.globalState.get('standup.activityLog');
        if (!activityLog || !activityLog.dailyLogs) {
            return this.getDefaultMetrics();
        }
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const relevantLogs = activityLog.dailyLogs.filter((log) => {
            return new Date(log.timestamp) >= cutoffDate;
        });
        // Analyze hourly activity distribution
        const hourlyActivity = new Array(24).fill(0);
        let totalActiveTime = 0;
        let totalSessions = 0;
        const activityDistribution = { file: 0, git: 0, terminal: 0 };
        relevantLogs.forEach((log) => {
            const hour = new Date(log.timestamp).getHours();
            hourlyActivity[hour]++;
            if (log.activities) {
                log.activities.forEach((activity) => {
                    // Type-safe distribution update
                    if (activity.type === 'file') {
                        activityDistribution.file++;
                        totalActiveTime += activity.timeSeconds || 0;
                        totalSessions++;
                    }
                    else if (activity.type === 'git') {
                        activityDistribution.git++;
                    }
                    else if (activity.type === 'terminal') {
                        activityDistribution.terminal++;
                    }
                });
            }
        });
        // Find most productive hours (top 3)
        const mostProductiveHours = hourlyActivity
            .map((count, hour) => ({ hour, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(item => item.hour);
        // Find peak productivity day
        const dayActivity = new Map();
        relevantLogs.forEach((log) => {
            const day = new Date(log.timestamp).toDateString();
            dayActivity.set(day, (dayActivity.get(day) || 0) + 1);
        });
        const peakDay = Array.from(dayActivity.entries())
            .sort((a, b) => b[1] - a[1])[0];
        return {
            mostProductiveHours,
            averageSessionLength: totalSessions > 0 ? totalActiveTime / totalSessions : 0,
            totalActiveTime,
            peakProductivityDay: peakDay ? peakDay[0] : new Date().toDateString(),
            activityDistribution,
        };
    }
    /**
     * Get trend data for visualization
     */
    async getTrendData(days = 30) {
        const activityLog = this.context.globalState.get('standup.activityLog');
        if (!activityLog || !activityLog.dailyLogs) {
            return [];
        }
        const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const relevantLogs = activityLog.dailyLogs
            .filter((log) => new Date(log.timestamp) >= cutoffDate)
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        const trendMap = new Map();
        relevantLogs.forEach((log) => {
            const dateKey = new Date(log.timestamp).toISOString().split('T')[0];
            if (!trendMap.has(dateKey)) {
                trendMap.set(dateKey, {
                    date: dateKey,
                    activityCount: 0,
                    linesChanged: 0,
                    commits: 0,
                    timeSpent: 0,
                });
            }
            const trend = trendMap.get(dateKey);
            trend.activityCount++;
            if (log.activities) {
                log.activities.forEach((activity) => {
                    if (activity.type === 'file') {
                        trend.linesChanged += activity.linesChanged || 0;
                        trend.timeSpent += activity.timeSeconds || 0;
                    }
                    else if (activity.type === 'git') {
                        trend.commits++;
                    }
                });
            }
        });
        return Array.from(trendMap.values());
    }
    /**
     * Generate sprint summary
     */
    async generateSprintSummary(sprintLength = 14) {
        const endDate = new Date();
        const startDate = new Date(Date.now() - sprintLength * 24 * 60 * 60 * 1000);
        const trendData = await this.getTrendData(sprintLength);
        const activityLog = this.context.globalState.get('standup.activityLog');
        let totalActivity = 0;
        let commitCount = 0;
        const fileActivity = new Map();
        if (activityLog && activityLog.dailyLogs) {
            const sprintLogs = activityLog.dailyLogs.filter((log) => {
                const logDate = new Date(log.timestamp);
                return logDate >= startDate && logDate <= endDate;
            });
            sprintLogs.forEach((log) => {
                totalActivity++;
                if (log.activities) {
                    log.activities.forEach((activity) => {
                        if (activity.type === 'git') {
                            commitCount++;
                        }
                        else if (activity.type === 'file' && activity.filePath) {
                            const current = fileActivity.get(activity.filePath) || { time: 0, linesChanged: 0 };
                            current.time += activity.timeSeconds || 0;
                            current.linesChanged += activity.linesChanged || 0;
                            fileActivity.set(activity.filePath, current);
                        }
                    });
                }
            });
        }
        // Calculate productivity trend
        const midPoint = Math.floor(trendData.length / 2);
        const firstHalfAvg = trendData.slice(0, midPoint)
            .reduce((sum, t) => sum + t.activityCount, 0) / midPoint;
        const secondHalfAvg = trendData.slice(midPoint)
            .reduce((sum, t) => sum + t.activityCount, 0) / (trendData.length - midPoint);
        let productivityTrend;
        if (secondHalfAvg > firstHalfAvg * 1.1) {
            productivityTrend = 'increasing';
        }
        else if (secondHalfAvg < firstHalfAvg * 0.9) {
            productivityTrend = 'decreasing';
        }
        else {
            productivityTrend = 'stable';
        }
        // Get top files
        const topFiles = Array.from(fileActivity.entries())
            .map(([file, data]) => ({
            file,
            time: `${Math.round(data.time / 60)} mins`,
            linesChanged: data.linesChanged,
        }))
            .sort((a, b) => b.linesChanged - a.linesChanged)
            .slice(0, 5);
        // Generate highlights
        const highlights = [];
        if (commitCount > 10) {
            highlights.push(`High commit activity: ${commitCount} commits during sprint`);
        }
        if (topFiles.length > 0 && topFiles[0].linesChanged > 100) {
            highlights.push(`Most active file: ${topFiles[0].file} with ${topFiles[0].linesChanged} lines changed`);
        }
        if (productivityTrend === 'increasing') {
            highlights.push('Productivity trend is improving throughout the sprint');
        }
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            totalActivity,
            topFiles,
            commitCount,
            productivityTrend,
            highlights,
        };
    }
    /**
     * Generate project health report
     */
    async generateProjectHealthReport() {
        const metrics = await this.getProductivityInsights(30);
        const trendData = await this.getTrendData(30);
        // Calculate health scores (0-100)
        const codeQuality = Math.min(100, (metrics.totalActiveTime / (8 * 60 * 60 * 30)) * 100);
        const activityLevel = Math.min(100, (metrics.totalActiveTime / (4 * 60 * 60 * 30)) * 100);
        // Consistency: standard deviation of daily activity
        const avgActivity = trendData.reduce((sum, t) => sum + t.activityCount, 0) / trendData.length;
        const variance = trendData.reduce((sum, t) => sum + Math.pow(t.activityCount - avgActivity, 2), 0) / trendData.length;
        const consistency = Math.max(0, 100 - Math.sqrt(variance));
        // Collaboration: based on commit frequency and variety
        const collaboration = Math.min(100, (metrics.activityDistribution.git / Math.max(1, metrics.activityDistribution.file)) * 50);
        const overallScore = (codeQuality + activityLevel + consistency + collaboration) / 4;
        let overallHealth;
        if (overallScore >= 80) {
            overallHealth = 'excellent';
        }
        else if (overallScore >= 60) {
            overallHealth = 'good';
        }
        else if (overallScore >= 40) {
            overallHealth = 'fair';
        }
        else {
            overallHealth = 'needs-attention';
        }
        const recommendations = [];
        if (activityLevel < 50) {
            recommendations.push('Consider increasing daily coding time for better progress');
        }
        if (consistency < 50) {
            recommendations.push('Try to maintain more consistent daily activity patterns');
        }
        if (metrics.mostProductiveHours.length > 0) {
            const peakHours = metrics.mostProductiveHours.join(', ');
            recommendations.push(`Your most productive hours are around ${peakHours}:00 - schedule important work then`);
        }
        return {
            projectName: this.getCurrentProjectName(),
            overallHealth,
            metrics: {
                codeQuality: Math.round(codeQuality),
                activityLevel: Math.round(activityLevel),
                consistency: Math.round(consistency),
                collaboration: Math.round(collaboration),
            },
            recommendations,
        };
    }
    /**
     * Get rolling average of activity
     */
    async getRollingAverage(days = 7, window = 3) {
        const trendData = await this.getTrendData(days);
        if (trendData.length < window) {
            return trendData.map(t => t.activityCount);
        }
        const rollingAverages = [];
        for (let i = 0; i < trendData.length - window + 1; i++) {
            const windowData = trendData.slice(i, i + window);
            const avg = windowData.reduce((sum, t) => sum + t.activityCount, 0) / window;
            rollingAverages.push(avg);
        }
        return rollingAverages;
    }
    /**
     * Export analytics report as CSV
     */
    async exportAnalyticsReport(days = 30) {
        const trendData = await this.getTrendData(days);
        const headers = ['Date', 'Activity Count', 'Lines Changed', 'Commits', 'Time Spent (minutes)'];
        const rows = trendData.map(t => [
            t.date,
            t.activityCount.toString(),
            t.linesChanged.toString(),
            t.commits.toString(),
            Math.round(t.timeSpent / 60).toString(),
        ]);
        const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
        return csv;
    }
    /**
     * Get current project name
     */
    getCurrentProjectName() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        return workspaceFolder ? workspaceFolder.name : 'Current Project';
    }
    /**
     * Get default metrics when no data is available
     */
    getDefaultMetrics() {
        return {
            mostProductiveHours: [9, 10, 11],
            averageSessionLength: 0,
            totalActiveTime: 0,
            peakProductivityDay: new Date().toDateString(),
            activityDistribution: {
                file: 0,
                git: 0,
                terminal: 0,
            },
        };
    }
    /**
     * Get goal tracking status
     */
    async getGoalTracking(goals) {
        const trendData = await this.getTrendData(7); // Last 7 days
        return goals.map(goal => {
            let current = 0;
            if (goal.type === 'hours') {
                current = trendData.reduce((sum, t) => sum + t.timeSpent, 0) / 3600;
            }
            else if (goal.type === 'commits') {
                current = trendData.reduce((sum, t) => sum + t.commits, 0);
            }
            else if (goal.type === 'lines') {
                current = trendData.reduce((sum, t) => sum + t.linesChanged, 0);
            }
            const percentage = Math.min(100, (current / goal.target) * 100);
            return {
                name: goal.name,
                target: goal.target,
                current: Math.round(current * 100) / 100,
                percentage: Math.round(percentage),
                achieved: current >= goal.target,
            };
        });
    }
    /**
     * Get week-over-week comparison
     */
    async getWeekOverWeekComparison() {
        const currentWeekData = await this.getTrendData(7);
        const allTrendData = await this.getTrendData(14);
        const previousWeekData = allTrendData.slice(0, 7);
        const currentWeek = {
            activity: currentWeekData.reduce((sum, t) => sum + t.activityCount, 0),
            commits: currentWeekData.reduce((sum, t) => sum + t.commits, 0),
            linesChanged: currentWeekData.reduce((sum, t) => sum + t.linesChanged, 0),
        };
        const previousWeek = {
            activity: previousWeekData.reduce((sum, t) => sum + t.activityCount, 0),
            commits: previousWeekData.reduce((sum, t) => sum + t.commits, 0),
            linesChanged: previousWeekData.reduce((sum, t) => sum + t.linesChanged, 0),
        };
        const change = {
            activity: this.calculatePercentageChange(previousWeek.activity, currentWeek.activity),
            commits: this.calculatePercentageChange(previousWeek.commits, currentWeek.commits),
            linesChanged: this.calculatePercentageChange(previousWeek.linesChanged, currentWeek.linesChanged),
        };
        return { currentWeek, previousWeek, change };
    }
    /**
     * Calculate percentage change
     */
    calculatePercentageChange(oldValue, newValue) {
        if (oldValue === 0) {
            return newValue > 0 ? 100 : 0;
        }
        return Math.round(((newValue - oldValue) / oldValue) * 100);
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=AnalyticsService.js.map