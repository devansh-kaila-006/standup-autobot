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
import * as http from 'http';
import { Logger } from '../utils/Logger';

const logger = new Logger('LocalLLMService');

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

export class LocalLLMService {
    private config: LocalLLMConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Local LLM configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            baseURL: config.get<string>('localLlmBaseUrl', 'http://localhost:11434'),
            model: config.get<string>('localLlmModel', 'llama2'),
            temperature: config.get<number>('localLlmTemperature', 0.7),
            numPredict: config.get<number>('localLlmNumPredict', 1000),
        };
    }

    /**
     * Generate standup using local LLM
     */
    public async generateStandup(activities: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<string> {
        if (!this.config) {
            throw new Error('Local LLM not configured.');
        }

        const systemPrompt = this.getSystemPrompt();
        const userPrompt = this.formatActivitiesPrompt(activities);

        const response = await this.makeChatRequest([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
        ]);

        return response.response || '';
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

        sections.push('Please generate a standup update based on these activities:\n');

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
     * Summarize activities using local LLM
     */
    public async summarizeActivities(activities: string[]): Promise<string> {
        if (!this.config) {
            throw new Error('Local LLM not configured.');
        }

        const response = await this.makeChatRequest([
            {
                role: 'system',
                content: 'You are a helpful assistant that summarizes development activities concisely.',
            },
            {
                role: 'user',
                content: `Summarize these activities:\n${activities.join('\n')}`,
            },
        ]);

        return response.response || '';
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
        if (!this.config) {
            throw new Error('Local LLM not configured.');
        }

        const prompt = this.formatProductivityPrompt(data);

        const response = await this.makeChatRequest([
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
        ]);

        const content = response.response || '';

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

        sections.push('Analyze the following productivity data:\n');

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
        if (!this.config) {
            throw new Error('Local LLM not configured.');
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

        const response = await this.makeChatRequest([
            {
                role: 'system',
                content: 'You are a workplace wellbeing analyst. Assess burnout risk and provide actionable suggestions.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ]);

        const content = response.response || '';

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
     * Make chat request to Ollama
     */
    private async makeChatRequest(messages: OllamaMessage[]): Promise<OllamaResponse> {
        if (!this.config) {
            throw new Error('Local LLM not configured');
        }

        const urlObj = new URL(`${this.config.baseURL}/api/chat`);

        const requestData = {
            model: this.config.model,
            messages,
            stream: false,
            options: {
                temperature: this.config.temperature,
                num_predict: this.config.numPredict,
            },
        };

        return await this.makeOllamaRequest(urlObj, 'POST', requestData);
    }

    /**
     * Make request to Ollama API
     */
    private async makeOllamaRequest(
        urlObj: URL,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config) {
            throw new Error('Local LLM not configured');
        }

        return new Promise((resolve, reject) => {
            const options = {
                hostname: urlObj.hostname,
                port: urlObj.port || 11434,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                },
            };

            const req = http.request(options, (res) => {
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
                        reject(new Error(`Ollama API error (${res.statusCode}): ${responseData}`));
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
     * List available models
     */
    public async listModels(): Promise<string[]> {
        if (!this.config) {
            throw new Error('Local LLM not configured');
        }

        try {
            const urlObj = new URL(`${this.config.baseURL}/api/tags`);
            const response = await this.makeOllamaRequest(urlObj, 'GET');

            if (response.models) {
                return response.models.map((model: any) => model.name);
            }

            return [];
        } catch (error) {
            logger.error('Failed to list Ollama models', error);
            return [];
        }
    }

    /**
     * Pull a model
     */
    public async pullModel(modelName: string): Promise<boolean> {
        if (!this.config) {
            throw new Error('Local LLM not configured');
        }

        try {
            const urlObj = new URL(`${this.config.baseURL}/api/pull`);
            await this.makeOllamaRequest(urlObj, 'POST', {
                name: modelName,
                stream: false,
            });

            return true;
        } catch (error) {
            logger.error('Failed to pull Ollama model', error);
            return false;
        }
    }

    /**
     * Test Ollama connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config) {
            throw new Error('Local LLM not configured.');
        }

        try {
            const response = await this.makeChatRequest([
                { role: 'user', content: 'Say "Connection successful" if you receive this.' },
            ]);

            return response.response.includes('successful');
        } catch (error) {
            logger.error('Ollama connection test failed', error);
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
