"use strict";
/**
 * Unified AI Provider Service
 *
 * Central service that manages multiple AI providers and provides
 * a single interface for standup generation regardless of the provider.
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
exports.UnifiedAIService = void 0;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../utils/Logger");
const standupGenerator_1 = require("./standupGenerator");
const OpenAIService_1 = require("./OpenAIService");
const ClaudeService_1 = require("./ClaudeService");
const LocalLLMService_1 = require("./LocalLLMService");
const logger = new Logger_1.Logger('UnifiedAIService');
class UnifiedAIService {
    constructor(context) {
        this.providers = new Map();
        this.context = context;
        this.currentProvider = 'gemini';
        this.fallbackProvider = 'local';
        this.initializeProviders();
        this.loadConfiguration();
    }
    /**
     * Initialize all AI providers
     */
    initializeProviders() {
        this.providers.set('gemini', new standupGenerator_1.StandupGenerator());
        this.providers.set('openai', new OpenAIService_1.OpenAIService(this.context));
        this.providers.set('claude', new ClaudeService_1.ClaudeService(this.context));
        this.providers.set('local', new LocalLLMService_1.LocalLLMService(this.context));
    }
    /**
     * Load configuration from settings
     */
    async loadConfiguration() {
        const config = vscode.workspace.getConfiguration('standup');
        const provider = config.get('aiProvider', 'gemini');
        const fallback = config.get('fallbackProvider', 'local');
        this.currentProvider = provider;
        this.fallbackProvider = fallback;
    }
    /**
     * Get current provider
     */
    getCurrentProvider() {
        return this.currentProvider;
    }
    /**
     * Set current provider
     */
    async setProvider(provider) {
        if (!this.providers.has(provider)) {
            throw new Error(`Unknown AI provider: ${provider}`);
        }
        this.currentProvider = provider;
    }
    /**
     * Generate standup using current provider with fallback
     */
    async generateStandup(activities) {
        const provider = this.providers.get(this.currentProvider);
        try {
            if (this.currentProvider === 'gemini') {
                return await this.generateWithGemini(activities);
            }
            else if (this.currentProvider === 'openai') {
                return await this.generateWithOpenAI(activities);
            }
            else if (this.currentProvider === 'claude') {
                return await this.generateWithClaude(activities);
            }
            else if (this.currentProvider === 'local') {
                return await this.generateWithLocal(activities);
            }
            else {
                throw new Error(`Unknown provider: ${this.currentProvider}`);
            }
        }
        catch (error) {
            logger.error(`Failed to generate standup with ${this.currentProvider}, trying fallback`, error);
            if (this.currentProvider !== this.fallbackProvider) {
                const fallbackProviderService = this.providers.get(this.fallbackProvider);
                if (fallbackProviderService) {
                    try {
                        if (this.fallbackProvider === 'gemini') {
                            return await this.generateWithGemini(activities);
                        }
                        else if (this.fallbackProvider === 'openai') {
                            return await this.generateWithOpenAI(activities);
                        }
                        else if (this.fallbackProvider === 'claude') {
                            return await this.generateWithClaude(activities);
                        }
                        else if (this.fallbackProvider === 'local') {
                            return await this.generateWithLocal(activities);
                        }
                    }
                    catch (fallbackError) {
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
    async generateWithGemini(activities) {
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
    async generateWithOpenAI(activities) {
        const provider = this.providers.get('openai');
        return await provider.generateStandup(activities);
    }
    /**
     * Generate with Claude
     */
    async generateWithClaude(activities) {
        const provider = this.providers.get('claude');
        return await provider.generateStandup(activities);
    }
    /**
     * Generate with Local LLM
     */
    async generateWithLocal(activities) {
        const provider = this.providers.get('local');
        return await provider.generateStandup(activities);
    }
    /**
     * Format activities into prompt
     */
    formatPrompt(activities) {
        const sections = [];
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
    async testCurrentProvider() {
        const provider = this.providers.get(this.currentProvider);
        if (!provider)
            return false;
        try {
            if (this.currentProvider === 'gemini') {
                return await provider.testConnection();
            }
            else if (this.currentProvider === 'openai') {
                return await provider.testConnection();
            }
            else if (this.currentProvider === 'claude') {
                return await provider.testConnection();
            }
            else if (this.currentProvider === 'local') {
                return await provider.testConnection();
            }
            return false;
        }
        catch (error) {
            logger.error(`Failed to test ${this.currentProvider} provider`, error);
            return false;
        }
    }
    /**
     * Get available providers
     */
    getAvailableProviders() {
        return ['gemini', 'openai', 'claude', 'local'];
    }
    /**
     * Get provider display name
     */
    getProviderDisplayName(provider) {
        const names = {
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
    dispose() {
        for (const provider of this.providers.values()) {
            if (provider.dispose) {
                provider.dispose();
            }
        }
    }
}
exports.UnifiedAIService = UnifiedAIService;
//# sourceMappingURL=UnifiedAIService.js.map