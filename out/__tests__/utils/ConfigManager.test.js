"use strict";
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
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ConfigManager_1 = require("../../utils/ConfigManager");
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
    const mockGetConfiguration = vscode.workspace.getConfiguration;
    const mockExistsSync = fs.existsSync;
    const mockReadFileSync = fs.readFileSync;
    const mockJoin = path.join;
    const createMockConfig = (overrides) => ({
        get: jest.fn((key) => {
            const defaults = {
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                customPrompt: '',
                outputLanguage: 'English',
                ignorePatterns: ["**/node_modules/**", "**/.git/**"],
                ...overrides,
            };
            return defaults[key];
        }),
    });
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getConfig', () => {
        it('should return default configuration when no settings are configured', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [];
            const config = ConfigManager_1.ConfigManager.getConfig();
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
                tone: 'formal',
                customPrompt: 'Custom prompt',
                outputLanguage: 'Spanish',
                ignorePatterns: ["**/test/**"],
            };
            mockGetConfiguration.mockReturnValue(createMockConfig(globalConfig));
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config).toEqual(globalConfig);
        });
        it('should load and merge project-level .standup.json', () => {
            const projectConfig = {
                triggerTime: '14:00',
                activityDuration: 12,
                tone: 'brief',
            };
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config.triggerTime).toBe('14:00');
            expect(config.activityDuration).toBe(12);
            expect(config.tone).toBe('brief');
            expect(config.outputLanguage).toBe('English'); // Default preserved
        });
        it('should handle missing workspace folders gracefully', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = undefined;
            const config = ConfigManager_1.ConfigManager.getConfig();
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
            vscode.workspace.workspaceFolders = [];
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(mockExistsSync).not.toHaveBeenCalled();
        });
        it('should return global config when .standup.json does not exist', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(false);
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(mockReadFileSync).not.toHaveBeenCalled();
            expect(config.triggerTime).toBe('09:00');
        });
        it('should handle JSON parsing errors in .standup.json', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue('invalid json {');
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(consoleSpy).toHaveBeenCalledWith('Failed to parse .standup.json:', expect.any(Error));
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
            vscode.workspace.workspaceFolders = [
                { uri: { fsPath: '/workspace1' } },
                { uri: { fsPath: '/workspace2' } },
            ];
            mockJoin.mockReturnValue('/workspace1/.standup.json');
            mockExistsSync.mockReturnValue(false);
            ConfigManager_1.ConfigManager.getConfig();
            expect(mockJoin).toHaveBeenCalledWith('/workspace1', '.standup.json');
        });
        it('should merge all properties from project config', () => {
            const projectConfig = {
                triggerTime: '08:00',
                customPrompt: 'Project specific prompt',
                newProperty: 'should be included',
            };
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config.triggerTime).toBe('08:00');
            expect(config.customPrompt).toBe('Project specific prompt');
            expect(config.newProperty).toBe('should be included');
        });
    });
    describe('get', () => {
        it('should retrieve specific config key', () => {
            const mockConfig = {
                triggerTime: '11:00',
                activityDuration: 36,
            };
            mockGetConfiguration.mockReturnValue(createMockConfig(mockConfig));
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            const triggerTime = ConfigManager_1.ConfigManager.get('triggerTime');
            const duration = ConfigManager_1.ConfigManager.get('activityDuration');
            expect(triggerTime).toBe('11:00');
            expect(duration).toBe(36);
        });
        it('should return default value when key is not set', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            const tone = ConfigManager_1.ConfigManager.get('tone');
            expect(tone).toBe('casual');
        });
        it('should work with all config keys', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            expect(ConfigManager_1.ConfigManager.get('triggerTime')).toBe('09:00');
            expect(ConfigManager_1.ConfigManager.get('activityDuration')).toBe(24);
            expect(ConfigManager_1.ConfigManager.get('tone')).toBe('casual');
            expect(ConfigManager_1.ConfigManager.get('customPrompt')).toBe('');
            expect(ConfigManager_1.ConfigManager.get('outputLanguage')).toBe('English');
            expect(ConfigManager_1.ConfigManager.get('ignorePatterns')).toEqual(["**/node_modules/**", "**/.git/**"]);
        });
        it('should retrieve merged value from project config', () => {
            const projectConfig = {
                activityDuration: 8,
            };
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));
            const duration = ConfigManager_1.ConfigManager.get('activityDuration');
            expect(duration).toBe(8);
        });
    });
    describe('tone validation', () => {
        it('should accept all valid tone values', () => {
            const validTones = ['brief', 'detailed', 'casual', 'formal'];
            validTones.forEach(tone => {
                mockGetConfiguration.mockReturnValue(createMockConfig({ tone }));
                vscode.workspace.workspaceFolders = [];
                mockExistsSync.mockReturnValue(false);
                const config = ConfigManager_1.ConfigManager.getConfig();
                expect(config.tone).toBe(tone);
            });
        });
    });
    describe('ignorePatterns handling', () => {
        it('should return default ignore patterns', () => {
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config.ignorePatterns).toEqual(["**/node_modules/**", "**/.git/**"]);
        });
        it('should return custom ignore patterns', () => {
            const customPatterns = ["**/dist/**", "**/*.test.ts"];
            mockGetConfiguration.mockReturnValue(createMockConfig({ ignorePatterns: customPatterns }));
            vscode.workspace.workspaceFolders = [];
            mockExistsSync.mockReturnValue(false);
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config.ignorePatterns).toEqual(customPatterns);
        });
        it('should merge project-level ignore patterns', () => {
            const projectConfig = {
                ignorePatterns: ["**/build/**", "**/coverage/**"]
            };
            mockGetConfiguration.mockReturnValue(createMockConfig());
            vscode.workspace.workspaceFolders = [{
                    uri: { fsPath: '/project/root' }
                }];
            mockJoin.mockReturnValue('/project/root/.standup.json');
            mockExistsSync.mockReturnValue(true);
            mockReadFileSync.mockReturnValue(JSON.stringify(projectConfig));
            const config = ConfigManager_1.ConfigManager.getConfig();
            expect(config.ignorePatterns).toEqual(["**/build/**", "**/coverage/**"]);
        });
    });
});
//# sourceMappingURL=ConfigManager.test.js.map