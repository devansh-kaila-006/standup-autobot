/**
 * Unified AI Provider Service
 *
 * Central service that manages multiple AI providers and provides
 * a single interface for standup generation regardless of the provider.
 */

import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';
import { StandupGenerator } from './standupGenerator';
import { OpenAIService } from './OpenAIService';
import { ClaudeService } from './ClaudeService';
import { LocalLLMService } from './LocalLLMService';

const logger = new Logger('UnifiedAIService');

export type AIProviderType = 'gemini' | 'openai' | 'claude' | 'local';

export interface AIProviderConfig {
    provider: AIProviderType;
    fallbackProvider?: AIProviderType;
    providerSettings?: {
        gemini?: { apiKey: string };
        openai?: { apiKey: string; model?: string; temperature?: number; maxTokens?: number };
        claude?: { apiKey: string; model?: string; temperature?: number; maxTokens?: number };
        local?: { baseUrl?: string; model?: string };
    };
}

export class UnifiedAIService {
    private providers: Map<AIProviderType, any> = new Map();
    private currentProvider: AIProviderType;
    private fallbackProvider: AIProviderType;
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
        this.currentProvider = 'gemini';
        this.fallbackProvider = 'local';

        this.initializeProviders();
        this.loadConfiguration();
    }

    /**
     * Initialize all AI providers
     */
    private initializeProviders(): void {
        this.providers.set('gemini', new StandupGenerator());
        this.providers.set('openai', new OpenAIService(this.context));
        this.providers.set('claude', new ClaudeService(this.context));
        this.providers.set('local', new LocalLLMService(this.context));
    }

    /**
     * Load configuration from settings
     */
    private async loadConfiguration(): Promise<void> {
        const config = vscode.workspace.getConfiguration('standup');
        const provider = config.get<AIProviderType>('aiProvider', 'gemini');
        const fallback = config.get<AIProviderType>('fallbackProvider', 'local');

        this.currentProvider = provider;
        this.fallbackProvider = fallback;
    }

    /**
     * Get current provider
     */
    public getCurrentProvider(): AIProviderType {
        return this.currentProvider;
    }

    /**
     * Set current provider
     */
    public async setProvider(provider: AIProviderType): Promise<void> {
        if (!this.providers.has(provider)) {
            throw new Error(`Unknown AI provider: ${provider}`);
        }

        this.currentProvider = provider;
    }

    /**
     * Generate standup using current provider with fallback
     */
    public async generateStandup(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        const provider = this.providers.get(this.currentProvider);

        try {
            if (this.currentProvider === 'gemini') {
                return await this.generateWithGemini(activities);
            } else if (this.currentProvider === 'openai') {
                return await this.generateWithOpenAI(activities);
            } else if (this.currentProvider === 'claude') {
                return await this.generateWithClaude(activities);
            } else if (this.currentProvider === 'local') {
                return await this.generateWithLocal(activities);
            } else {
                throw new Error(`Unknown provider: ${this.currentProvider}`);
            }
        } catch (error) {
            logger.error(`Failed to generate standup with ${this.currentProvider}, trying fallback`, error);

            if (this.currentProvider !== this.fallbackProvider) {
                const fallbackProviderService = this.providers.get(this.fallbackProvider);
                if (fallbackProviderService) {
                    try {
                        if (this.fallbackProvider === 'gemini') {
                            return await this.generateWithGemini(activities);
                        } else if (this.fallbackProvider === 'openai') {
                            return await this.generateWithOpenAI(activities);
                        } else if (this.fallbackProvider === 'claude') {
                            return await this.generateWithClaude(activities);
                        } else if (this.fallbackProvider === 'local') {
                            return await this.generateWithLocal(activities);
                        }
                    } catch (fallbackError) {
                        logger.error('Fallback provider also failed', fallbackError);
                    }
                }
            }

            throw error;
        }
    }

    /**
     * Generate with Gemini
     */
    private async generateWithGemini(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        const provider = this.providers.get('gemini');
        const prompt = this.formatPrompt(activities);

        // Use GeminiService's generate method if available, otherwise use API
        const apiKey = await this.context.secrets.get('standup.geminiApiKey');
        if (!apiKey) {
            throw new Error('Gemini API key not set');
        }

        // Call Gemini API
        const response = await provider.generateStandup(activities);
        return response;
    }

    /**
     * Generate with OpenAI
     */
    private async generateWithOpenAI(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        const provider = this.providers.get('openai');
        return await provider.generateStandup(activities);
    }

    /**
     * Generate with Claude
     */
    private async generateWithClaude(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        const provider = this.providers.get('claude');
        return await provider.generateStandup(activities);
    }

    /**
     * Generate with Local LLM
     */
    private async generateWithLocal(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        const provider = this.providers.get('local');
        return await provider.generateStandup(activities);
    }

    /**
     * Format activities into prompt
     */
    private formatPrompt(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): string {
        const sections: string[] = [];

        if (activities.yesterday.length > 0) {
            sections.push('Yesterday:');
            sections.push(...activities.yesterday.map(item => `- ${item}`));
        }

        if (activities.today.length > 0) {
            sections.push('\nToday:');
            sections.push(...activities.today.map(item => `- ${item}`));
        }

        if (activities.blockers.length > 0) {
            sections.push('\nBlockers:');
            sections.push(...activities.blockers.map(blocker => `- ${blocker}`));
        }

        if (activities.goals && activities.goals.length > 0) {
            sections.push('\nGoals:');
            sections.push(...activities.goals.map(goal => `- ${goal}`));
        }

        return sections.join('\n');
    }

    /**
     * Test connection to current provider
     */
    public async testCurrentProvider(): Promise<boolean> {
        const provider = this.providers.get(this.currentProvider);
        if (!provider) return false;

        try {
            if (this.currentProvider === 'gemini') {
                return await provider.testConnection();
            } else if (this.currentProvider === 'openai') {
                return await provider.testConnection();
            } else if (this.currentProvider === 'claude') {
                return await provider.testConnection();
            } else if (this.currentProvider === 'local') {
                return await provider.testConnection();
            }
            return false;
        } catch (error) {
            logger.error(`Failed to test ${this.currentProvider} provider`, error);
            return false;
        }
    }

    /**
     * Get available providers
     */
    public getAvailableProviders(): AIProviderType[] {
        return ['gemini', 'openai', 'claude', 'local'];
    }

    /**
     * Get provider display name
     */
    public getProviderDisplayName(provider: AIProviderType): string {
        const names: Record<AIProviderType, string> = {
            gemini: 'Google Gemini',
            openai: 'OpenAI GPT',
            claude: 'Anthropic Claude',
            local: 'Local LLM (Ollama)',
        };
        return names[provider] || provider;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        for (const provider of this.providers.values()) {
            if (provider.dispose) {
                provider.dispose();
            }
        }
    }
}
