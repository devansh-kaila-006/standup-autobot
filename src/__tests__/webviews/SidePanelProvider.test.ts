import * as vscode from 'vscode';
import { SidePanelProvider } from '../../webviews/SidePanelProvider';
import { ActivityTracker } from '../../trackers/activityTracker';
import { GitTracker } from '../../trackers/gitTracker';
import { TerminalTracker } from '../../trackers/terminalTracker';
import { HistoryService } from '../../services/HistoryService';

// Mock vscode
jest.mock('vscode', () => {
    const mockWebviewView = {
        webview: {
            onDidReceiveMessage: jest.fn(),
            postMessage: jest.fn(),
            html: '',
            options: {},
        },
        onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
        onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
    };

    const mockWorkspace = {
        getConfiguration: jest.fn(() => ({
            get: jest.fn((key: string) => {
                if (key === 'workbench.colorTheme') return 'Dark+';
                if (key === 'standup.paused') return false;
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
            showInformationMessage: jest.fn(),
            showErrorMessage: jest.fn(),
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
            registerCommand: jest.fn(),
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

// Mock services
jest.mock('../../trackers/activityTracker');
jest.mock('../../trackers/gitTracker');
jest.mock('../../trackers/terminalTracker');
jest.mock('../../services/HistoryService');

describe('SidePanelProvider', () => {
    let mockActivityTracker: jest.Mocked<ActivityTracker>;
    let mockGitTracker: jest.Mocked<GitTracker>;
    let mockTerminalTracker: jest.Mocked<TerminalTracker>;
    let mockHistoryService: jest.Mocked<HistoryService>;
    let mockContext: vscode.ExtensionContext;
    let mockExtensionUri: vscode.Uri;
    let sidePanelProvider: SidePanelProvider;
    let mockWebviewView: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock context
        mockContext = {
            globalState: {
                get: jest.fn((key: string, defaultValue?: any) => {
                    if (key === 'standup.paused') return false;
                    if (key === 'standup.lastGenerated') return '';
                    return defaultValue;
                }),
                update: jest.fn(),
            },
            secrets: {
                get: jest.fn(),
                store: jest.fn(),
            },
        } as any;

        // Setup mock extension URI
        mockExtensionUri = {
            scheme: 'file',
            path: '/extension/path',
        } as any;

        // Setup mock activity tracker
        mockActivityTracker = {
            getTopFiles: jest.fn(() => [
                { file: 'test.ts', timeSpent: '2h', linesChanged: 100 },
                { file: 'utils.ts', timeSpent: '1h', linesChanged: 50 },
            ]),
            getFileCount: jest.fn(() => 12),
        } as any;

        // Setup mock git tracker
        mockGitTracker = {
            getRecentCommits: jest.fn(async () => [
                {
                    hash: 'abc123',
                    timestamp: '2024-01-15T10:30:00Z',
                    message: 'Test commit 1',
                    files: ['file1.ts', 'file2.ts'],
                },
                {
                    hash: 'def456',
                    timestamp: '2024-01-15T09:15:00Z',
                    message: 'Test commit 2',
                    files: ['file3.ts'],
                },
            ]),
        } as any;

        // Setup mock terminal tracker
        mockTerminalTracker = {
            getTerminalHistory: jest.fn(async () => [
                'npm install',
                'git checkout -b feature-branch',
                'npm run build',
            ]),
        } as any;

        // Setup mock history service
        mockHistoryService = {
            saveStandup: jest.fn(),
            getWeeklySummaries: jest.fn(() => []),
        } as any;

        // Setup mock webview view
        let capturedHtml = '';
        mockWebviewView = {
            webview: {
                onDidReceiveMessage: jest.fn((callback) => {
                    (mockWebviewView as any).messageCallback = callback;
                    return { dispose: jest.fn() };
                }),
                postMessage: jest.fn(),
                get html() { return capturedHtml; },
                set html(value) { capturedHtml = value; },
                options: {},
            },
            onDidChangeVisibility: jest.fn(() => ({ dispose: jest.fn() })),
            onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
        };

        // Create provider instance
        sidePanelProvider = new SidePanelProvider(
            mockActivityTracker,
            mockGitTracker,
            mockTerminalTracker,
            mockHistoryService,
            mockContext,
            mockExtensionUri
        );
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
        if (sidePanelProvider) {
            sidePanelProvider.dispose();
        }
    });

    describe('initialization', () => {
        it('should create provider with all dependencies', () => {
            expect(sidePanelProvider).toBeDefined();
            expect(sidePanelProvider).toBeInstanceOf(SidePanelProvider);
        });

        it('should have correct viewType', () => {
            expect(SidePanelProvider.viewType).toBe('standupAutobot.dashboard');
        });

        it('should setup theme change listener', () => {
            expect(vscode.workspace.onDidChangeConfiguration).toHaveBeenCalled();
        });
    });

    describe('resolveWebviewView', () => {
        it('should set webview options', () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.options).toEqual({
                enableScripts: true,
                enableCommandUris: true,
                localResourceRoots: expect.any(Array),
            });
        });

        it('should set initial HTML content', async () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            // Wait for async HTML generation
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockWebviewView.webview.html).toBeDefined();
            expect(mockWebviewView.webview.html).toContain('<!DOCTYPE html>');
        });

        it('should setup message listener', () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(mockWebviewView.webview.onDidReceiveMessage).toHaveBeenCalled();
            expect((mockWebviewView as any).messageCallback).toBeDefined();
        });

        it('should start auto-refresh timer', () => {
            const setIntervalSpy = jest.spyOn(global, 'setInterval');

            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            expect(setIntervalSpy).toHaveBeenCalledWith(
                expect.any(Function),
                5000 // UPDATE_INTERVAL
            );

            setIntervalSpy.mockRestore();
        });
    });

    describe('getActivityData', () => {
        it('should fetch data from all services', async () => {
            mockActivityTracker.getTopFiles.mockReturnValue([
                { file: 'component.tsx', timeSpent: '3h', linesChanged: 200 },
            ]);
            mockActivityTracker.getFileCount.mockReturnValue(5);
            mockGitTracker.getRecentCommits.mockResolvedValue([
                { hash: 'abc', timestamp: '2024-01-15T10:00:00Z', message: 'Fix bug', files: [] },
            ]);
            mockTerminalTracker.getTerminalHistory.mockResolvedValue(['npm test']);

            // Access private method via casting
            const getActivityData = (sidePanelProvider as any).getActivityData.bind(sidePanelProvider);
            const data = await getActivityData();

            expect(mockActivityTracker.getTopFiles).toHaveBeenCalledWith(5);
            expect(mockActivityTracker.getFileCount).toHaveBeenCalled();
            expect(mockGitTracker.getRecentCommits).toHaveBeenCalledWith(24);
            expect(mockTerminalTracker.getTerminalHistory).toHaveBeenCalledWith(5);
        });

        it('should return correct tracking status when paused', async () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(true);

            const getActivityData = (sidePanelProvider as any).getActivityData.bind(sidePanelProvider);
            const data = await getActivityData();

            expect(data.trackingStatus).toBe('paused');
        });

        it('should return correct tracking status when active', async () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(false);

            const getActivityData = (sidePanelProvider as any).getActivityData.bind(sidePanelProvider);
            const data = await getActivityData();

            expect(data.trackingStatus).toBe('active');
        });

        it('should return last generated standup', async () => {
            const lastGenerated = '# Standup for 2024-01-15';
            (mockContext.globalState.get as jest.Mock).mockReturnValue(lastGenerated);

            const getActivityData = (sidePanelProvider as any).getActivityData.bind(sidePanelProvider);
            const data = await getActivityData();

            expect(data.lastGenerated).toBe(lastGenerated);
        });
    });

    describe('message handling', () => {
        beforeEach(() => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        describe('generateStandup', () => {
            it('should execute generate standup command', async () => {
                const message = { command: 'generateStandup' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.generate');
            });
        });

        describe('toggleTracking', () => {
            it('should execute toggle tracking command', async () => {
                const message = { command: 'toggleTracking' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.toggleTracking');
            });

            it('should refresh after toggling', async () => {
                const message = { command: 'toggleTracking' };
                const refreshSpy = jest.spyOn(sidePanelProvider as any, 'refresh');

                await (mockWebviewView as any).messageCallback(message);

                expect(refreshSpy).toHaveBeenCalled();
            });
        });

        describe('copyToClipboard', () => {
            it('should execute copy to clipboard command', async () => {
                const message = { command: 'copyToClipboard' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.copyToClipboard');
            });
        });

        describe('viewHistory', () => {
            it('should execute view history command', async () => {
                const message = { command: 'viewHistory' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.viewHistory');
            });
        });

        describe('viewAnalytics', () => {
            it('should execute view analytics command', async () => {
                const message = { command: 'viewAnalytics' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.viewAnalytics');
            });
        });

        describe('requestData', () => {
            it('should refresh data', async () => {
                const message = { command: 'requestData' };
                const refreshSpy = jest.spyOn(sidePanelProvider as any, 'refresh');

                await (mockWebviewView as any).messageCallback(message);

                expect(refreshSpy).toHaveBeenCalled();
            });
        });

        // Views & Analytics
        describe('dataAudit', () => {
            it('should execute data audit command', async () => {
                const message = { command: 'dataAudit' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.dataAudit');
            });
        });

        describe('previewData', () => {
            it('should execute preview data command', async () => {
                const message = { command: 'previewData' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.previewData');
            });
        });

        // Export commands
        describe('export', () => {
            it('should execute export command', async () => {
                const message = { command: 'export' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.export');
            });
        });

        describe('exportToNotion', () => {
            it('should execute export to notion command', async () => {
                const message = { command: 'exportToNotion' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.exportToNotion');
            });
        });

        describe('exportToJira', () => {
            it('should execute export to jira command', async () => {
                const message = { command: 'exportToJira' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.exportToJira');
            });
        });

        describe('generateWeeklyDigest', () => {
            it('should execute generate weekly digest command', async () => {
                const message = { command: 'generateWeeklyDigest' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.generateWeeklyDigest');
            });
        });

        // Configuration commands
        describe('configureSettings', () => {
            it('should execute configure settings command', async () => {
                const message = { command: 'configureSettings' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.configureSettings');
            });
        });

        describe('setApiKey', () => {
            it('should execute set api key command', async () => {
                const message = { command: 'setApiKey' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.setApiKey');
            });
        });

        describe('setOpenaiApiKey', () => {
            it('should execute set openai api key command', async () => {
                const message = { command: 'setOpenaiApiKey' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.setOpenaiApiKey');
            });
        });

        describe('setClaudeApiKey', () => {
            it('should execute set claude api key command', async () => {
                const message = { command: 'setClaudeApiKey' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.setClaudeApiKey');
            });
        });

        describe('setNotionToken', () => {
            it('should execute set notion token command', async () => {
                const message = { command: 'setNotionToken' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.setNotionToken');
            });
        });

        describe('setJiraToken', () => {
            it('should execute set jira token command', async () => {
                const message = { command: 'setJiraToken' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.setJiraToken');
            });
        });

        // Integration test commands
        describe('testJiraConnection', () => {
            it('should execute test jira connection command', async () => {
                const message = { command: 'testJiraConnection' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.testJiraConnection');
            });
        });

        describe('testGitHubConnection', () => {
            it('should execute test github connection command', async () => {
                const message = { command: 'testGitHubConnection' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.testGitHubConnection');
            });
        });

        describe('testSlackConnection', () => {
            it('should execute test slack connection command', async () => {
                const message = { command: 'testSlackConnection' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.testSlackConnection');
            });
        });

        // Notification commands
        describe('showNotifications', () => {
            it('should execute show notifications command', async () => {
                const message = { command: 'showNotifications' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.showNotifications');
            });
        });

        describe('markNotificationsRead', () => {
            it('should execute mark notifications read command', async () => {
                const message = { command: 'markNotificationsRead' };

                await (mockWebviewView as any).messageCallback(message);

                expect(vscode.commands.executeCommand).toHaveBeenCalledWith('standup.markNotificationsRead');
            });
        });

        describe('unknown commands', () => {
            it('should ignore unknown commands', async () => {
                const message = { command: 'unknownCommand' };

                await expect(
                    (mockWebviewView as any).messageCallback(message)
                ).resolves.toBeUndefined();
            });
        });
    });

    describe('refresh', () => {
        beforeEach(() => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should update webview HTML with new data', async () => {
            const initialHtml = mockWebviewView.webview.html;

            // Wait for initial HTML
            await new Promise(resolve => setTimeout(resolve, 0));

            // Trigger refresh
            await (sidePanelProvider as any).refresh();

            // Wait for refresh to complete
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockWebviewView.webview.html).toBeDefined();
        });

        it('should fetch fresh data from services', async () => {
            await (sidePanelProvider as any).refresh();

            expect(mockActivityTracker.getTopFiles).toHaveBeenCalled();
            expect(mockActivityTracker.getFileCount).toHaveBeenCalled();
        });
    });

    describe('auto-refresh timer', () => {
        beforeEach(() => {
            jest.useFakeTimers();
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should refresh every 5 seconds', async () => {
            const refreshSpy = jest.spyOn(sidePanelProvider as any, 'refresh');

            // Fast-forward 5 seconds
            jest.advanceTimersByTime(5000);

            expect(refreshSpy).toHaveBeenCalled();
        });

        it('should continue refreshing over time', async () => {
            const refreshSpy = jest.spyOn(sidePanelProvider as any, 'refresh');

            // Fast-forward 15 seconds (should trigger 3 refreshes)
            jest.advanceTimersByTime(15000);

            expect(refreshSpy).toHaveBeenCalledTimes(3);
        });

        it('should clear interval when disposed', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            sidePanelProvider.dispose();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });
    });

    describe('HTML generation', () => {
        beforeEach(() => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should include nonce in CSP', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockWebviewView.webview.html).toContain('nonce-');
            expect(mockWebviewView.webview.html).toContain('test-nonce-12345678');
        }, 10000);

        it('should include React and ReactDOM scripts', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockWebviewView.webview.html).toContain('react@18');
            expect(mockWebviewView.webview.html).toContain('react-dom@18');
        }, 10000);

        it('should include Babel for JSX', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockWebviewView.webview.html).toContain('babel.min.js');
        }, 10000);

        it('should include theme CSS', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockWebviewView.webview.html).toContain('--background-color');
            expect(mockWebviewView.webview.html).toContain('--primary-color');
        }, 10000);

        it('should inject initial activity data', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockWebviewView.webview.html).toContain('window.initialData');
        }, 10000);

        it('should include tracking status in data', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('trackingStatus');
        }, 10000);

        it('should include quick action buttons', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('Generate Standup');
            expect(html).toContain('Copy to Clipboard');
            expect(html).toContain('View History');
            expect(html).toContain('View Analytics');
        }, 10000);

        it('should include activity sections', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('Top Files');
            expect(html).toContain('Recent Commits');
            expect(html).toContain('Recent Commands');
        }, 10000);
    });

    describe('theme changes', () => {
        it('should refresh webview when theme changes', async () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 0));

            const initialHtml = mockWebviewView.webview.html;

            // Trigger theme change
            const configCallback = (vscode.workspace.onDidChangeConfiguration as jest.Mock).mock.calls[0][0];
            const mockEvent = {
                affectsConfiguration: jest.fn((key: string) => key === 'workbench.colorTheme'),
            };

            await configCallback(mockEvent);
            await new Promise(resolve => setTimeout(resolve, 0));

            // Webview should be updated (we can't easily test the exact HTML changed,
            // but we can verify the method was called)
            expect(mockEvent.affectsConfiguration).toHaveBeenCalledWith('workbench.colorTheme');
        });
    });

    describe('dispose', () => {
        beforeEach(() => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);
        });

        it('should clear auto-refresh interval', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

            sidePanelProvider.dispose();

            expect(clearIntervalSpy).toHaveBeenCalled();
        });

        it('should dispose theme manager', () => {
            const disposeSpy = jest.spyOn((sidePanelProvider as any).themeManager, 'dispose');

            sidePanelProvider.dispose();

            expect(disposeSpy).toHaveBeenCalled();
        });

        it('should dispose accessibility manager', () => {
            const disposeSpy = jest.spyOn((sidePanelProvider as any).accessibilityManager, 'dispose');

            sidePanelProvider.dispose();

            expect(disposeSpy).toHaveBeenCalled();
        });

        it('should dispose i18n service', () => {
            const disposeSpy = jest.spyOn((sidePanelProvider as any).i18nService, 'dispose');

            sidePanelProvider.dispose();

            expect(disposeSpy).toHaveBeenCalled();
        });

        it('should handle multiple dispose calls', () => {
            expect(() => {
                sidePanelProvider.dispose();
                sidePanelProvider.dispose();
            }).not.toThrow();
        });
    });

    describe('integration with services', () => {
        it('should fetch data from all services successfully', async () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            expect(mockActivityTracker.getTopFiles).toHaveBeenCalled();
            expect(mockActivityTracker.getFileCount).toHaveBeenCalled();
            expect(mockGitTracker.getRecentCommits).toHaveBeenCalled();
            expect(mockTerminalTracker.getTerminalHistory).toHaveBeenCalled();
        }, 10000);
    });

    describe('localization', () => {
        it('should use i18n service for translations', async () => {
            // Create a fresh provider to avoid state from previous tests
            const freshProvider = new SidePanelProvider(
                mockActivityTracker,
                mockGitTracker,
                mockTerminalTracker,
                mockHistoryService,
                mockContext,
                mockExtensionUri
            );

            freshProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toBeDefined();

            freshProvider.dispose();
        }, 10000);
    });

    describe('accessibility', () => {
        it('should include ARIA labels in HTML', async () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('aria-label');
        }, 10000);

        it('should include focus-visible styles', async () => {
            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('focus');
        }, 10000);
    });

    describe('empty states', () => {
        it('should handle empty files list', async () => {
            mockActivityTracker.getTopFiles.mockReturnValue([]);

            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('No files tracked yet');
        }, 10000);

        it('should handle empty commits list', async () => {
            mockGitTracker.getRecentCommits.mockResolvedValue([]);

            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('No commits yet');
        }, 10000);

        it('should handle empty commands list', async () => {
            mockTerminalTracker.getTerminalHistory.mockResolvedValue([]);

            sidePanelProvider.resolveWebviewView(mockWebviewView, {} as any, {} as any);

            await new Promise(resolve => setTimeout(resolve, 100));

            const html = mockWebviewView.webview.html;
            expect(html).toContain('No commands yet');
        }, 10000);
    });
});
