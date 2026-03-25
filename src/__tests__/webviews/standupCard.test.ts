import * as vscode from 'vscode';
import { StandupCardProvider } from '../../webviews/standupCard';

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

    const mockWorkspace = {
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
    };

    return {
        workspace: mockWorkspace,
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
            joinPath: jest.fn((uri: any, ...paths: string[]) => ({
                toString: () => paths.join('/'),
            })),
            parse: jest.fn(),
        },
        env: {
            language: 'en',
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
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
            },
        } as any;

        let capturedHtml = '';
        mockPanel = {
            viewColumn: vscode.ViewColumn.One,
            reveal: jest.fn(),
            dispose: jest.fn(),
            webview: {
                onDidReceiveMessage: jest.fn((callback) => {
                    // Store callback for testing
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
    });

    afterEach(() => {
        // Clean up current panel
        if (StandupCardProvider.currentPanel) {
            StandupCardProvider.currentPanel.dispose();
        }
    });

    describe('createOrShow', () => {
        it('should create a new webview panel', () => {
            const markdown = '# Test Standup';

            StandupCardProvider.createOrShow(mockExtensionUri, markdown, mockContext);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                'standupAutobot.standupCard',
                'Standup Summary',
                vscode.ViewColumn.One,
                expect.objectContaining({
                    enableScripts: true,
                    retainContextWhenHidden: true,
                })
            );
        });

        it('should reuse existing panel if available', () => {
            const markdown1 = '# First Standup';
            const markdown2 = '# Second Standup';

            StandupCardProvider.createOrShow(mockExtensionUri, markdown1);
            const firstPanel = StandupCardProvider.currentPanel;

            StandupCardProvider.createOrShow(mockExtensionUri, markdown2);

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledTimes(1);
            expect(StandupCardProvider.currentPanel).toBe(firstPanel);
            expect(mockPanel.reveal).toHaveBeenCalled();
        });

        it('should use active text editor column if available', () => {
            vscode.window.activeTextEditor = {
                viewColumn: vscode.ViewColumn.Two,
            } as any;

            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                vscode.ViewColumn.Two,
                expect.any(Object)
            );
        });

        it('should use ViewColumn.One when no active editor', () => {
            vscode.window.activeTextEditor = undefined;

            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
                expect.any(String),
                expect.any(String),
                vscode.ViewColumn.One,
                expect.any(Object)
            );
        });

        it('should set currentPanel static property', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(StandupCardProvider.currentPanel).toBeDefined();
        });
    });

    describe('message handling', () => {
        beforeEach(() => {
            StandupCardProvider.createOrShow(mockExtensionUri, '# Test Standup');
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

                (vscode.env.clipboard.writeText as jest.Mock).mockRejectedValue(new Error('Clipboard error'));

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

                (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error('Command error'));

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
                (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);

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

                (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error('Email error'));

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
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(StandupCardProvider.currentPanel).toBeDefined();

            StandupCardProvider.currentPanel?.dispose();

            expect(StandupCardProvider.currentPanel).toBeUndefined();
        });

        it('should dispose panel', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            StandupCardProvider.currentPanel?.dispose();

            expect(mockPanel.dispose).toHaveBeenCalled();
        });

        it('should handle dispose callback', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            if (mockPanel.disposeCallback) {
                mockPanel.disposeCallback();
            }

            expect(StandupCardProvider.currentPanel).toBeUndefined();
        });
    });

    describe('HTML generation', () => {
        it('should generate HTML with nonce', () => {
            const markdown = '# Test';

            StandupCardProvider.createOrShow(mockExtensionUri, markdown, mockContext);

            expect(mockPanel.webview.html).toContain('nonce-');
            expect(mockPanel.webview.html).toContain('test-nonce-12345678');
        });

        it('should inject initial markdown', () => {
            const markdown = '# Test Standup\n\n- Item 1\n- Item 2';

            StandupCardProvider.createOrShow(mockExtensionUri, markdown, mockContext);

            expect(mockPanel.webview.html).toContain('window.initialMarkdown');
            expect(mockPanel.webview.html).toContain('# Test Standup');
        });

        it('should include CSP meta tag', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(mockPanel.webview.html).toContain('Content-Security-Policy');
        });

        it('should include required scripts', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(mockPanel.webview.html).toContain('tailwindcss.com');
            expect(mockPanel.webview.html).toContain('react@18');
            expect(mockPanel.webview.html).toContain('babel.min.js');
            expect(mockPanel.webview.html).toContain('marked.min.js');
        });

        it('should include custom styles', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            expect(mockPanel.webview.html).toContain('::-webkit-scrollbar');
            expect(mockPanel.webview.html).toContain('.prose');
        });
    });

    describe('panel update', () => {
        it('should update markdown when calling createOrShow with existing panel', () => {
            const markdown1 = '# First';
            const markdown2 = '# Second';

            StandupCardProvider.createOrShow(mockExtensionUri, markdown1);
            StandupCardProvider.createOrShow(mockExtensionUri, markdown2);

            expect(mockPanel.webview.html).toContain('# Second');
        });
    });

    describe('local resource roots', () => {
        it('should include media directory in local resource roots', () => {
            StandupCardProvider.createOrShow(mockExtensionUri, 'Test');

            const createCall = (vscode.window.createWebviewPanel as jest.Mock).mock.calls[0];
            const options = createCall[3];

            expect(options.localResourceRoots).toBeDefined();
        });
    });
});
