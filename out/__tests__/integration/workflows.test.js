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
const standupGenerator_1 = require("../../services/standupGenerator");
const activityTracker_1 = require("../../trackers/activityTracker");
const gitTracker_1 = require("../../trackers/gitTracker");
const HistoryService_1 = require("../../services/HistoryService");
const vscode = __importStar(require("vscode"));
// Mock VS Code API
jest.mock('vscode');
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('Integration Tests', () => {
    describe('End-to-End Activity Tracking and Standup Generation', () => {
        let activityTracker;
        let gitTracker;
        let historyService;
        let standupGenerator;
        let mockContext;
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
                environmentVariableCollection: {},
                asAbsolutePath: (path) => path,
                executeCommand: jest.fn(),
                secrets: {}
            };
            // Initialize services
            activityTracker = new activityTracker_1.ActivityTracker(mockContext);
            gitTracker = new gitTracker_1.GitTracker();
            historyService = new HistoryService_1.HistoryService(mockContext);
            standupGenerator = new standupGenerator_1.StandupGenerator();
            // Mock workspace
            vscode.workspace.workspaceFolders = [{
                    uri: vscode.Uri.file('/test/workspace'),
                    name: 'test-workspace',
                    index: 0
                }];
            // Mock configuration
            vscode.workspace.getConfiguration.mockReturnValue({
                get: jest.fn((key) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'ignorePatterns')
                        return ['**/node_modules/**'];
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
            };
            const onActiveEditorCallback = vscode.window.onDidChangeActiveTextEditor.mock.calls[0][0];
            onActiveEditorCallback(mockEditor);
            // 2. Get activity data
            const topFiles = activityTracker.getTopFiles(5);
            // 3. Mock git commits (simplified for integration test)
            const commits = [];
            // 4. Prepare data for standup generation
            const activityData = {
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
            const standup = await standupGenerator.generateStandup(activityData, 'test-api-key', { tone: 'casual', outputLanguage: 'English' });
            // 7. Save to history
            await historyService.saveStandup(standup);
            // Verify
            expect(standup).toBe('Generated standup summary');
            expect(mockContext.globalState.update).toHaveBeenCalledWith('standup.history', expect.any(Array));
        });
        it('should handle errors gracefully in standup workflow', async () => {
            // 1. Mock API failure
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: { message: 'Invalid API key' } })
            });
            // 2. Try to generate standup with invalid API key
            const activityData = {
                topFiles: [],
                commits: [],
                commands: []
            };
            await expect(standupGenerator.generateStandup(activityData, 'invalid-key', { tone: 'casual', outputLanguage: 'English' })).rejects.toThrow();
            // Verify error was handled
            expect(mockFetch).toHaveBeenCalled();
        });
    });
    describe('Export Workflows', () => {
        it('should generate standup and prepare for export', async () => {
            const generator = new standupGenerator_1.StandupGenerator();
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
            const activityData = {
                topFiles: [
                    { file: 'src/feature.ts', timeSpent: '30 mins', linesChanged: 50 }
                ],
                commits: [],
                commands: []
            };
            const standup = await generator.generateStandup(activityData, 'test-key', { tone: 'casual', outputLanguage: 'English' });
            expect(standup).toContain('Completed');
            expect(standup).toContain('In Progress');
            // Verify it can be exported (format is valid)
            expect(typeof standup).toBe('string');
            expect(standup.length).toBeGreaterThan(0);
        });
    });
    describe('Data Persistence Workflow', () => {
        let historyService;
        let mockContext;
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
                environmentVariableCollection: {},
                asAbsolutePath: (path) => path,
                executeCommand: jest.fn(),
                secrets: {}
            };
            historyService = new HistoryService_1.HistoryService(mockContext);
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
                tone: 'casual',
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
                tone: 'formal',
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
//# sourceMappingURL=workflows.test.js.map