/**
 * AI Insights Service
 *
 * Provides AI-powered insights including:
 * - Productivity recommendations
 * - Work pattern analysis
 * - Burnout detection
 * - Activity categorization
 * - Smart suggestions
 * - Multi-provider support
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { OpenAIService } from './OpenAIService';
import { ClaudeService } from './ClaudeService';
import { LocalLLMService } from './LocalLLMService';

const logger = new Logger('AIInsightsService');

export type AIProvider = 'openai' | 'claude' | 'local' | 'gemini';

export interface ProductivityInsight {
    summary: string;
    recommendations: string[];
    patterns: string[];
    score: number;
    timestamp: number;
}

export interface BurnoutAnalysis {
    riskLevel: 'low' | 'medium' | 'high';
    indicators: string[];
    suggestions: string[];
    timestamp: number;
}

export interface WorkPattern {
    type: string;
    description: string;
    frequency: number;
    confidence: number;
}

export interface AIInsightConfig {
    provider: AIProvider;
    fallbackProvider?: AIProvider;
    refreshInterval: number;
}

export class AIInsightsService {
    private openAIService: OpenAIService;
    private claudeService: ClaudeService;
    private localLLMService: LocalLLMService;
    private config: AIInsightConfig;
    private lastInsight: ProductivityInsight | null = null;
    private lastBurnoutAnalysis: BurnoutAnalysis | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.openAIService = new OpenAIService(context);
        this.claudeService = new ClaudeService(context);
        this.localLLMService = new LocalLLMService(context);

        this.config = this.loadConfig();
    }

    /**
     * Load AI insights configuration
     */
    private loadConfig(): AIInsightConfig {
        const config = vscode.workspace.getConfiguration('standup');

        return {
            provider: config.get<AIProvider>('aiInsightsProvider', 'gemini'),
            fallbackProvider: config.get<AIProvider>('aiInsightsFallbackProvider', 'local'),
            refreshInterval: config.get<number>('aiInsightsRefreshInterval', 3600000), // 1 hour
        };
    }

    /**
     * Generate productivity insights
     */
    public async generateProductivityInsights(activities: {
        today: Array<{ type: string; description: string; timestamp: number }>;
        yesterday: Array<{ type: string; description: string; timestamp: number }>;
        week: Array<{ type: string; description: string; timestamp: number }>;
    }): Promise<ProductivityInsight> {
        const timeRange = 'last 7 days';
        const workHours = this.calculateWorkHours(activities.week);

        const data = {
            activities: activities.week,
            timeRange,
            workHours,
        };

        try {
            let result;

            // Try primary provider
            try {
                result = await this.executeWithProvider(this.config.provider, 'productivity', data);
            } catch (error) {
                logger.warn(`Primary AI provider ${this.config.provider} failed, trying fallback`, error);

                // Try fallback provider
                if (this.config.fallbackProvider) {
                    result = await this.executeWithProvider(this.config.fallbackProvider, 'productivity', data);
                } else {
                    throw error;
                }
            }

            const insight: ProductivityInsight = {
                summary: result.summary,
                recommendations: result.recommendations,
                patterns: result.patterns,
                score: this.calculateProductivityScore(data),
                timestamp: Date.now(),
            };

            this.lastInsight = insight;
            return insight;
        } catch (error) {
            logger.error('Failed to generate productivity insights', error);

            // Return fallback insight
            return this.getFallbackInsight(data);
        }
    }

    /**
     * Detect burnout risk
     */
    public async detectBurnoutRisk(activities: {
        week: Array<{ type: string; description: string; timestamp: number }>;
        weeklyHours: number[];
    }): Promise<BurnoutAnalysis> {
        const data = {
            weeklyHours: activities.weeklyHours,
            activityTrend: this.calculateActivityTrend(activities.week),
            overtimeFrequency: this.calculateOvertimeFrequency(activities.weeklyHours),
            weekendWork: this.calculateWeekendWork(activities.week),
        };

        try {
            let result;

            // Try primary provider
            try {
                result = await this.executeWithProvider(this.config.provider, 'burnout', data);
            } catch (error) {
                logger.warn(`Primary AI provider ${this.config.provider} failed for burnout detection, trying fallback`, error);

                // Try fallback provider
                if (this.config.fallbackProvider) {
                    result = await this.executeWithProvider(this.config.fallbackProvider, 'burnout', data);
                } else {
                    throw error;
                }
            }

            const analysis: BurnoutAnalysis = {
                riskLevel: result.riskLevel,
                indicators: result.indicators,
                suggestions: result.suggestions,
                timestamp: Date.now(),
            };

            this.lastBurnoutAnalysis = analysis;
            return analysis;
        } catch (error) {
            logger.error('Failed to detect burnout risk', error);

            // Return fallback analysis
            return this.getFallbackBurnoutAnalysis(data);
        }
    }

    /**
     * Analyze work patterns
     */
    public async analyzeWorkPatterns(activities: Array<{
        type: string;
        description: string;
        timestamp: number;
    }>): Promise<WorkPattern[]> {
        const patterns: WorkPattern[] = [];

        // Analyze activity patterns
        const typeFrequency: Record<string, number> = {};
        for (const activity of activities) {
            typeFrequency[activity.type] = (typeFrequency[activity.type] || 0) + 1;
        }

        for (const [type, count] of Object.entries(typeFrequency)) {
            const frequency = count / activities.length;
            patterns.push({
                type,
                description: `${type} activities occur ${Math.round(frequency * 100)}% of the time`,
                frequency: Math.round(frequency * 100),
                confidence: Math.min(frequency * 2, 1), // Simple confidence calculation
            });
        }

        // Analyze time patterns
        const hourlyActivity = this.calculateWorkHours(activities);
        const peakHours = hourlyActivity
            .filter(h => h.activityCount > Math.max(...hourlyActivity.map(h => h.activityCount)) * 0.5)
            .map(h => h.hour);

        if (peakHours.length > 0) {
            patterns.push({
                type: 'time',
                description: `Peak activity hours: ${peakHours.map(h => `${h}:00`).join(', ')}`,
                frequency: peakHours.length * 10,
                confidence: 0.8,
            });
        }

        return patterns.sort((a, b) => b.frequency - a.frequency);
    }

    /**
     * Get smart suggestions based on context
     */
    public async getSmartSuggestions(context: {
        currentActivities: string[];
        recentBlockers: string[];
        timeOfDay: 'morning' | 'afternoon' | 'evening';
        dayOfWeek: string;
    }): Promise<string[]> {
        const suggestions: string[] = [];

        // Time-based suggestions
        if (context.timeOfDay === 'morning') {
            suggestions.push('Plan your top 3 priorities for the day');
            suggestions.push('Review blockers from yesterday and address them first');
        } else if (context.timeOfDay === 'afternoon') {
            suggestions.push('Take a short break if you\'ve been working continuously');
            suggestions.push('Review progress on today\'s tasks');
        } else if (context.timeOfDay === 'evening') {
            suggestions.push('Document progress made today');
            suggestions.push('Prepare task list for tomorrow');
        }

        // Day-based suggestions
        if (context.dayOfWeek === 'Monday') {
            suggestions.push('Review weekly goals and set priorities');
        } else if (context.dayOfWeek === 'Friday') {
            suggestions.push('Complete weekly status updates');
            suggestions.push('Plan for next week');
        }

        // Blocker-based suggestions
        if (context.recentBlockers.length > 0) {
            suggestions.push(`Address ${context.recentBlockers.length} pending blocker(s)`);
            suggestions.push('Escalate blockers if they\'re blocking progress');
        }

        // Activity-based suggestions
        if (context.currentActivities.length === 0) {
            suggestions.push('Consider breaking down large tasks into smaller ones');
            suggestions.push('Review project backlog for next priorities');
        } else if (context.currentActivities.length > 5) {
            suggestions.push('Focus on completing current tasks before starting new ones');
        }

        return suggestions;
    }

    /**
     * Execute analysis with specific provider
     */
    private async executeWithProvider(
        provider: AIProvider,
        analysisType: 'productivity' | 'burnout',
        data: any
    ): Promise<any> {
        switch (provider) {
            case 'openai':
                if (analysisType === 'productivity') {
                    return await this.openAIService.generateProductivityInsights(data);
                } else {
                    return await this.openAIService.detectBurnoutRisk(data);
                }

            case 'claude':
                if (analysisType === 'productivity') {
                    return await this.claudeService.generateProductivityInsights(data);
                } else {
                    return await this.claudeService.detectBurnoutRisk(data);
                }

            case 'local':
                if (analysisType === 'productivity') {
                    return await this.localLLMService.generateProductivityInsights(data);
                } else {
                    return await this.localLLMService.detectBurnoutRisk(data);
                }

            case 'gemini':
                throw new Error('Gemini provider should be handled by StandupGenerator service');

            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }
    }

    /**
     * Calculate work hours distribution
     */
    private calculateWorkHours(activities: Array<{ timestamp: number }>): Array<{ hour: number; activityCount: number }> {
        const hourlyCounts: Record<number, number> = {};

        for (const activity of activities) {
            const hour = new Date(activity.timestamp).getHours();
            hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1;
        }

        return Object.entries(hourlyCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour, 10), activityCount: count }))
            .sort((a, b) => a.hour - b.hour);
    }

    /**
     * Calculate activity trend
     */
    private calculateActivityTrend(activities: Array<{ timestamp: number }>): 'increasing' | 'stable' | 'decreasing' {
        if (activities.length < 3) {
            return 'stable';
        }

        // Split into two halves and compare
        const mid = Math.floor(activities.length / 2);
        const firstHalf = activities.slice(0, mid);
        const secondHalf = activities.slice(mid);

        const firstHalfDuration = firstHalf[firstHalf.length - 1].timestamp - firstHalf[0].timestamp;
        const secondHalfDuration = secondHalf[secondHalf.length - 1].timestamp - secondHalf[0].timestamp;

        const firstHalfRate = firstHalf.length / (firstHalfDuration || 1);
        const secondHalfRate = secondHalf.length / (secondHalfDuration || 1);

        if (secondHalfRate > firstHalfRate * 1.2) {
            return 'increasing';
        } else if (secondHalfRate < firstHalfRate * 0.8) {
            return 'decreasing';
        } else {
            return 'stable';
        }
    }

    /**
     * Calculate overtime frequency
     */
    private calculateOvertimeFrequency(weeklyHours: number[]): number {
        const standardHours = 40;
        const overtimeWeeks = weeklyHours.filter(hours => hours > standardHours).length;
        return Math.round((overtimeWeeks / weeklyHours.length) * 7); // Days per week
    }

    /**
     * Calculate weekend work frequency
     */
    private calculateWeekendWork(activities: Array<{ timestamp: number }>): number {
        const weekendActivities = activities.filter(a => {
            const day = new Date(a.timestamp).getDay();
            return day === 0 || day === 6; // Sunday or Saturday
        });

        // Estimate unique weekend days worked
        const weekendDays = new Set(
            weekendActivities.map(a => new Date(a.timestamp).toDateString())
        );

        return weekendDays.size;
    }

    /**
     * Calculate productivity score
     */
    private calculateProductivityScore(data: any): number {
        // Simple scoring based on activity count and distribution
        const activityCount = data.activities.length;
        const workHours = data.workHours;

        // Base score from activity count (assuming 50+ activities is good)
        let score = Math.min(activityCount / 50, 1) * 50;

        // Bonus for good distribution across hours
        const activeHours = workHours.filter((h: any) => h.activityCount > 0).length;
        score += Math.min(activeHours / 8, 1) * 30;

        // Bonus for consistency (not too concentrated)
        const maxActivity = Math.max(...workHours.map((h: any) => h.activityCount));
        const avgActivity = activityCount / activeHours;
        const consistency = 1 - (maxActivity - avgActivity) / maxActivity;
        score += consistency * 20;

        return Math.round(score);
    }

    /**
     * Get fallback insight when AI fails
     */
    private getFallbackInsight(data: any): ProductivityInsight {
        return {
            summary: `Based on ${data.activities.length} activities in the ${data.timeRange}`,
            recommendations: [
                'Maintain consistent work hours',
                'Take regular breaks to stay productive',
                'Focus on completing high-priority tasks',
            ],
            patterns: [
                'Regular work activity detected',
                'Good task distribution observed',
            ],
            score: this.calculateProductivityScore(data),
            timestamp: Date.now(),
        };
    }

    /**
     * Get fallback burnout analysis
     */
    private getFallbackBurnoutAnalysis(data: any): BurnoutAnalysis {
        const avgHours = data.weeklyHours.reduce((a: number, b: number) => a + b, 0) / data.weeklyHours.length;

        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        const indicators: string[] = [];
        const suggestions: string[] = [];

        if (avgHours > 50) {
            riskLevel = 'high';
            indicators.push('Average weekly hours exceed 50');
            suggestions.push('Reduce working hours to sustainable levels');
            suggestions.push('Take regular time off');
        } else if (avgHours > 45) {
            riskLevel = 'medium';
            indicators.push('Average weekly hours elevated');
            suggestions.push('Monitor work-life balance');
        }

        if (data.weekendWork > 1) {
            indicators.push(`Working on weekends (${data.weekendWork} days)`);
            suggestions.push('Avoid weekend work when possible');
        }

        if (data.overtimeFrequency > 2) {
            indicators.push('Frequent overtime detected');
            suggestions.push('Review workload and priorities');
        }

        if (indicators.length === 0) {
            indicators.push('No significant burnout indicators detected');
        }

        return {
            riskLevel,
            indicators,
            suggestions,
            timestamp: Date.now(),
        };
    }

    /**
     * Get last generated insight
     */
    public getLastInsight(): ProductivityInsight | null {
        return this.lastInsight;
    }

    /**
     * Get last burnout analysis
     */
    public getLastBurnoutAnalysis(): BurnoutAnalysis | null {
        return this.lastBurnoutAnalysis;
    }

    /**
     * Test AI provider connections
     */
    public async testConnections(): Promise<{ provider: string; connected: boolean }[]> {
        const results: { provider: string; connected: boolean }[] = [];

        try {
            await this.openAIService.testConnection();
            results.push({ provider: 'openai', connected: true });
        } catch {
            results.push({ provider: 'openai', connected: false });
        }

        try {
            await this.claudeService.testConnection();
            results.push({ provider: 'claude', connected: true });
        } catch {
            results.push({ provider: 'claude', connected: false });
        }

        try {
            await this.localLLMService.testConnection();
            results.push({ provider: 'local', connected: true });
        } catch {
            results.push({ provider: 'local', connected: false });
        }

        return results;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        this.openAIService.dispose();
        this.claudeService.dispose();
        this.localLLMService.dispose();
    }
}
