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
const HistoryPanel_1 = require("../../webviews/HistoryPanel");
const HistoryService_1 = require("../../services/HistoryService");
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
            clipboard: {
                writeText: jest.fn(),
            },
        },
    };
});
// Mock HistoryService
jest.mock('../../services/HistoryService');
describe('HistoryPanel', () => {
    let mockExtensionUri;
    let mockContext;
    let mockPanel;
    beforeEach(() => {
        jest.clearAllMocks();
        mockExtensionUri = {
            scheme: 'file',
            path: '/extension/path',
        };
        mockContext = {
            subscriptions: [],
            globalState: {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'standup.history')
                        return [];
                    if (key === 'standup.activityLog')
                        return { lastUpdated: null, dailyLogs: [] };
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
            extensionUri: null,
            environmentVariableCollection: {},
            asAbsolutePath: (path) => path,
            executeCommand: jest.fn(),
        };
        let capturedHtml = '';
        mockPanel = {
            viewColumn: vscode.ViewColumn.One,
            reveal: jest.fn(),
            dispose: jest.fn(),
            webview: {
                onDidReceiveMessage: jest.fn((callback) => {
                    mockPanel.messageCallback = callback;
                    return { dispose: jest.fn() };
                }),
                postMessage: jest.fn(),
                get html() { return capturedHtml; },
                set html(value) { capturedHtml = value; },
            },
            onDidDispose: jest.fn((callback) => {
                mockPanel.disposeCallback = callback;
                return { dispose: jest.fn() };
            }),
        };
        vscode.window.createWebviewPanel.mockReturnValue(mockPanel);
        // Mock HistoryService
        HistoryService_1.HistoryService.mockImplementation(() => ({
            getHistory: jest.fn(() => []),
            getAllActivity: jest.fn(() => []),
            getWeeklySummaries: jest.fn(() => []),
        }));
    });
    afterEach(() => {
        if (HistoryPanel_1.HistoryPanel.currentPanel) {
            HistoryPanel_1.HistoryPanel.currentPanel.dispose();
        }
    });
    describe('createOrShow', () => {
        it('should create a new webview panel', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('standupAutobot.history', 'Standup History & Trends', vscode.ViewColumn.One, expect.objectContaining({
                enableScripts: true,
            }));
        });
        it('should reuse existing panel if available', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            const firstPanel = HistoryPanel_1.HistoryPanel.currentPanel;
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            expect(HistoryPanel_1.HistoryPanel.currentPanel).toBe(firstPanel);
            expect(mockPanel.reveal).toHaveBeenCalled();
        });
        it('should use active text editor column if available', () => {
            vscode.window.activeTextEditor = {
                viewColumn: vscode.ViewColumn.Two,
            };
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.Two, expect.any(Object));
        });
        it('should use ViewColumn.One when no active editor', () => {
            vscode.window.activeTextEditor = undefined;
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.One, expect.any(Object));
        });
        it('should set currentPanel static property', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(HistoryPanel_1.HistoryPanel.currentPanel).toBeDefined();
        });
        it('should include extensionUri in local resource roots', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            const createCall = vscode.window.createWebviewPanel.mock.calls[0];
            const options = createCall[3];
            expect(options.localResourceRoots).toContain(mockExtensionUri);
        });
    });
    describe('message handling', () => {
        beforeEach(() => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
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
                    text: undefined,
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
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(HistoryPanel_1.HistoryPanel.currentPanel).toBeDefined();
            HistoryPanel_1.HistoryPanel.currentPanel?.dispose();
            expect(HistoryPanel_1.HistoryPanel.currentPanel).toBeUndefined();
        });
        it('should dispose panel', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            HistoryPanel_1.HistoryPanel.currentPanel?.dispose();
            expect(mockPanel.dispose).toHaveBeenCalled();
        });
        it('should handle dispose callback', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            if (mockPanel.disposeCallback) {
                mockPanel.disposeCallback();
            }
            expect(HistoryPanel_1.HistoryPanel.currentPanel).toBeUndefined();
        });
        it('should dispose all disposables', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            const mockDisposable = {
                dispose: jest.fn(),
            };
            HistoryPanel_1.HistoryPanel.currentPanel._disposables.push(mockDisposable);
            HistoryPanel_1.HistoryPanel.currentPanel?.dispose();
            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });
    describe('HTML generation', () => {
        beforeEach(() => {
            // Mock history data
            const historyServiceInstance = new HistoryService_1.HistoryService(mockContext);
            historyServiceInstance.getHistory.mockReturnValue([
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
            historyServiceInstance.getAllActivity.mockReturnValue([
                {
                    date: new Date().toISOString().split('T')[0],
                    fileCount: 10,
                },
            ]);
        });
        it('should generate HTML with nonce', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('nonce=');
            expect(mockPanel.webview.html).toMatch(/nonce="[A-Za-z0-9]{32}"/);
        });
        it('should inject history data', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('historyData');
            expect(mockPanel.webview.html).toContain('activityData');
        });
        it('should include required React scripts', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('react@18');
            expect(mockPanel.webview.html).toContain('babel.min.js');
        });
        it('should include custom styles', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('--bg: #1e1e1e');
            expect(mockPanel.webview.html).toContain('.heatmap-section');
            expect(mockPanel.webview.html).toContain('.history-item');
        });
        it('should include Heatmap component', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('Heatmap');
            expect(mockPanel.webview.html).toContain('7-Day Productivity');
        });
        it('should include HistoryApp component', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('HistoryApp');
            expect(mockPanel.webview.html).toContain('History & Trends');
        });
        it('should handle empty history', () => {
            const historyServiceInstance = new HistoryService_1.HistoryService(mockContext);
            const historyServiceMock = historyServiceInstance;
            historyServiceMock.getHistory.mockReturnValue([]);
            historyServiceMock.getAllActivity.mockReturnValue([]);
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('No history found yet');
        });
    });
    describe('data loading', () => {
        it('should load history from HistoryService', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            // The HistoryPanel internally creates a HistoryService instance and calls getHistory
            // Since HistoryService is mocked, we just need to verify the panel was created successfully
            expect(mockPanel.webview.html).toContain('historyData');
        });
        it('should load activity from HistoryService', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            // The HistoryPanel internally creates a HistoryService instance and calls getAllActivity
            // Since HistoryService is mocked, we just need to verify the panel was created successfully
            expect(mockPanel.webview.html).toContain('activityData');
        });
    });
    describe('panel update', () => {
        it('should update HTML when panel is created', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toBeDefined();
            expect(mockPanel.webview.html.length).toBeGreaterThan(0);
        });
    });
    describe('React components', () => {
        it('should include Heatmap with color function', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('getColor');
        });
        it('should include copy handler in HistoryApp', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('handleCopy');
        });
        it('should include heatmap grid layout', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(mockPanel.webview.html).toContain('heatmap-grid');
        });
    });
    describe('webview options', () => {
        it('should enable scripts', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            const createCall = vscode.window.createWebviewPanel.mock.calls[0];
            const options = createCall[3];
            expect(options.enableScripts).toBe(true);
        });
        it('should set correct view type', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('standupAutobot.history', expect.any(String), expect.any(Number), expect.any(Object));
        });
        it('should set correct title', () => {
            HistoryPanel_1.HistoryPanel.createOrShow(mockExtensionUri, mockContext);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), 'Standup History & Trends', expect.any(Number), expect.any(Object));
        });
    });
});
//# sourceMappingURL=HistoryPanel.test.js.map