import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager, StandupConfig } from '../../utils/ConfigManager';

// Mock vscode module
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
        workspaceFolders: [],
    },
}));

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('ConfigManager', () => {
    const mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;
    const mockExistsSync = fs.existsSync as jest.Mock;
    const mockReadFileSync = fs.readFileSync as jest.Mock;
    const mockJoin = path.join as jest.Mock;

    const createMockConfig = (overrides?: Partial<StandupConfig>) => ({
        get: jest.fn((key: string) => {
            const defaults: StandupConfig = {
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                customPrompt: '',
                outputLanguage: 'English',
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
                ...overrides,
            };
            return defaults[key as keyof StandupConfig];
        }),
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getConfig', () => {

        it('should return default configuration when no settings are configured', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [];

            const config = ConfigManager.getConfig();

            expect(config).toEqual({
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                customPrompt: '',
                outputLanguage: 'English',
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
            });
        });

        it('should return configured global settings', () => {
            const globalConfig = {
                triggerTime: '10:30',
                activityDuration: 48,
                tone: 'formal' as const,
                customPrompt: 'Custom prompt',
                outputLanguage: 'Spanish',
                ignorePatterns: ["**/test/**"],
            };

            mockGetConfiguration.mockReturnValue(createMockConfig(globalConfig));
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            const config = ConfigManager.getConfig();

            expect(config).toEqual(globalConfig);
        });

        it('should load and merge project-level .standup.json', () => {
            const projectConfig = {
                triggerTime: '14:00',
                activityDuration: 12,
                tone: 'brief' as const,
            };

            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));

            const config = ConfigManager.getConfig();

            expect(config.triggerTime).toBe('14:00');
            expect(config.activityDuration).toBe(12);
            expect(config.tone).toBe('brief');
            expect(config.outputLanguage).toBe('English'); // Default preserved
        });

        it('should handle missing workspace folders gracefully', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = undefined;

            const config = ConfigManager.getConfig();

            expect(mockExistsSync).not.toHaveBeenCalled();
            expect(config).toEqual({
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                customPrompt: '',
                outputLanguage: 'English',
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
            });
        });

        it('should handle empty workspace folders array', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [];

            const config = ConfigManager.getConfig();

            expect(mockExistsSync).not.toHaveBeenCalled();
        });

        it('should return global config when .standup.json does not exist', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(false);

            const config = ConfigManager.getConfig();

            expect(mockReadFileSync).not.toHaveBeenCalled();
            expect(config.triggerTime).toBe('09:00');
        });

        it('should handle JSON parsing errors in .standup.json', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json {');

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const config = ConfigManager.getConfig();

            expect(consoleSpy).toHaveBeenCalledWith(
                'Failed to parse .standup.json:',
                expect.any(Error)
            );
            expect(config).toEqual({
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                customPrompt: '',
                outputLanguage: 'English',
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
            });

            consoleSpy.mockRestore();
        });

        it('should use the first workspace folder when multiple exist', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [
                { uri: { fsPath: '/workspace1' } },
                { uri: { fsPath: '/workspace2' } },
            ];
            mockJoin.mockReturnValue('/workspace1/.standup.json');
            mockExistsSync.mockReturnValue(false);

            ConfigManager.getConfig();

            expect(mockJoin).toHaveBeenCalledWith('/workspace1', '.standup.json');
        });

        it('should merge all properties from project config', () => {
            const projectConfig = {
                triggerTime: '08:00',
                customPrompt: 'Project specific prompt',
                newProperty: 'should be included',
            };

            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));

            const config = ConfigManager.getConfig();

            expect(config.triggerTime).toBe('08:00');
            expect(config.customPrompt).toBe('Project specific prompt');
            expect((config as any).newProperty).toBe('should be included');
        });
    });

    describe('get', () => {
        it('should retrieve specific config key', () => {
            const mockConfig = {
                triggerTime: '11:00',
                activityDuration: 36,
            };

            mockGetConfiguration.mockReturnValue(createMockConfig(mockConfig));
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            const triggerTime = ConfigManager.get<string>('triggerTime');
            const duration = ConfigManager.get<number>('activityDuration');

            expect(triggerTime).toBe('11:00');
            expect(duration).toBe(36);
        });

        it('should return default value when key is not set', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            const tone = ConfigManager.get<string>('tone');

            expect(tone).toBe('casual');
        });

        it('should work with all config keys', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            expect(ConfigManager.get<string>('triggerTime')).toBe('09:00');
            expect(ConfigManager.get<number>('activityDuration')).toBe(24);
            expect(ConfigManager.get<string>('tone')).toBe('casual');
            expect(ConfigManager.get<string>('customPrompt')).toBe('');
            expect(ConfigManager.get<string>('outputLanguage')).toBe('English');
            expect(ConfigManager.get<string[]>('ignorePatterns')).toEqual(["**/node_modules/**", "**/.git/**"]);
        });

        it('should retrieve merged value from project config', () => {
            const projectConfig = {
                activityDuration: 8,
            };

            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));

            const duration = ConfigManager.get<number>('activityDuration');

            expect(duration).toBe(8);
        });
    });

    describe('tone validation', () => {
        it('should accept all valid tone values', () => {
            const validTones: Array<'brief' | 'detailed' | 'casual' | 'formal'> = ['brief', 'detailed', 'casual', 'formal'];

            validTones.forEach(tone => {
                mockGetConfiguration.mockReturnValue(createMockConfig({ tone }));
                (vscode.workspace.workspaceFolders as any) = [];
                mockExistsSync.mockReturnValue(false);

                const config = ConfigManager.getConfig();
                expect(config.tone).toBe(tone);
            });
        });
    });

    describe('ignorePatterns handling', () => {
        it('should return default ignore patterns', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            const config = ConfigManager.getConfig();

            expect(config.ignorePatterns).toEqual(["**/node_modules/**", "**/.git/**"]);
        });

        it('should return custom ignore patterns', () => {
            const customPatterns = ["**/dist/**", "**/*.test.ts"];
            mockGetConfiguration.mockReturnValue(createMockConfig({ ignorePatterns: customPatterns }));
            (vscode.workspace.workspaceFolders as any) = [];
            mockExistsSync.mockReturnValue(false);

            const config = ConfigManager.getConfig();

            expect(config.ignorePatterns).toEqual(customPatterns);
        });

        it('should merge project-level ignore patterns', () => {
            const projectConfig = {
                ignorePatterns: ["**/build/**", "**/coverage/**"]
            };

            mockGetConfiguration.mockReturnValue(createMockConfig());
            (vscode.workspace.workspaceFolders as any) = [{
                uri: { fsPath: '/project/root' }
            }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));

            const config = ConfigManager.getConfig();

            expect(config.ignorePatterns).toEqual(["**/build/**", "**/coverage/**"]);
        });
    });
});
