/**
 * Anthropic Claude Integration Service
 *
 * Provides Claude AI integration including:
 * - Standup generation with Claude models
 * - Activity summarization
 * - Productivity insights
 * - Custom prompt support
 * - Stream and non-stream responses
 */
import * as vscode from 'vscode';
export interface ClaudeConfig {
    apiKey: string;
    baseURL: string;
    model: string;
    temperature: number;
    maxTokens: number;
}
export interface ClaudeMessage {
    role: 'user' | 'assistant';
    content: string;
}
export interface ClaudeResponse {
    id: string;
    type: string;
    role: string;
    content: Array<{
        type: string;
        text: string;
    }>;
    stop_reason: string;
    model: string;
    usage: {
        input_tokens: number;
        output_tokens: number;
    };
}
export declare class ClaudeService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Claude configuration
     */
    private loadConfig;
    /**
     * Load API key from secrets
     */
    private loadApiKey;
    /**
     * Generate standup using Claude
     */
    generateStandup(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string>;
    /**
     * Get system prompt for standup generation
     */
    private getSystemPrompt;
    /**
     * Format activities into prompt
     */
    private formatActivitiesPrompt;
    /**
     * Summarize activities using Claude
     */
    summarizeActivities(activities: string[]): Promise<string>;
    /**
     * Generate productivity insights
     */
    generateProductivityInsights(data: {
        activities: Array<{
            type: string;
            description: string;
            timestamp: number;
        }>;
        timeRange: string;
        workHours: {
            hour: number;
            activityCount: number;
        }[];
    }): Promise<{
        summary: string;
        recommendations: string[];
        patterns: string[];
    }>;
    /**
     * Format productivity data for analysis
     */
    private formatProductivityPrompt;
    /**
     * Parse productivity response
     */
    private parseProductivityResponse;
    /**
     * Detect burnout risk
     */
    detectBurnoutRisk(data: {
        weeklyHours: number[];
        activityTrend: 'increasing' | 'stable' | 'decreasing';
        overtimeFrequency: number;
        weekendWork: number;
    }): Promise<{
        riskLevel: 'low' | 'medium' | 'high';
        indicators: string[];
        suggestions: string[];
    }>;
    /**
     * Parse burnout response
     */
    private parseBurnoutResponse;
    /**
     * Make message request to Claude
     */
    private makeMessageRequest;
    /**
     * Extract text from Claude response
     */
    private extractTextFromResponse;
    /**
     * Make authenticated request to Claude API
     */
    private makeClaudeRequest;
    /**
     * Test Claude connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=ClaudeService.d.ts.map