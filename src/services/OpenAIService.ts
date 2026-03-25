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
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('OpenAIService');

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

export class OpenAIService {
    private config: OpenAIConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load OpenAI configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            apiKey: '', // Loaded from secrets
            organization: config.get<string>('openaiOrganization', ''),
            baseURL: config.get<string>('openaiBaseUrl', 'https://api.openai.com/v1'),
            model: config.get<string>('openaiModel', 'gpt-4'),
            temperature: config.get<number>('openaiTemperature', 0.7),
            maxTokens: config.get<number>('openaiMaxTokens', 1000),
        };

        this.loadApiKey();
    }

    /**
     * Load API key from secrets
     */
    private async loadApiKey(): Promise<void> {
        try {
            const apiKey = await this.context.secrets.get('standup.openaiApiKey') || '';
            if (this.config) {
                this.config.apiKey = apiKey;
            }
        } catch (error) {
            logger.error('Failed to load OpenAI API key', error);
        }
    }

    /**
     * Generate standup using OpenAI
     */
    public async generateStandup(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.formatActivitiesPrompt(activities);

        const messages: OpenAIMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ];

        const response = await this.makeChatRequest(messages);

        return response.choices[0]?.message?.content || '';
    }

    /**
     * Get system prompt for standup generation
     */
    private getSystemPrompt(): string {
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
    private formatActivitiesPrompt(activities: {
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
     * Summarize activities using OpenAI
     */
    public async summarizeActivities(activities: string[]): Promise<string> {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }

        const messages: OpenAIMessage[] = [
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
    public async generateProductivityInsights(data: {
        activities: Array<{ type: string; description: string; timestamp: number }>;
        timeRange: string;
        workHours: { hour: number; activityCount: number }[];
    }): Promise<{
        summary: string;
        recommendations: string[];
        patterns: string[];
    }> {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }

        const prompt = this.formatProductivityPrompt(data);

        const messages: OpenAIMessage[] = [
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
    private formatProductivityPrompt(data: {
        activities: Array<{ type: string; description: string; timestamp: number }>;
        timeRange: string;
        workHours: { hour: number; activityCount: number }[];
    }): string {
        const sections: string[] = [];

        sections.push(`Time Range: ${data.timeRange}`);
        sections.push(`Total Activities: ${data.activities.length}`);

        sections.push('\nActivity Distribution:');
        const typeCounts: Record<string, number> = {};
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
    private parseProductivityResponse(content: string): {
        summary: string;
        recommendations: string[];
        patterns: string[];
    } {
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
    public async detectBurnoutRisk(data: {
        weeklyHours: number[];
        activityTrend: 'increasing' | 'stable' | 'decreasing';
        overtimeFrequency: number;
        weekendWork: number;
    }): Promise<{
        riskLevel: 'low' | 'medium' | 'high';
        indicators: string[];
        suggestions: string[];
    }> {
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

        const messages: OpenAIMessage[] = [
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
    private parseBurnoutResponse(content: string): {
        riskLevel: 'low' | 'medium' | 'high';
        indicators: string[];
        suggestions: string[];
    } {
        const riskMatch = content.match(/risk level:\s*(low|medium|high)/i);
        const riskLevel = (riskMatch?.[1]?.toLowerCase() || 'medium') as 'low' | 'medium' | 'high';

        const indicators: string[] = [];
        const suggestions: string[] = [];

        const lines = content.split('\n');
        let currentSection: 'indicators' | 'suggestions' | null = null;

        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            if (lowerLine.includes('indicator')) {
                currentSection = 'indicators';
            } else if (lowerLine.includes('suggestion')) {
                currentSection = 'suggestions';
            } else if (line.match(/^[-*•]\s*/) || line.match(/^\d+\.\s*/)) {
                const text = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').trim();
                if (text && currentSection) {
                    if (currentSection === 'indicators') {
                        indicators.push(text);
                    } else if (currentSection === 'suggestions') {
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
    private async makeChatRequest(messages: OpenAIMessage[]): Promise<OpenAIResponse> {
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
    private async makeOpenAIRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            if (!this.config) {
                reject(new Error('OpenAI configuration not loaded'));
                return;
            }

            const headers: Record<string, string> = {
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
                        } catch {
                            resolve(responseData);
                        }
                    } else {
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
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.apiKey) {
            throw new Error('OpenAI not configured. Please set API key.');
        }

        try {
            const messages: OpenAIMessage[] = [
                { role: 'user', content: 'Hello' },
            ];

            await this.makeChatRequest(messages);
            return true;
        } catch (error) {
            logger.error('OpenAI connection test failed', error);
            return false;
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
