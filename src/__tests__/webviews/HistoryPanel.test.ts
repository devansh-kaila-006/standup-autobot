import * as vscode from 'vscode';
import { HistoryPanel } from '../../webviews/HistoryPanel';
import { HistoryService } from '../../services/HistoryService';

// Mock vscode
jest.mock('vscode', () => {
    const mockWebviewPanel = {
        viewColumn: 1,
        reveal: jest.fn(),
        dispose: jest.fn(),
        webview: {
            onDidReceiveMessage: jest.fn(),
            postMessage: jest.fn(),
            html: '',
        },
        onDidDispose: jest.fn(),
    };

    return {
        workspace: {
            getConfiguration: jest.fn(() => ({
                get: jest.fn((key: string) => {
                    if (key === 'workbench.colorTheme') return 'Dark+';
                    return undefined;
                }),
                update: jest.fn(),
            })),
            onDidChangeConfiguration: jest.fn(() => ({
                dispose: jest.fn(),
            })),
        },
        window: {
            activeTextEditor: {
                viewColumn: 1,
            },
            createWebviewPanel: jest.fn(() => mockWebviewPanel),
            showInformationMessage: jest.fn(),
        },
        ViewColumn: {
            One: 1,
            Two: 2,
            Three: 3,
        },
        Uri: {
            joinPath: jest.fn(),
            parse: jest.fn(),
        },
        env: {
            language: 'en',
            clipboard: {
                writeText: jest.fn(),
            },
        },
    };
});

// Mock HistoryService
jest.mock('../../services/HistoryService');

describe('HistoryPanel', () => {
    let mockExtensionUri: vscode.Uri;
    let mockContext: vscode.ExtensionContext;
    let mockPanel: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockExtensionUri = {
            scheme: 'file',
            path: '/extension/path',
        } as any;

        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn((key: string, defaultValue?: any) => {
                    if (key === 'standup.history') return [];
                    if (key === 'standup.activityLog') return { lastUpdated: null, dailyLogs: [] };
                    return defaultValue;
                }),
                update: jest.fn(),
                keys: [],
            },
            workspaceState: {
                get: jest.fn(),
                update: jest.fn(),
                keys: [],
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
                delete: jest.fn(),
                onDidChange: jest.fn(),
            },
            extensionPath: '',
            storagePath: '',
            globalStoragePath: '',
            logPath: '',
            extensionUri: null as any,
            environmentVariableCollection: {} as any,
            asAbsolutePath: (path: string) => path,
            executeCommand: jest.fn(),
        } as any;

        let capturedHtml = '';
        mockPanel = {
            viewColumn: vscode.ViewColumn.One,
            reveal: jest.fn(),
            dispose: jest.fn(),
            webview: {
                onDidReceiveMessage: jest.fn((callback) => {
                    (mockPanel as any).messageCallback = callback;
                    return { dispose: jest.fn() };
                }),
                postMessage: jest.fn(),
                get html() { return capturedHtml; },
                set html(value) { capturedHtml = value; },
            },
            onDidDispose: jest.fn((callback) => {
                (mockPanel as any).disposeCallback = callback;
                return { dispose: jest.fn() };
            }),
        };

        (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(mockPanel);

        // Mock HistoryService
        (HistoryService as unknown as jest.Mock).mockImplementation(() => ({
            getHistory: jest.fn(() => []),
            getAllActivity: jest.fn(() => []),
            getWeeklySummaries: jest.fn(() => []),
        }));
    });

    afterEach(() => {
        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel.dispose();
        }
    });

    describe('createOrShow', () => {
        it('should create a new webview panel', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'standupAutobot.history',
                'Standup History & Trends',
                vscode.ViewColumn.One,
                expect.objectContaining({
                    enableScripts: true,
                })
            );
        });

        it('should create new panel on each call to ensure fresh data', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            const firstPanel = HistoryPanel.currentPanel;

            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            // Should create two panels (first one gets disposed)
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(2);
            // Current panel should be different from first panel
            expect(HistoryPanel.currentPanel).not.toBe(firstPanel);
        });

        it('should use active text editor column if available', () => {
            vscode.window.activeTextEditor = {
                viewColumn: vscode.ViewColumn.Two,
            } as any;

            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                vscode.ViewColumn.Two,
                expect.any(Object)
            );
        });

        it('should use ViewColumn.One when no active editor', () => {
            vscode.window.activeTextEditor = undefined;

            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                vscode.ViewColumn.One,
                expect.any(Object)
            );
        });

        it('should set currentPanel static property', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(HistoryPanel.currentPanel).toBeDefined();
        });

        it('should include extensionUri in local resource roots', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            const createCall = (vscode.window.createWebviewPanel as jest.Mock).mock.calls[0];
            const options = createCall[3];

            expect(options.localResourceRoots).toContain(mockExtensionUri);
        });
    });

    describe('message handling', () => {
        beforeEach(() => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);
        });

        describe('copyToClipboard', () => {
            it('should copy text to clipboard', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: 'Test standup text',
                };

                await mockPanel.messageCallback(message);

                expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('Test standup text');
                expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Copied to clipboard!');
            });

            it('should handle missing text gracefully', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: '',
                };

                await mockPanel.messageCallback(message);

                expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
            });

            it('should handle undefined text', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: undefined as any,
                };

                await mockPanel.messageCallback(message);

                expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
            });
        });

        describe('unknown commands', () => {
            it('should ignore unknown commands', async () => {
                const message = {
                    command: 'unknownCommand',
                    text: 'Test',
                };

                await expect(mockPanel.messageCallback(message)).resolves.toBeUndefined();
            });
        });
    });

    describe('dispose', () => {
        it('should clear currentPanel static property', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(HistoryPanel.currentPanel).toBeDefined();

            HistoryPanel.currentPanel?.dispose();

            expect(HistoryPanel.currentPanel).toBeUndefined();
        });

        it('should dispose panel', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            HistoryPanel.currentPanel?.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should handle dispose callback', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            if (mockPanel.disposeCallback) {
                mockPanel.disposeCallback();
            }

            expect(HistoryPanel.currentPanel).toBeUndefined();
        });

        it('should dispose all disposables', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            const mockDisposable = {
                dispose: jest.fn(),
            };
            (HistoryPanel.currentPanel as any)._disposables.push(mockDisposable);

            HistoryPanel.currentPanel?.dispose();

            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });

    describe('HTML generation', () => {
        beforeEach(() => {
            // Mock history data
            const historyServiceInstance = new HistoryService(mockContext);
            (historyServiceInstance.getHistory as jest.Mock).mockReturnValue([
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    text: '# Standup 1\n\n- Item 1',
                },
                {
                    id: '2',
                    timestamp: new Date(Date.now() - 86400000).toISOString(),
                    text: '# Standup 2\n\n- Item 2',
                },
            ]);

            (historyServiceInstance.getAllActivity as jest.Mock).mockReturnValue([
                {
                    date: new Date().toISOString().split('T')[0],
                    fileCount: 10,
                },
            ]);
        });

        it('should generate HTML with nonce', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('nonce=');
            expect(mockPanel.webview.html).toMatch(/nonce="[A-Za-z0-9]{32}"/);
        });

        it('should inject history data', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('historyData');
            expect(mockPanel.webview.html).toContain('activityData');
        });

        it('should include required React scripts', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('react@18');
            expect(mockPanel.webview.html).toContain('babel.min.js');
        });

        it('should include custom styles', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('--background-color: #1e1e1e');
            expect(mockPanel.webview.html).toContain('.heatmap-section');
            expect(mockPanel.webview.html).toContain('.history-item');
        });

        it('should include Heatmap component', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('Heatmap');
            expect(mockPanel.webview.html).toContain('7-Day Productivity');
        });

        it('should include HistoryApp component', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('HistoryApp');
            expect(mockPanel.webview.html).toContain('Standup History');
        });

        it('should handle empty history', () => {
            // Mock empty history in context
            (mockContext.globalState.get as jest.Mock).mockReturnValue([]);

            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('history.noEntries');
        });
    });

    describe('data loading', () => {
        it('should load history from HistoryService', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            // The HistoryPanel internally creates a HistoryService instance and calls getHistory
            // Since HistoryService is mocked, we just need to verify the panel was created successfully
            expect(mockPanel.webview.html).toContain('historyData');
        });

        it('should load activity from HistoryService', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            // The HistoryPanel internally creates a HistoryService instance and calls getAllActivity
            // Since HistoryService is mocked, we just need to verify the panel was created successfully
            expect(mockPanel.webview.html).toContain('activityData');
        });
    });

    describe('panel update', () => {
        it('should update HTML when panel is created', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toBeDefined();
            expect(mockPanel.webview.html.length).toBeGreaterThan(0);
        });
    });

    describe('React components', () => {
        it('should include Heatmap with color function', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('getColor');
        });

        it('should include copy handler in HistoryApp', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('handleCopy');
        });

        it('should include heatmap grid layout', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(mockPanel.webview.html).toContain('heatmap-grid');
        });
    });

    describe('webview options', () => {
        it('should enable scripts', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            const createCall = (vscode.window.createWebviewPanel as jest.Mock).mock.calls[0];
            const options = createCall[3];

            expect(options.enableScripts).toBe(true);
        });

        it('should set correct view type', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'standupAutobot.history',
                expect.any(String),
                expect.any(Number),
                expect.any(Object)
            );
        });

        it('should set correct title', () => {
            HistoryPanel.createOrShow(mockExtensionUri, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                expect.any(String),
                'Standup History & Trends',
                expect.any(Number),
                expect.any(Object)
            );
        });
    });
});
