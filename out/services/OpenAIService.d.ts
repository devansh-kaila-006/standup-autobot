/**
 * OpenAI GPT Integration Service
 *
 * Provides OpenAI GPT integration including:
 * - Standup generation with GPT models
 * - Activity summarization
 * - Productivity insights
 * - Custom prompt support
 * - Stream and non-stream responses
 */
import * as vscode from 'vscode';
export interface OpenAIConfig {
    apiKey: string;
    organization?: string;
    baseURL: string;
    model: string;
    temperature: number;
    maxTokens: number;
}
export interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}
export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}
export interface OpenAIStreamChunk {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        delta: {
            role?: string;
            content?: string;
        };
        finish_reason: string | null;
    }[];
}
export declare class OpenAIService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load OpenAI configuration
     */
    private loadConfig;
    /**
     * Load API key from secrets
     */
    private loadApiKey;
    /**
     * Generate standup using OpenAI
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
     * Summarize activities using OpenAI
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
     * Make chat request to OpenAI
     */
    private makeChatRequest;
    /**
     * Make authenticated request to OpenAI API
     */
    private makeOpenAIRequest;
    /**
     * Test OpenAI connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=OpenAIService.d.ts.map