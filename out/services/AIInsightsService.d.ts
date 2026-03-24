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
export declare class AIInsightsService {
    private context;
    private openAIService;
    private claudeService;
    private localLLMService;
    private config;
    private lastInsight;
    private lastBurnoutAnalysis;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load AI insights configuration
     */
    private loadConfig;
    /**
     * Generate productivity insights
     */
    generateProductivityInsights(activities: {
        today: Array<{
            type: string;
            description: string;
            timestamp: number;
        }>;
        yesterday: Array<{
            type: string;
            description: string;
            timestamp: number;
        }>;
        week: Array<{
            type: string;
            description: string;
            timestamp: number;
        }>;
    }): Promise<ProductivityInsight>;
    /**
     * Detect burnout risk
     */
    detectBurnoutRisk(activities: {
        week: Array<{
            type: string;
            description: string;
            timestamp: number;
        }>;
        weeklyHours: number[];
    }): Promise<BurnoutAnalysis>;
    /**
     * Analyze work patterns
     */
    analyzeWorkPatterns(activities: Array<{
        type: string;
        description: string;
        timestamp: number;
    }>): Promise<WorkPattern[]>;
    /**
     * Get smart suggestions based on context
     */
    getSmartSuggestions(context: {
        currentActivities: string[];
        recentBlockers: string[];
        timeOfDay: 'morning' | 'afternoon' | 'evening';
        dayOfWeek: string;
    }): Promise<string[]>;
    /**
     * Execute analysis with specific provider
     */
    private executeWithProvider;
    /**
     * Calculate work hours distribution
     */
    private calculateWorkHours;
    /**
     * Calculate activity trend
     */
    private calculateActivityTrend;
    /**
     * Calculate overtime frequency
     */
    private calculateOvertimeFrequency;
    /**
     * Calculate weekend work frequency
     */
    private calculateWeekendWork;
    /**
     * Calculate productivity score
     */
    private calculateProductivityScore;
    /**
     * Get fallback insight when AI fails
     */
    private getFallbackInsight;
    /**
     * Get fallback burnout analysis
     */
    private getFallbackBurnoutAnalysis;
    /**
     * Get last generated insight
     */
    getLastInsight(): ProductivityInsight | null;
    /**
     * Get last burnout analysis
     */
    getLastBurnoutAnalysis(): BurnoutAnalysis | null;
    /**
     * Test AI provider connections
     */
    testConnections(): Promise<{
        provider: string;
        connected: boolean;
    }[]>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=AIInsightsService.d.ts.map