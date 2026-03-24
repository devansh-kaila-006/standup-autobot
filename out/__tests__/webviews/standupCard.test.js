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
const standupCard_1 = require("../../webviews/standupCard");
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
            showErrorMessage: jest.fn(),
        },
        ViewColumn: {
            One: 1,
            Two: 2,
            Three: 3,
        },
        Uri: {
            joinPath: jest.fn((uri, ...paths) => ({
                toString: () => paths.join('/'),
            })),
            parse: jest.fn(),
        },
        env: {
            clipboard: {
                writeText: jest.fn(),
            },
        },
        commands: {
            executeCommand: jest.fn(),
        },
        Disposable: {
            from: jest.fn(),
        },
    };
});
// Mock getNonce
jest.mock('../../utils/getNonce', () => ({
    getNonce: () => 'test-nonce-12345678',
}));
describe('StandupCardProvider', () => {
    let mockExtensionUri;
    let mockPanel;
    beforeEach(() => {
        jest.clearAllMocks();
        mockExtensionUri = {
            scheme: 'file',
            path: '/extension/path',
        };
        let capturedHtml = '';
        mockPanel = {
            viewColumn: vscode.ViewColumn.One,
            reveal: jest.fn(),
            dispose: jest.fn(),
            webview: {
                onDidReceiveMessage: jest.fn((callback) => {
                    // Store callback for testing
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
        // Clean up current panel
        if (standupCard_1.StandupCardProvider.currentPanel) {
            standupCard_1.StandupCardProvider.currentPanel.dispose();
        }
    });
    describe('createOrShow', () => {
        it('should create a new webview panel', () => {
            const markdown = '# Test Standup';
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith('standupAutobot.standupCard', 'Standup Summary', vscode.ViewColumn.One, expect.objectContaining({
                enableScripts: true,
                retainContextWhenHidden: true,
            }));
        });
        it('should reuse existing panel if available', () => {
            const markdown1 = '# First Standup';
            const markdown2 = '# Second Standup';
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown1);
            const firstPanel = standupCard_1.StandupCardProvider.currentPanel;
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown2);
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            expect(standupCard_1.StandupCardProvider.currentPanel).toBe(firstPanel);
            expect(mockPanel.reveal).toHaveBeenCalled();
        });
        it('should use active text editor column if available', () => {
            vscode.window.activeTextEditor = {
                viewColumn: vscode.ViewColumn.Two,
            };
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.Two, expect.any(Object));
        });
        it('should use ViewColumn.One when no active editor', () => {
            vscode.window.activeTextEditor = undefined;
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(expect.any(String), expect.any(String), vscode.ViewColumn.One, expect.any(Object));
        });
        it('should set currentPanel static property', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(standupCard_1.StandupCardProvider.currentPanel).toBeDefined();
        });
    });
    describe('message handling', () => {
        beforeEach(() => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, '# Test Standup');
        });
        describe('copyToClipboard', () => {
            it('should copy text to clipboard', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: 'Test standup text',
                };
                await mockPanel.messageCallback(message);
                expect(vscode.env.clipboard.writeText).toHaveBeenCalledWith('Test standup text');
                expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('Standup copied to clipboard!');
            });
            it('should send confirmation message to webview', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: 'Test',
                };
                await mockPanel.messageCallback(message);
                expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
                    command: 'actionConfirmation',
                    type: 'copy',
                });
            });
            it('should show error message on clipboard failure', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: 'Test',
                };
                vscode.env.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
                await mockPanel.messageCallback(message);
                expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to copy to clipboard');
            });
            it('should handle missing text gracefully', async () => {
                const message = {
                    command: 'copyToClipboard',
                    text: '',
                };
                await mockPanel.messageCallback(message);
                expect(vscode.env.clipboard.writeText).not.toHaveBeenCalled();
            });
        });
        describe('copyToTeams', () => {
            it('should execute copyForTeams command', async () => {
                const message = {
                    command: 'copyToTeams',
                    text: 'Test standup',
                };
                await mockPanel.messageCallback(message);
                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.copyForTeams', 'Test standup');
            });
            it('should send confirmation message to webview', async () => {
                const message = {
                    command: 'copyToTeams',
                    text: 'Test',
                };
                await mockPanel.messageCallback(message);
                expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
                    command: 'actionConfirmation',
                    type: 'teams',
                });
            });
            it('should show error message on failure', async () => {
                const message = {
                    command: 'copyToTeams',
                    text: 'Test',
                };
                vscode.commands.executeCommand.mockRejectedValue(new Error('Command error'));
                await mockPanel.messageCallback(message);
                expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to copy for Teams');
            });
        });
        describe('sendEmail', () => {
            it('should execute sendEmail command', async () => {
                const message = {
                    command: 'sendEmail',
                    text: 'Test standup',
                };
                await mockPanel.messageCallback(message);
                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.sendEmail', 'Test standup');
            });
            it('should send confirmation message to webview', async () => {
                const message = {
                    command: 'sendEmail',
                    text: 'Test',
                };
                // Mock executeCommand to return a resolved promise
                vscode.commands.executeCommand.mockResolvedValue(undefined);
                await mockPanel.messageCallback(message);
                expect(mockPanel.webview.postMessage).toHaveBeenCalledWith({
                    command: 'actionConfirmation',
                    type: 'email',
                });
            });
            it('should show error message on failure', async () => {
                const message = {
                    command: 'sendEmail',
                    text: 'Test',
                };
                vscode.commands.executeCommand.mockRejectedValue(new Error('Email error'));
                await mockPanel.messageCallback(message);
                expect(vscode.window.showErrorMessage).toHaveBeenCalledWith('Failed to open email client');
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
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(standupCard_1.StandupCardProvider.currentPanel).toBeDefined();
            standupCard_1.StandupCardProvider.currentPanel?.dispose();
            expect(standupCard_1.StandupCardProvider.currentPanel).toBeUndefined();
        });
        it('should dispose panel', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            standupCard_1.StandupCardProvider.currentPanel?.dispose();
            expect(mockPanel.dispose).toHaveBeenCalled();
        });
        it('should handle dispose callback', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            if (mockPanel.disposeCallback) {
                mockPanel.disposeCallback();
            }
            expect(standupCard_1.StandupCardProvider.currentPanel).toBeUndefined();
        });
    });
    describe('HTML generation', () => {
        it('should generate HTML with nonce', () => {
            const markdown = '# Test';
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown);
            expect(mockPanel.webview.html).toContain('nonce-');
            expect(mockPanel.webview.html).toContain('test-nonce-12345678');
        });
        it('should inject initial markdown', () => {
            const markdown = '# Test Standup\n\n- Item 1\n- Item 2';
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown);
            expect(mockPanel.webview.html).toContain('window.initialMarkdown');
            expect(mockPanel.webview.html).toContain('# Test Standup');
        });
        it('should include CSP meta tag', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(mockPanel.webview.html).toContain('Content-Security-Policy');
        });
        it('should include required scripts', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(mockPanel.webview.html).toContain('tailwindcss.com');
            expect(mockPanel.webview.html).toContain('react@18');
            expect(mockPanel.webview.html).toContain('babel.min.js');
            expect(mockPanel.webview.html).toContain('marked.min.js');
        });
        it('should include custom styles', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            expect(mockPanel.webview.html).toContain('::-webkit-scrollbar');
            expect(mockPanel.webview.html).toContain('.prose');
        });
    });
    describe('panel update', () => {
        it('should update markdown when calling createOrShow with existing panel', () => {
            const markdown1 = '# First';
            const markdown2 = '# Second';
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown1);
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, markdown2);
            expect(mockPanel.webview.html).toContain('# Second');
        });
    });
    describe('local resource roots', () => {
        it('should include media directory in local resource roots', () => {
            standupCard_1.StandupCardProvider.createOrShow(mockExtensionUri, 'Test');
            const createCall = vscode.window.createWebviewPanel.mock.calls[0];
            const options = createCall[3];
            expect(options.localResourceRoots).toBeDefined();
        });
    });
});
//# sourceMappingURL=standupCard.test.js.map