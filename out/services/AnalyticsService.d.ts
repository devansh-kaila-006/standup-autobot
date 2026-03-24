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
import * as vscode from 'vscode';
export interface ActivityData {
    timestamp: number;
    type: 'file' | 'git' | 'terminal';
    details: any;
}
export interface ProductivityMetrics {
    mostProductiveHours: number[];
    averageSessionLength: number;
    totalActiveTime: number;
    peakProductivityDay: string;
    activityDistribution: {
        file: number;
        git: number;
        terminal: number;
    };
}
export interface TrendData {
    date: string;
    activityCount: number;
    linesChanged: number;
    commits: number;
    timeSpent: number;
}
export interface SprintSummary {
    startDate: string;
    endDate: string;
    totalActivity: number;
    topFiles: Array<{
        file: string;
        time: string;
        linesChanged: number;
    }>;
    commitCount: number;
    productivityTrend: 'increasing' | 'decreasing' | 'stable';
    highlights: string[];
}
export interface ProjectHealthReport {
    projectName: string;
    overallHealth: 'excellent' | 'good' | 'fair' | 'needs-attention';
    metrics: {
        codeQuality: number;
        activityLevel: number;
        consistency: number;
        collaboration: number;
    };
    recommendations: string[];
}
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
export declare class AnalyticsService {
    private context;
    /**
     * Creates a new AnalyticsService instance.
     *
     * @param context - VS Code extension context for accessing global state
     * @public
     * @constructor
     */
    constructor(context: vscode.ExtensionContext);
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
    getProductivityInsights(days?: number): Promise<ProductivityMetrics>;
    /**
     * Get trend data for visualization
     */
    getTrendData(days?: number): Promise<TrendData[]>;
    /**
     * Generate sprint summary
     */
    generateSprintSummary(sprintLength?: number): Promise<SprintSummary>;
    /**
     * Generate project health report
     */
    generateProjectHealthReport(): Promise<ProjectHealthReport>;
    /**
     * Get rolling average of activity
     */
    getRollingAverage(days?: number, window?: number): Promise<number[]>;
    /**
     * Export analytics report as CSV
     */
    exportAnalyticsReport(days?: number): Promise<string>;
    /**
     * Get current project name
     */
    private getCurrentProjectName;
    /**
     * Get default metrics when no data is available
     */
    private getDefaultMetrics;
    /**
     * Get goal tracking status
     */
    getGoalTracking(goals: {
        name: string;
        target: number;
        type: 'hours' | 'commits' | 'lines';
    }[]): Promise<Array<{
        name: string;
        target: number;
        current: number;
        percentage: number;
        achieved: boolean;
    }>>;
    /**
     * Get week-over-week comparison
     */
    getWeekOverWeekComparison(): Promise<{
        currentWeek: {
            activity: number;
            commits: number;
            linesChanged: number;
        };
        previousWeek: {
            activity: number;
            commits: number;
            linesChanged: number;
        };
        change: {
            activity: number;
            commits: number;
            linesChanged: number;
        };
    }>;
    /**
     * Calculate percentage change
     */
    private calculatePercentageChange;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=AnalyticsService.d.ts.map