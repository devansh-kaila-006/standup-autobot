/**
 * Local LLM Integration Service (Ollama)
 *
 * Provides local LLM integration including:
 * - Standup generation with local models
 * - Activity summarization
 * - Privacy-focused AI processing
 * - Offline capability
 * - Custom model support
 */
import * as vscode from 'vscode';
export interface LocalLLMConfig {
    baseURL: string;
    model: string;
    temperature: number;
    numPredict: number;
}
export interface OllamaMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}
export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}
export declare class LocalLLMService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Local LLM configuration
     */
    private loadConfig;
    /**
     * Generate standup using local LLM
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
     * Summarize activities using local LLM
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
     * Make chat request to Ollama
     */
    private makeChatRequest;
    /**
     * Make request to Ollama API
     */
    private makeOllamaRequest;
    /**
     * List available models
     */
    listModels(): Promise<string[]>;
    /**
     * Pull a model
     */
    pullModel(modelName: string): Promise<boolean>;
    /**
     * Test Ollama connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=LocalLLMService.d.ts.map