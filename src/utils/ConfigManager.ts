import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface StandupConfig {
    triggerTime: string;
    activityDuration: number;
    tone: 'brief' | 'detailed' | 'casual' | 'formal';
    customPrompt: string;
    outputLanguage: string;
    ignorePatterns: string[];
    [key: string]: any;
}

export class ConfigManager {
    /**
     * Retrieves the current configuration, merging global settings with workspace-level .standup.json overrides.
     */
    public static getConfig(): StandupConfig {
        const globalConfig = vscode.workspace.getConfiguration('standup');
        
        const config: StandupConfig = {
            triggerTime: globalConfig.get<string>('triggerTime') || '09:00',
            activityDuration: globalConfig.get<number>('activityDuration') || 24,
            tone: globalConfig.get<'brief' | 'detailed' | 'casual' | 'formal'>('tone') || 'casual',
            customPrompt: globalConfig.get<string>('customPrompt') || '',
            outputLanguage: globalConfig.get<string>('outputLanguage') || 'English',
            ignorePatterns: globalConfig.get<string[]>('ignorePatterns') || ["**/node_modules/**", "**/.git/**"]
        };

        // Attempt to load workspace override
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const projectConfigPath = path.join(rootPath, '.standup.json');

            if (fs.existsSync(projectConfigPath)) {
                try {
                    const projectConfigRaw = fs.readFileSync(projectConfigPath, 'utf8');
                    const projectConfig = JSON.parse(projectConfigRaw);
                    
                    // Merge project-level overrides
                    return { ...config, ...projectConfig };
                } catch (error) {
                    console.error('Failed to parse .standup.json:', error);
                }
            }
        }

        return config;
    }

    /**
     * Helper to get a specific config key.
     */
    public static get<T>(key: keyof StandupConfig): T {
        return this.getConfig()[key] as T;
    }
}
