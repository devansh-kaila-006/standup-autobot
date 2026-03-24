export interface StandupConfig {
    triggerTime: string;
    activityDuration: number;
    tone: 'brief' | 'detailed' | 'casual' | 'formal';
    customPrompt: string;
    outputLanguage: string;
    ignorePatterns: string[];
    [key: string]: any;
}
export declare class ConfigManager {
    /**
     * Retrieves the current configuration, merging global settings with workspace-level .standup.json overrides.
     */
    static getConfig(): StandupConfig;
    /**
     * Helper to get a specific config key.
     */
    static get<T>(key: keyof StandupConfig): T;
}
//# sourceMappingURL=ConfigManager.d.ts.map