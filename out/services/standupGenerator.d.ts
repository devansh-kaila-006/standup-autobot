/**
 * Interfaces for the input JSON data
 */
export interface FileActivity {
    file: string;
    timeSpent: string;
    linesChanged: number;
}
export interface GitCommit {
    hash: string;
    message: string;
    timestamp: string;
    files: string[];
}
export interface TerminalCommand {
    command: string;
    timestamp?: string;
}
export interface DeveloperActivityData {
    topFiles: FileActivity[];
    commits: GitCommit[];
    commands: string[];
}
/**
 * Configuration for the StandupGenerator
 */
export interface StandupGeneratorConfig {
    baseUrl?: string;
    model?: string;
}
/**
 * Settings for the standup generation (from VS Code configuration)
 */
export interface StandupSettings {
    customPrompt?: string;
    tone: 'brief' | 'detailed' | 'casual' | 'formal';
    outputLanguage: string;
}
/**
 * Service class to generate daily standups using Gemini AI
 */
export declare class StandupGenerator {
    private readonly baseUrl;
    private readonly model;
    constructor(config?: StandupGeneratorConfig);
    /**
     * Generates the standup summary based on developer activity.
     * @param data The JSON data gathered from VS Code.
     * @param apiKey The Google Gemini API key.
     * @param settings The standup generation settings (tone, language, custom prompt).
     * @param durationHours The lookback duration in hours.
     * @returns A Markdown string containing the standup.
     */
    generateStandup(data: DeveloperActivityData, apiKey?: string, settings?: StandupSettings, durationHours?: number): Promise<string>;
    /**
     * Call Gemini API to generate content from prompt
     * Uses caching to avoid redundant API calls for identical prompts
     */
    generateContent(prompt: string, apiKey: string): Promise<string>;
    /**
     * Formats the raw data and analysis into a structured prompt for the LLM.
     */
    private buildPrompt;
}
//# sourceMappingURL=standupGenerator.d.ts.map