/**
 * Unified AI Provider Service
 *
 * Central service that manages multiple AI providers and provides
 * a single interface for standup generation regardless of the provider.
 */
import * as vscode from 'vscode';
export type AIProviderType = 'gemini' | 'openai' | 'claude' | 'local';
export interface AIProviderConfig {
    provider: AIProviderType;
    fallbackProvider?: AIProviderType;
    providerSettings?: {
        gemini?: {
            apiKey: string;
        };
        openai?: {
            apiKey: string;
            model?: string;
            temperature?: number;
            maxTokens?: number;
        };
        claude?: {
            apiKey: string;
            model?: string;
            temperature?: number;
            maxTokens?: number;
        };
        local?: {
            baseUrl?: string;
            model?: string;
        };
    };
}
export declare class UnifiedAIService {
    private providers;
    private currentProvider;
    private fallbackProvider;
    private context;
    constructor(context: vscode.ExtensionContext);
    /**
     * Initialize all AI providers
     */
    private initializeProviders;
    /**
     * Load configuration from settings
     */
    private loadConfiguration;
    /**
     * Get current provider
     */
    getCurrentProvider(): AIProviderType;
    /**
     * Set current provider
     */
    setProvider(provider: AIProviderType): Promise<void>;
    /**
     * Generate standup using current provider with fallback
     */
    generateStandup(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string>;
    /**
     * Generate with Gemini
     */
    private generateWithGemini;
    /**
     * Generate with OpenAI
     */
    private generateWithOpenAI;
    /**
     * Generate with Claude
     */
    private generateWithClaude;
    /**
     * Generate with Local LLM
     */
    private generateWithLocal;
    /**
     * Format activities into prompt
     */
    private formatPrompt;
    /**
     * Test connection to current provider
     */
    testCurrentProvider(): Promise<boolean>;
    /**
     * Get available providers
     */
    getAvailableProviders(): AIProviderType[];
    /**
     * Get provider display name
     */
    getProviderDisplayName(provider: AIProviderType): string;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=UnifiedAIService.d.ts.map