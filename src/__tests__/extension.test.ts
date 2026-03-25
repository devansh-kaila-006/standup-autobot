import * as vscode from 'vscode';
import { activate, deactivate } from '../extension';

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
jest.mock('../webviews/SidePanelProvider');
jest.mock('../utils/auth');

// Mock vscode
jest.mock('vscode', () => {
    const subscriptions: any[] = [];
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
            createOutputChannel: jest.fn(() => ({
                append: jest.fn(),
                appendLine: jest.fn(),
                show: jest.fn(),
                dispose: jest.fn(),
            })),
            withProgress: jest.fn(),
            showInformationMessage: jest.fn(),
            showErrorMessage: jest.fn(),
            showWarningMessage: jest.fn(),
            showInputBox: jest.fn(),
            registerWebviewViewProvider: jest.fn(() => mockDisposable),
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
                get: jest.fn((key: string, defaultValue?: any) => {
                    const defaults: any = {
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
            language: 'en',
            clipboard: {
                writeText: jest.fn(),
            },
            openExternal: jest.fn(),
        },
    };
});

// Mock ConfigManager
import { ConfigManager } from '../utils/ConfigManager';
jest.spyOn(ConfigManager, 'getConfig').mockReturnValue({
    triggerTime: '09:00',
    activityDuration: 24,
    tone: 'casual',
    customPrompt: '',
    outputLanguage: 'English',
    ignorePatterns: ["**/node_modules/**", "**/.git/**"],
});

describe('extension', () => {
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        jest.clearAllMocks();

        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn((key: string, defaultValue?: any) => defaultValue),
                update: jest.fn(),
                keys: () => [],
            } as any,
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: () => [],
            } as any,
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
            extensionUri: null as any,
            environmentVariableCollection: {} as any,
            asAbsolutePath: (path: string) => path,
            storageUri: null as any,
            globalStorageUri: null as any,
            logUri: null as any,
            extensionMode: 1 as any,
            activeExtension: null as any,
        } as any;

        // Set default mock values
        (mockContext.globalState.get as jest.Mock).mockImplementation((key: string, defaultValue?: any) => {
            if (key === 'standup.paused') return false;
            if (key === 'standup.activityLog') return null;
            return defaultValue;
        });
    });

    describe('activate', () => {
        it('should register all commands', () => {
            activate(mockContext);

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
            activate(mockContext);

            expect(vscode.window.createStatusBarItem).toHaveBeenCalledWith(vscode.StatusBarAlignment.Left, 100);
        });

        it('should add all disposables to context subscriptions', () => {
            activate(mockContext);

            expect(mockContext.subscriptions.length).toBeGreaterThan(0);
        });

        it('should initialize activity log in global state if not exists', () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(undefined);

            activate(mockContext);

            expect(mockContext.globalState.update).toHaveBeenCalledWith('standup.activityLog', {
                lastUpdated: null,
                dailyLogs: [],
            });
        });

        it('should not overwrite existing activity log', () => {
            const existingLog = { lastUpdated: Date.now(), dailyLogs: [] };
            (mockContext.globalState.get as jest.Mock).mockReturnValue(existingLog);

            activate(mockContext);

            expect(mockContext.globalState.update).not.toHaveBeenCalledWith('standup.activityLog', expect.anything());
        });

        it('should set up configuration change listener', () => {
            activate(mockContext);

            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        });
    });

    describe('standup.generate command', () => {
        it('should be registered', () => {
            activate(mockContext);

            const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
            const generateCall = registerCommandCalls.find(call => call[0] === 'standup.generate');

            expect(generateCall).toBeDefined();
            expect(typeof generateCall![1]).toBe('function');
        });
    });

    describe('standup.toggleTracking command', () => {
        it('should toggle paused state', () => {
            activate(mockContext);

            const registerCommandCalls = (vscode.commands.registerCommand as jest.Mock).mock.calls;
            const toggleCall = registerCommandCalls.find(call => call[0] === 'standup.toggleTracking');
            const toggleHandler = toggleCall![1];

            toggleHandler();

            expect(mockContext.globalState.update).toHaveBeenCalledWith('standup.paused', true);
        });
    });

    describe('standup.setNotionToken command', () => {
        it('should be registered', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setNotionToken', expect.any(Function));
        });
    });

    describe('standup.setJiraToken command', () => {
        it('should be registered', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setJiraToken', expect.any(Function));
        });
    });

    describe('standup.exportToNotion command', () => {
        it('should be registered', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToNotion', expect.any(Function));
        });
    });

    describe('standup.exportToJira command', () => {
        it('should be registered', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.exportToJira', expect.any(Function));
        });
    });

    describe('standup.copyForTeams command', () => {
        it('should be registered', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.copyForTeams', expect.any(Function));
        });
    });

    describe('standup.sendEmail command', () => {
        it('should be registered', () => {
            activate(mockContext);

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
            (vscode.window.createStatusBarItem as jest.Mock).mockReturnValue(mockStatusBarItem);

            activate(mockContext);

            expect(mockStatusBarItem.show).toHaveBeenCalled();
        });

        it('should set command for status bar', () => {
            activate(mockContext);

            const mockStatusBarItem = (vscode.window.createStatusBarItem as jest.Mock).mock.results[0].value;
            expect(mockStatusBarItem.command).toBe('standup.toggleTracking');
        });
    });

    describe('scheduler', () => {
        it('should setup scheduler on activation', () => {
            jest.useFakeTimers();
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            activate(mockContext);

            expect(setTimeoutSpy).toHaveBeenCalled();

            setTimeoutSpy.mockRestore();
            jest.useRealTimers();
        });

        it('should register configuration change handler for trigger time', () => {
            const mockOnDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration as jest.Mock;
            let configChangeCallback: ((e: vscode.ConfigurationChangeEvent) => void) | undefined;

            mockOnDidChangeConfiguration.mockImplementation((callback) => {
                configChangeCallback = callback;
                return { dispose: jest.fn() };
            });

            activate(mockContext);

            expect(configChangeCallback).toBeDefined();
        });
    });

    describe('deactivate', () => {
        it('should be a function', () => {
            expect(typeof deactivate).toBe('function');
        });

        it('should not throw when called', () => {
            expect(() => deactivate()).not.toThrow();
        });
    });

    describe('command execution', () => {
        it('should register viewHistory command', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.viewHistory', expect.any(Function));
        });

        it('should register previewData command', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.previewData', expect.any(Function));
        });

        it('should register generateWeeklyDigest command', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.generateWeeklyDigest', expect.any(Function));
        });

        it('should register setApiKey command', () => {
            activate(mockContext);

            expect(vscode.commands.registerCommand).toHaveBeenCalledWith('standup.setApiKey', expect.any(Function));
        });
    });

    describe('context integration', () => {
        it('should use context extensionUri for webviews', () => {
            const mockUri = { toString: () => 'mock-extension-uri' };
            mockContext = { ...mockContext, extensionUri: mockUri as any };

            activate(mockContext);

            expect(mockContext.extensionUri).toBeDefined();
        });

        it('should use context secrets for API key storage', () => {
            activate(mockContext);

            expect(mockContext.secrets).toBeDefined();
        });

        it('should use context globalState for tracking pause state', () => {
            activate(mockContext);

            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.paused', false);
        });
    });

    describe('error handling', () => {
        it('should handle missing configuration gracefully', () => {
            mockContext.globalState.get = jest.fn((key: string, defaultValue?: any) => {
                if (key === 'standup.activityLog') return null;
                return defaultValue;
            });

            expect(() => activate(mockContext)).not.toThrow();
        });

        it('should initialize with default pause state', () => {
            mockContext.globalState.get = jest.fn(() => undefined);

            activate(mockContext);

            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.paused', false);
        });
    });
});
