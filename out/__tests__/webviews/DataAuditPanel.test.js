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
const DataAuditPanel_1 = require("../../webviews/DataAuditPanel");
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
            showErrorMessage: jest.fn(),
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
    };
});
describe('DataAuditPanel', () => {
    let mockExtensionUri;
    let mockPanel;
    let mockOnConfirm;
    beforeEach(() => {
        jest.clearAllMocks();
        mockExtensionUri = {
            scheme: 'file',
            path: '/extension/path',
        };
        mockOnConfirm = jest.fn();
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
    });
    afterEach(() => {
        if (DataAuditPanel_1.DataAuditPanel.currentPanel) {
            DataAuditPanel_1.DataAuditPanel.currentPanel.dispose();
        }
    });
    describe('createOrShow', () => {
        const mockData = {
            topFiles: [{ file: 'test.ts', timeSpent: '10 mins' }],
            commits: [{ message: 'test commit', files: ['test.ts'] }],
            commands: ['npm test'],
        };
        it('should create a new webview panel', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('standupAutobot.dataAudit', 'Standup: Review Data', vscode.ViewColumn.One, expect.objectContaining({
                enableScripts: true,
            }));
        });
        it('should reuse existing panel if available', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            const firstPanel = DataAuditPanel_1.DataAuditPanel.currentPanel;
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBe(firstPanel);
            expect(mockPanel.reveal).toHaveBeenCalled();
        });
        it('should use active text editor column if available', () => {
            vscode.window.activeTextEditor = {
                viewColumn: vscode.ViewColumn.Two,
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.Two, expect.any(Object));
        });
        it('should use ViewColumn.One when no active editor', () => {
            vscode.window.activeTextEditor = undefined;
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.One, expect.any(Object));
        });
        it('should set currentPanel static property', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeDefined();
        });
        it('should include extensionUri in local resource roots', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            const createCall = vscode.window.createWebviewPanel.mock.calls[0];
            const options = createCall[3];
            expect(options.localResourceRoots).toContain(mockExtensionUri);
        });
        it('should pass onConfirm callback to constructor', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeDefined();
        });
    });
    describe('message handling', () => {
        const mockData = {
            topFiles: [],
            commits: [],
            commands: [],
        };
        beforeEach(() => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
        });
        describe('confirm command', () => {
            it('should call onConfirm callback', () => {
                const message = { command: 'confirm' };
                mockPanel.messageCallback(message);
                expect(mockOnConfirm).toHaveBeenCalled();
            });
            it('should dispose panel after confirm', () => {
                const message = { command: 'confirm' };
                mockPanel.messageCallback(message);
                expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeUndefined();
            });
        });
        describe('cancel command', () => {
            it('should not call onConfirm callback', () => {
                const message = { command: 'cancel' };
                mockPanel.messageCallback(message);
                expect(mockOnConfirm).not.toHaveBeenCalled();
            });
            it('should dispose panel after cancel', () => {
                const message = { command: 'cancel' };
                mockPanel.messageCallback(message);
                expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeUndefined();
            });
        });
        describe('unknown commands', () => {
            it('should ignore unknown commands', () => {
                const message = { command: 'unknownCommand' };
                expect(() => mockPanel.messageCallback(message)).not.toThrow();
            });
        });
    });
    describe('dispose', () => {
        const mockData = { topFiles: [], commits: [], commands: [] };
        it('should clear currentPanel static property', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeDefined();
            DataAuditPanel_1.DataAuditPanel.currentPanel?.dispose();
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeUndefined();
        });
        it('should dispose panel', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            DataAuditPanel_1.DataAuditPanel.currentPanel?.dispose();
            expect(mockPanel.dispose).toHaveBeenCalled();
        });
        it('should handle dispose callback', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            if (mockPanel.disposeCallback) {
                mockPanel.disposeCallback();
            }
            expect(DataAuditPanel_1.DataAuditPanel.currentPanel).toBeUndefined();
        });
        it('should dispose all disposables', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            const mockDisposable = {
                dispose: jest.fn(),
            };
            DataAuditPanel_1.DataAuditPanel.currentPanel._disposables.push(mockDisposable);
            DataAuditPanel_1.DataAuditPanel.currentPanel?.dispose();
            expect(mockDisposable.dispose).toHaveBeenCalled();
        });
    });
    describe('HTML generation', () => {
        it('should generate HTML with data', () => {
            const mockData = {
                topFiles: [{ file: 'test.ts', timeSpent: '10 mins' }],
                commits: [{ message: 'test', files: ['test.ts'] }],
                commands: ['npm test'],
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('test.ts');
            expect(mockPanel.webview.html).toContain('10 mins');
        });
        it('should include privacy audit title', () => {
            const mockData = { topFiles: [], commits: [], commands: [] };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('Privacy Audit: Review Your Data');
        });
        it('should include description text', () => {
            const mockData = { topFiles: [], commits: [], commands: [] };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('Google Gemini Flash');
        });
        it('should include confirm and cancel buttons', () => {
            const mockData = { topFiles: [], commits: [], commands: [] };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('confirm()');
            expect(mockPanel.webview.html).toContain('cancel()');
            expect(mockPanel.webview.html).toContain('Generate Anyway');
            expect(mockPanel.webview.html).toContain('Cancel');
        });
        it('should escape HTML in data', () => {
            const mockData = {
                topFiles: [],
                commits: [{ message: '<script>alert("xss")</script>', files: [] }],
                commands: [],
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('&lt;script&gt;');
            expect(mockPanel.webview.html).not.toContain('<script>alert');
        });
        it('should format JSON with indentation', () => {
            const mockData = {
                topFiles: [{ file: 'test.ts', timeSpent: '10 mins' }],
                commits: [],
                commands: [],
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('    ');
        });
        it('should include custom styles', () => {
            const mockData = { topFiles: [], commits: [], commands: [] };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('background-color: #1e1e1e');
            expect(mockPanel.webview.html).toContain('.btn-primary');
            expect(mockPanel.webview.html).toContain('.btn-secondary');
        });
        it('should include vscode API acquisition script', () => {
            const mockData = { topFiles: [], commits: [], commands: [] };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('acquireVsCodeApi()');
        });
    });
    describe('webview options', () => {
        const mockData = { topFiles: [], commits: [], commands: [] };
        it('should enable scripts', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            const createCall = vscode.window.createWebviewPanel.mock.calls[0];
            const options = createCall[3];
            expect(options.enableScripts).toBe(true);
        });
        it('should set correct view type', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('standupAutobot.dataAudit', expect.any(String), expect.any(Number), expect.any(Object));
        });
        it('should set correct title', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), 'Standup: Review Data', expect.any(Number), expect.any(Object));
        });
    });
    describe('edge cases', () => {
        it('should handle empty data object', () => {
            const mockData = {};
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toBeDefined();
            expect(mockPanel.webview.html.length).toBeGreaterThan(0);
        });
        it('should handle null data', () => {
            const mockData = null;
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('null');
        });
        it('should handle complex nested data', () => {
            const mockData = {
                topFiles: [
                    {
                        file: 'path/to/file.ts',
                        timeSpent: '15 mins',
                        metadata: { lines: 100, functions: 5 },
                    },
                ],
                commits: [
                    {
                        message: 'feat: add feature',
                        files: ['a.ts', 'b.ts'],
                        author: { name: 'Test', email: 'test@example.com' },
                    },
                ],
                commands: ['npm install', 'npm run build', 'npm test'],
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(mockPanel.webview.html).toContain('path/to/file.ts');
            expect(mockPanel.webview.html).toContain('15 mins');
            expect(mockPanel.webview.html).toContain('feat: add feature');
        });
        it('should handle special characters in data', () => {
            const mockData = {
                topFiles: [],
                commits: [{ message: 'Fix: "quotes" and \'apostrophes\' & ampersands', files: [] }],
                commands: [],
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            // JSON.stringify escapes quotes as \", not as &quot;
            expect(mockPanel.webview.html).toContain('\\\"quotes\\\"');
            expect(mockPanel.webview.html).toContain('&');
        });
    });
    describe('callback behavior', () => {
        const mockData = { topFiles: [], commits: [], commands: [] };
        it('should call onConfirm when confirm button is clicked', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            // Simulate confirm message from webview
            mockPanel.messageCallback({ command: 'confirm' });
            expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        });
        it('should not call onConfirm when cancel button is clicked', () => {
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            // Simulate cancel message from webview
            mockPanel.messageCallback({ command: 'cancel' });
            expect(mockOnConfirm).not.toHaveBeenCalled();
        });
        it('should handle onConfirm errors gracefully', () => {
            mockOnConfirm.mockImplementation(() => {
                throw new Error('Test error');
            });
            DataAuditPanel_1.DataAuditPanel.createOrShow(mockExtensionUri, mockData, mockOnConfirm);
            expect(() => mockPanel.messageCallback({ command: 'confirm' })).not.toThrow();
        });
    });
});
//# sourceMappingURL=DataAuditPanel.test.js.map