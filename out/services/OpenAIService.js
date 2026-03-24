"use strict";
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
exports.OpenAIService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('OpenAIService');
class OpenAIService {
    constructor(context) {
        this.context = context;
        this.config = null;
        this.loadConfig();
    }
    /**
     * Load OpenAI configuration
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('standup');
        this.config = {
            apiKey: '', // Loaded from secrets
            organization: config.get('openaiOrganization', ''),
            baseURL: config.get('openaiBaseUrl', 'https://api.openai.com/v1'),
            model: config.get('openaiModel', 'gpt-4'),
            temperature: config.get('openaiTemperature', 0.7),
            maxTokens: config.get('openaiMaxTokens', 1000),
        };
        this.loadApiKey();
    }
    /**
     * Load API key from secrets
     */
    async loadApiKey() {
        try {
            const apiKey = await this.context.secrets.get('standup.openaiApiKey') || '';
            if (this.config) {
                this.config.apiKey = apiKey;
            }
        }
        catch (error) {
            logger.error('Failed to load OpenAI API key', error);
        }
    }
    /**
     * Generate standup using OpenAI
     */
    async generateStandup(activities) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }
        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.formatActivitiesPrompt(activities);
        const messages = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];
        const response = await this.makeChatRequest(messages);
        return response.choices[0]?.message?.content || '';
    }
    /**
     * Get system prompt for standup generation
     */
    getSystemPrompt() {
        return `You are a helpful assistant that generates concise, professional daily standup updates.

Your task is to transform raw activity data into a well-structured standup update.

Guidelines:
- Keep items brief and action-oriented
- Focus on completed work and next steps
- Group related items together
- Use clear, professional language
- Highlight blockers prominently
- Be concise but informative

Format the output as:
## Today
[Today's work items]

## Yesterday
[Completed work items]

## Blockers
[Any blockers or impediments]

## Goals
[Current goals and priorities]`;
    }
    /**
     * Format activities into prompt
     */
    formatActivitiesPrompt(activities) {
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
     * Summarize activities using OpenAI
     */
    async summarizeActivities(activities) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }
        const messages = [
            {
                role: 'system',
                content: 'You are a helpful assistant that summarizes development activities concisely.',
            },
            {
                role: 'user',
                content: `Summarize these activities:\n${activities.join('\n')}`,
            },
        ];
        const response = await this.makeChatRequest(messages);
        return response.choices[0]?.message?.content || '';
    }
    /**
     * Generate productivity insights
     */
    async generateProductivityInsights(data) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }
        const prompt = this.formatProductivityPrompt(data);
        const messages = [
            {
                role: 'system',
                content: `You are a productivity analyst that analyzes development work patterns and provides actionable insights.

Provide insights in the following format:
SUMMARY: [Overall summary of productivity]
RECOMMENDATIONS: [List of specific recommendations]
PATTERNS: [Observed work patterns]`,
            },
            {
                role: 'user',
                content: prompt,
            },
        ];
        const response = await this.makeChatRequest(messages);
        const content = response.choices[0]?.message?.content || '';
        return this.parseProductivityResponse(content);
    }
    /**
     * Format productivity data for analysis
     */
    formatProductivityPrompt(data) {
        const sections = [];
        sections.push(`Time Range: ${data.timeRange}`);
        sections.push(`Total Activities: ${data.activities.length}`);
        sections.push('\nActivity Distribution:');
        const typeCounts = {};
        for (const activity of data.activities) {
            typeCounts[activity.type] = (typeCounts[activity.type] || 0) + 1;
        }
        for (const [type, count] of Object.entries(typeCounts)) {
            sections.push(`- ${type}: ${count}`);
        }
        sections.push('\nActivity by Hour:');
        for (const hour of data.workHours) {
            sections.push(`- ${hour.hour}:00 - ${hour.activityCount} activities`);
        }
        sections.push('\nRecent Activities:');
        for (const activity of data.activities.slice(-10)) {
            sections.push(`- [${activity.type}] ${activity.description}`);
        }
        return sections.join('\n');
    }
    /**
     * Parse productivity response
     */
    parseProductivityResponse(content) {
        const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=RECOMMENDATIONS:|PATTERNS:|$)/i);
        const recommendationsMatch = content.match(/RECOMMENDATIONS:\s*([\s\S]*?)(?=PATTERNS:|SUMMARY:|$)/i);
        const patternsMatch = content.match(/PATTERNS:\s*([\s\S]*?)(?=SUMMARY:|RECOMMENDATIONS:|$)/i);
        const summary = summaryMatch?.[1]?.trim() || '';
        const recommendationsText = recommendationsMatch?.[1]?.trim() || '';
        const patternsText = patternsMatch?.[1]?.trim() || '';
        const recommendations = recommendationsText
            .split('\n')
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(line => line.length > 0);
        const patterns = patternsText
            .split('\n')
            .map(line => line.replace(/^[-*•]\s*/, '').trim())
            .filter(line => line.length > 0);
        return { summary, recommendations, patterns };
    }
    /**
     * Detect burnout risk
     */
    async detectBurnoutRisk(data) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }
        const prompt = `
Analyze burnout risk based on:
- Weekly hours: ${data.weeklyHours.join(', ')} hours
- Activity trend: ${data.activityTrend}
- Overtime frequency: ${data.overtimeFrequency} days/week
- Weekend work: ${data.weekendWork} days/week

Provide:
1. Risk level (low/medium/high)
2. Risk indicators observed
3. Suggestions to prevent burnout
`;
        const messages = [
            {
                role: 'system',
                content: 'You are a workplace wellbeing analyst. Assess burnout risk and provide actionable suggestions.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ];
        const response = await this.makeChatRequest(messages);
        const content = response.choices[0]?.message?.content || '';
        return this.parseBurnoutResponse(content);
    }
    /**
     * Parse burnout response
     */
    parseBurnoutResponse(content) {
        const riskMatch = content.match(/risk level:\s*(low|medium|high)/i);
        const riskLevel = (riskMatch?.[1]?.toLowerCase() || 'medium');
        const indicators = [];
        const suggestions = [];
        const lines = content.split('\n');
        let currentSection = null;
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('indicator')) {
                currentSection = 'indicators';
            }
            else if (lowerLine.includes('suggestion')) {
                currentSection = 'suggestions';
            }
            else if (line.match(/^[-*•]\s*/) || line.match(/^\d+\.\s*/)) {
                const text = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
                if (text && currentSection) {
                    if (currentSection === 'indicators') {
                        indicators.push(text);
                    }
                    else if (currentSection === 'suggestions') {
                        suggestions.push(text);
                    }
                }
            }
        }
        return { riskLevel, indicators, suggestions };
    }
    /**
     * Make chat request to OpenAI
     */
    async makeChatRequest(messages) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured');
        }
        const url = `${this.config.baseURL}/chat/completions`;
        const requestData = {
            model: this.config.model,
            messages,
            temperature: this.config.temperature,
            max_tokens: this.config.maxTokens,
        };
        return await this.makeOpenAIRequest(url, 'POST', requestData);
    }
    /**
     * Make authenticated request to OpenAI API
     */
    async makeOpenAIRequest(url, method, data) {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured');
        }
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const headers = {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json',
            };
            if (this.config.organization) {
                headers['OpenAI-Organization'] = this.config.organization;
            }
            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers,
            };
            const req = https.request(options, (res) => {
                let responseData = '';
                res.on('data', (chunk) => {
                    responseData += chunk;
                });
                res.on('end', () => {
                    if (res.statusCode === 200 || res.statusCode === 201) {
                        try {
                            resolve(JSON.parse(responseData));
                        }
                        catch {
                            resolve(responseData);
                        }
                    }
                    else {
                        reject(new Error(`OpenAI API error (${res.statusCode}): ${responseData}`));
                    }
                });
            });
            req.on('error', reject);
            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }
    /**
     * Test OpenAI connection
     */
    async testConnection() {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }
        try {
            const messages = [
                { role: 'user', content: 'Hello' },
            ];
            await this.makeChatRequest(messages);
            return true;
        }
        catch (error) {
            logger.error('OpenAI connection test failed', error);
            return false;
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.OpenAIService = OpenAIService;
//# sourceMappingURL=OpenAIService.js.map