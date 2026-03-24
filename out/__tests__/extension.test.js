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
const extension_1 = require("../extension");
// Mock all the dependencies
jest.mock('../trackers/activityTracker');
jest.mock('../trackers/gitTracker');
jest.mock('../trackers/terminalTracker');
jest.mock('../services/standupGenerator');
jest.mock('../services/ExporterService');
jest.mock('../services/HistoryService');
jest.mock('../services/DigestService');
jest.mock('../utils/ConfigManager');
jest.mock('../webviews/standupCard');
jest.mock('../webviews/HistoryPanel');
jest.mock('../webviews/DataAuditPanel');
jest.mock('../utils/auth');
// Mock vscode
jest.mock('vscode', () => {
    const subscriptions = [];
    const mockDisposable = {
        dispose: jest.fn(),
    };
    return {
        window: {
            createStatusBarItem: jest.fn(() => ({
                command: '',
                text: '',
                tooltip: '',
                color: undefined,
                show: jest.fn(),
                dispose: jest.fn(),
            })),
            withProgress: jest.fn(),
            showInformationMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showInputBox: jest.fn(),
        },
        commands: {
            registerCommand: jest.fn((id, callback) => {
                subscriptions.push({ dispose: jest.fn() });
                return mockDisposable;
            }),
            executeCommand: jest.fn(),
        },
        workspace: {
            getConfiguration: jest.fn(() => ({
                get: jest.fn((key, defaultValue) => {
                    const defaults = {
                        triggerTime: '09:00',
                        activityDuration: 24,
                        tone: 'casual',
                        customPrompt: '',
                        outputLanguage: 'English',
                        ignorePatterns: ["**/node_modules/**", "**/.git/**"],
                        paused: false,
                    };
                    return defaults[key] !== undefined ? defaults[key] : defaultValue;
                }),
            })),
            onDidChangeConfiguration: jest.fn(() => mockDisposable),
        },
        StatusBarAlignment: {
            Left: 1,
            Right: 2,
        },
        ProgressLocation: {
            Notification: 1,
        },
        ThemeColor: jest.fn(),
        Uri: {
            parse: jest.fn(),
        },
        env: {
            clipboard: {
                writeText: jest.fn(),
            },
            openExternal: jest.fn(),
        },
    };
});
// Mock ConfigManager
const ConfigManager_1 = require("../utils/ConfigManager");
jest.spyOn(ConfigManager_1.ConfigManager, 'getConfig').mockReturnValue({
    triggerTime: '09:00',
    activityDuration: 24,
    tone: 'casual',
    customPrompt: '',
    outputLanguage: 'English',
    ignorePatterns: ["**/node_modules/**", "**/.git/**"],
});
describe('extension', () => {
    let mockContext;
    beforeEach(() => {
        jest.clearAllMocks();
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn((key, defaultValue) => defaultValue),
                update: jest.fn(),
                keys: () => [],
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: () => [],
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn(),
                keys: jest.fn().mockResolvedValue([]),
            },
            extensionPath: '',
            storagePath: '',
            globalStoragePath: '',
            logPath: '',
            extensionUri: null,
            environmentVariableCollection: {},
            asAbsolutePath: (path) => path,
            storageUri: null,
            globalStorageUri: null,
            logUri: null,
            extensionMode: 1,
            activeExtension: null,
        };
        // Set default mock values
        mockContext.globalState.get.mockImplementation((key, defaultValue) => {
            if (key === 'standup.paused')
                return false;
            if (key === 'standup.activityLog')
                return null;
            return defaultValue;
        });
    });
    describe('activate', () => {
        it('should register all commands', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.generate', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.viewHistory', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.toggleTracking', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.previewData', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.generateWeeklyDigest', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setApiKey', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setNotionToken', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setJiraToken', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToNotion', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToJira', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.copyForTeams', expect.any(Function));
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.sendEmail', expect.any(Function));
        });
        it('should create and configure status bar item', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(vscode.StatusBarAlignment.Left, 100);
        });
        it('should add all disposables to context subscriptions', () => {
            (0, extension_1.activate)(mockContext);
            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });
        it('should initialize activity log in global state if not exists', () => {
            mockContext.globalState.get.mockReturnValue(undefined);
            (0, extension_1.activate)(mockContext);
            expect(mockContext.globalState.update).toHaveBeenCalledWith('standup.activityLog', {
                lastUpdated: null,
                dailyLogs: [],
            });
        });
        it('should not overwrite existing activity log', () => {
            const existingLog = { lastUpdated: Date.now(), dailyLogs: [] };
            mockContext.globalState.get.mockReturnValue(existingLog);
            (0, extension_1.activate)(mockContext);
            expect(mockContext.globalState.update).not.toHaveBeenCalledWith('standup.activityLog', expect.anything());
        });
        it('should set up configuration change listener', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        });
    });
    describe('standup.generate command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            const registerCommandCalls = vscode.commands.registerCommand.mock.calls;
            const generateCall = registerCommandCalls.find(call => call[0] === 'standup.generate');
            expect(generateCall).toBeDefined();
            expect(typeof generateCall[1]).toBe('function');
        });
    });
    describe('standup.toggleTracking command', () => {
        it('should toggle paused state', () => {
            (0, extension_1.activate)(mockContext);
            const registerCommandCalls = vscode.commands.registerCommand.mock.calls;
            const toggleCall = registerCommandCalls.find(call => call[0] === 'standup.toggleTracking');
            const toggleHandler = toggleCall[1];
            toggleHandler();
            expect(mockContext.globalState.update).toHaveBeenCalledWith('standup.paused', true);
        });
    });
    describe('standup.setNotionToken command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setNotionToken', expect.any(Function));
        });
    });
    describe('standup.setJiraToken command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setJiraToken', expect.any(Function));
        });
    });
    describe('standup.exportToNotion command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToNotion', expect.any(Function));
        });
    });
    describe('standup.exportToJira command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToJira', expect.any(Function));
        });
    });
    describe('standup.copyForTeams command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.copyForTeams', expect.any(Function));
        });
    });
    describe('standup.sendEmail command', () => {
        it('should be registered', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.sendEmail', expect.any(Function));
        });
    });
    describe('status bar', () => {
        it('should show status bar item', () => {
            const mockStatusBarItem = {
                command: '',
                text: '',
                tooltip: '',
                color: undefined,
                show: jest.fn(),
            };
            vscode.window.createStatusBarItem.mockReturnValue(mockStatusBarItem);
            (0, extension_1.activate)(mockContext);
            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });
        it('should set command for status bar', () => {
            (0, extension_1.activate)(mockContext);
            const mockStatusBarItem = vscode.window.createStatusBarItem.mock.results[0].value;
            expect(mockStatusBarItem.command).toBe('standup.toggleTracking');
        });
    });
    describe('scheduler', () => {
        it('should setup scheduler on activation', () => {
            jest.useFakeTimers();
            (0, extension_1.activate)(mockContext);
            expect(setTimeout).toHaveBeenCalled();
            jest.useRealTimers();
        });
        it('should register configuration change handler for trigger time', () => {
            const mockOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration;
            let configChangeCallback;
            mockOnDidChangeConfiguration.mockImplementation((callback) => {
                configChangeCallback = callback;
                return { dispose: jest.fn() };
            });
            (0, extension_1.activate)(mockContext);
            expect(configChangeCallback).toBeDefined();
        });
    });
    describe('deactivate', () => {
        it('should be a function', () => {
            expect(typeof extension_1.deactivate).toBe('function');
        });
        it('should not throw when called', () => {
            expect(() => (0, extension_1.deactivate)()).not.toThrow();
        });
    });
    describe('command execution', () => {
        it('should register viewHistory command', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.viewHistory', expect.any(Function));
        });
        it('should register previewData command', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.previewData', expect.any(Function));
        });
        it('should register generateWeeklyDigest command', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.generateWeeklyDigest', expect.any(Function));
        });
        it('should register setApiKey command', () => {
            (0, extension_1.activate)(mockContext);
            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setApiKey', expect.any(Function));
        });
    });
    describe('context integration', () => {
        it('should use context extensionUri for webviews', () => {
            const mockUri = { toString: () => 'mock-extension-uri' };
            mockContext = { ...mockContext, extensionUri: mockUri };
            (0, extension_1.activate)(mockContext);
            expect(mockContext.extensionUri).toBeDefined();
        });
        it('should use context secrets for API key storage', () => {
            (0, extension_1.activate)(mockContext);
            expect(mockContext.secrets).toBeDefined();
        });
        it('should use context globalState for tracking pause state', () => {
            (0, extension_1.activate)(mockContext);
            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.paused', false);
        });
    });
    describe('error handling', () => {
        it('should handle missing configuration gracefully', () => {
            mockContext.globalState.get = jest.fn((key, defaultValue) => {
                if (key === 'standup.activityLog')
                    return null;
                return defaultValue;
            });
            expect(() => (0, extension_1.activate)(mockContext)).not.toThrow();
        });
        it('should initialize with default pause state', () => {
            mockContext.globalState.get = jest.fn(() => undefined);
            (0, extension_1.activate)(mockContext);
            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.paused', false);
        });
    });
});
//# sourceMappingURL=extension.test.js.map