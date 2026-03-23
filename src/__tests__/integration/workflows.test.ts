import { StandupGenerator, DeveloperActivityData } from '../../services/standupGenerator';
import { ActivityTracker } from '../../trackers/activityTracker';
import { GitTracker } from '../../trackers/gitTracker';
import { HistoryService } from '../../services/HistoryService';
import * as vscode from 'vscode';

// Mock VS Code API
jest.mock('vscode');
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('Integration Tests', () => {
    describe('End-to-End Activity Tracking and Standup Generation', () => {
        let activityTracker: ActivityTracker;
        let gitTracker: GitTracker;
        let historyService: HistoryService;
        let standupGenerator: StandupGenerator;
        let mockContext: vscode.ExtensionContext;

        beforeEach(() => {
            // Setup mock context
            mockContext = {
                globalState: {
                    get: jest.fn().mockReturnValue(false),
                    update: jest.fn(),
                    keys: []
                },
                workspaceState: {
                    get: jest.fn(),
                    update: jest.fn(),
                    keys: []
                },
                subscriptions: [],
                extensionPath: '',
                storageUri: undefined,
                globalStorageUri: undefined,
                logUri: undefined,
                extensionMode: vscode.ExtensionMode.Test,
                extensionUri: vscode.Uri.file(''),
                environmentVariableCollection: {} as any,
                asAbsolutePath: (path: string) => path,
                executeCommand: jest.fn(),
                secrets: {} as any
            } as any;

            // Initialize services
            activityTracker = new ActivityTracker(mockContext);
            gitTracker = new GitTracker();
            historyService = new HistoryService(mockContext);
            standupGenerator = new StandupGenerator();

            // Mock workspace
            (vscode.workspace.workspaceFolders as any) = [{
                uri: vscode.Uri.file('/test/workspace'),
                name: 'test-workspace',
                index: 0
            }];

            // Mock configuration
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn((key: string) => {
                    if (key === 'paused') return false;
                    if (key === 'ignorePatterns') return ['**/node_modules/**'];
                    return undefined;
                })
            });

            jest.clearAllMocks();
        });

        afterEach(() => {
            activityTracker.dispose();
        });

        it('should track activity and generate standup', async () => {
            // 1. Simulate file activity
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/workspace/src/app.ts'),
                    scheme: 'file'
                }
            } as any;

            const onActiveEditorCallback = (vscode.window.onDidChangeActiveTextEditor as jest.Mock).mock.calls[0][0];
            onActiveEditorCallback(mockEditor);

            // 2. Get activity data
            const topFiles = activityTracker.getTopFiles(5);

            // 3. Mock git commits (simplified for integration test)
            const commits: any[] = [];

            // 4. Prepare data for standup generation
            const activityData: DeveloperActivityData = {
                topFiles: topFiles.map(f => ({
                    file: f.file,
                    timeSpent: f.timeSpent,
                    linesChanged: f.linesChanged
                })),
                commits: commits,
                commands: []
            };

            // 5. Mock API response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: 'Generated standup summary' }]
                            }
                        }
                    ]
                })
            });

            // 6. Generate standup
            const standup = await standupGenerator.generateStandup(
                activityData,
                'test-api-key',
                { tone: 'casual', outputLanguage: 'English' }
            );

            // 7. Save to history
            await historyService.saveStandup(standup);

            // Verify
            expect(standup).toBe('Generated standup summary');
            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'standup.history',
                expect.any(Array)
            );
        });

        it('should handle errors gracefully in standup workflow', async () => {
            // 1. Mock API failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: { message: 'Invalid API key' } })
            });

            // 2. Try to generate standup with invalid API key
            const activityData: DeveloperActivityData = {
                topFiles: [],
                commits: [],
                commands: []
            };

            await expect(
                standupGenerator.generateStandup(
                    activityData,
                    'invalid-key',
                    { tone: 'casual', outputLanguage: 'English' }
                )
            ).rejects.toThrow();

            // Verify error was handled
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe('Export Workflows', () => {
        it('should generate standup and prepare for export', async () => {
            const generator = new StandupGenerator();

            // Mock API response
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    candidates: [
                        {
                            content: {
                                parts: [{ text: '**Completed:** Feature X\n**In Progress:** Feature Y' }]
                            }
                        }
                    ]
                })
            });

            const activityData: DeveloperActivityData = {
                topFiles: [
                    { file: 'src/feature.ts', timeSpent: '30 mins', linesChanged: 50 }
                ],
                commits: [],
                commands: []
            };

            const standup = await generator.generateStandup(
                activityData,
                'test-key',
                { tone: 'casual', outputLanguage: 'English' }
            );

            expect(standup).toContain('Completed');
            expect(standup).toContain('In Progress');

            // Verify it can be exported (format is valid)
            expect(typeof standup).toBe('string');
            expect(standup.length).toBeGreaterThan(0);
        });
    });

    describe('Data Persistence Workflow', () => {
        let historyService: HistoryService;
        let mockContext: vscode.ExtensionContext;

        beforeEach(() => {
            // Setup mock context
            mockContext = {
                globalState: {
                    get: jest.fn().mockReturnValue([]),
                    update: jest.fn(),
                    keys: []
                },
                workspaceState: {
                    get: jest.fn(),
                    update: jest.fn(),
                    keys: []
                },
                subscriptions: [],
                extensionPath: '',
                storageUri: undefined,
                globalStorageUri: undefined,
                logUri: undefined,
                extensionMode: vscode.ExtensionMode.Test,
                extensionUri: vscode.Uri.file(''),
                environmentVariableCollection: {} as any,
                asAbsolutePath: (path: string) => path,
                executeCommand: jest.fn(),
                secrets: {} as any
            } as any;

            historyService = new HistoryService(mockContext);
        });

        it('should persist and retrieve activity data', async () => {
            // Save multiple standups
            await historyService.saveStandup('Standup 1');
            await historyService.saveStandup('Standup 2');
            await historyService.saveStandup('Standup 3');

            // Get history
            const history = historyService.getHistory();

            // Verify
            expect(history).toHaveLength(3);
            expect(history[0].text).toBe('Standup 3'); // Most recent first
            expect(history[1].text).toBe('Standup 2');
            expect(history[2].text).toBe('Standup 1');

            // Get weekly summaries
            const weekly = historyService.getWeeklySummaries();
            expect(weekly.length).toBeGreaterThanOrEqual(3);
        });

        it('should track daily activity', async () => {
            // Log activity
            await historyService.logActivity(5);
            await historyService.logActivity(8);
            await historyService.logActivity(12);

            // Get activity
            const activity = historyService.getAllActivity();

            // Verify (should update today's entry, not create new ones)
            const today = new Date().toISOString().split('T')[0];
            const todayActivity = activity.find(a => a.date === today);

            expect(todayActivity).toBeDefined();
            expect(todayActivity?.fileCount).toBe(12); // Should be latest value
        });
    });

    describe('Configuration Workflow', () => {
        it('should validate and apply configuration', async () => {
            const { ConfigValidator } = require('../../utils/ConfigValidator');

            // Test configuration validation
            const validConfig = {
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual' as const,
                outputLanguage: 'English',
                ignorePatterns: ['**/node_modules/**'],
            };

            const validated = ConfigValidator.validateStandupConfig(validConfig);

            expect(validated.tone).toBe('casual');
            expect(validated.activityDuration).toBe(24);
        });

        it('should merge user config with defaults', async () => {
            const { ConfigValidator } = require('../../utils/ConfigValidator');

            const userConfig = {
                tone: 'formal' as const,
            };

            const merged = ConfigValidator.mergeWithDefaults(userConfig);

            expect(merged.tone).toBe('formal');
            expect(merged.activityDuration).toBe(24); // From defaults
        });
    });

    describe('Error Handling Workflow', () => {
        it('should handle and report errors properly', async () => {
            const { APIError, ConfigurationError, TrackingError } = require('../../utils/errors');

            // Test different error types
            const apiError = new APIError('API failed', 500, '/api/test');
            expect(apiError.getUserMessage()).toBeDefined();
            expect(apiError.statusCode).toBe(500);

            const configError = new ConfigurationError('Invalid config', 'apiKey');
            expect(configError.getUserMessage()).toContain('apiKey');

            const trackingError = new TrackingError('Git failed', 'git');
            expect(trackingError.getUserMessage()).toContain('Git');
        });

        it('should convert unknown errors to StandupError', async () => {
            const { toStandupError, isStandupError } = require('../../utils/errors');

            const regularError = new Error('Regular error');
            const standupError = toStandupError(regularError);

            expect(isStandupError(standupError)).toBe(true);
            expect(standupError.message).toBe('Regular error');
        });
    });
});
