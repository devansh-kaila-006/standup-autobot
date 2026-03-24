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
const activityTracker_1 = require("../../trackers/activityTracker");
const vscode = __importStar(require("vscode"));
const ignore_1 = require("../../utils/ignore");
const ConfigManager_1 = require("../../utils/ConfigManager");
const vscode_1 = require("../../__mocks__/vscode");
// Mock dependencies
jest.mock('../../utils/ignore');
jest.mock('../../utils/ConfigManager');
describe('ActivityTracker', () => {
    let tracker;
    let mockContext;
    beforeEach(() => {
        // Mock VS Code extension context
        mockContext = {
            globalState: {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'standup.paused')
                        return false;
                    if (key === 'activityTrackerData')
                        return undefined;
                    return defaultValue;
                }),
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
        // Mock default behaviors
        ignore_1.isIgnored.mockReturnValue(false);
        ConfigManager_1.ConfigManager.get.mockReturnValue(['**/node_modules/**', '**/.git/**']);
        // Reset VS Code mocks
        vscode.window.onDidChangeActiveTextEditor.mockClear();
        vscode.workspace.onDidChangeTextDocument.mockClear();
        // Use fake timers to avoid actual setInterval
        jest.useFakeTimers();
        tracker = new activityTracker_1.ActivityTracker(mockContext);
        // Clear the callbacks array and keep only the most recent ones (from this tracker)
        vscode_1.callbacks.onDidChangeActiveTextEditor.splice(0, vscode_1.callbacks.onDidChangeActiveTextEditor.length - 1);
        vscode_1.callbacks.onDidChangeTextDocument.splice(0, vscode_1.callbacks.onDidChangeTextDocument.length - 1);
    });
    afterEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
        if (tracker) {
            tracker.dispose();
        }
    });
    describe('initialization', () => {
        it('should initialize with empty stats', () => {
            const fileCount = tracker.getFileCount();
            expect(fileCount).toBe(0);
        });
        it('should load existing state from context', () => {
            const existingData = {
                'test.ts': {
                    timeSeconds: 120,
                    linesChanged: 50,
                    lastActiveTimestamp: Date.now()
                }
            };
            mockContext.globalState.get.mockReturnValue(existingData);
            tracker.dispose(); // Dispose previous instance
            tracker = new activityTracker_1.ActivityTracker(mockContext);
            expect(tracker.getFileCount()).toBe(1);
        });
    });
    describe('file tracking', () => {
        it('should track file switches', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            // Trigger the callback
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            expect(tracker.getFileCount()).toBe(1);
        });
        it('should track text document changes', () => {
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 1, character: 0 }
                        },
                        text: 'new content'
                    }
                ]
            };
            // Trigger the callback
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            expect(tracker.getFileCount()).toBe(1);
        });
        it('should ignore non-file schemes', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.parse('untitled:Untitled-1'),
                    scheme: 'untitled'
                }
            };
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            expect(tracker.getFileCount()).toBe(0);
        });
        it('should respect ignore patterns', () => {
            ignore_1.isIgnored.mockReturnValue(true);
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/node_modules/file.ts'),
                    scheme: 'file'
                }
            };
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            expect(tracker.getFileCount()).toBe(0);
        });
        it('should pause tracking when paused', () => {
            mockContext.globalState.get.mockReturnValue(true);
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            expect(tracker.getFileCount()).toBe(0);
        });
    });
    describe('time accumulation', () => {
        it('should accumulate time for active files', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            // Mock active editor
            vscode.window.activeTextEditor = mockEditor;
            // Trigger file switch
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            // Trigger a document change to activate the file
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 }
                        },
                        text: 'content'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            // Advance timer by 60 seconds (enough for 1 minute with fake timers)
            jest.advanceTimersByTime(60000);
            // Get top files and check time
            const topFiles = tracker.getTopFiles(5);
            expect(topFiles.length).toBe(1);
            expect(topFiles[0].timeSpent).toBe('1 mins'); // 60 seconds = 1 minute
        });
        it('should not accumulate time for inactive files', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            vscode.window.activeTextEditor = mockEditor;
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            // Add a document change so the file appears in results
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 }
                        },
                        text: 'content'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            // Clear active editor
            vscode.window.activeTextEditor = undefined;
            // Advance timer
            jest.advanceTimersByTime(10000);
            const topFiles = tracker.getTopFiles(5);
            // Should have accumulated minimal time (0-1 seconds) but still appear due to lines changed
            expect(topFiles.length).toBeGreaterThan(0);
            expect(topFiles[0].timeSpent).toBe('0 mins');
        });
    });
    describe('line changes calculation', () => {
        it('should calculate single-line changes', () => {
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 }
                        },
                        text: 'replacement'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            const topFiles = tracker.getTopFiles(5);
            expect(topFiles[0].linesChanged).toBe(1);
        });
        it('should calculate multi-line changes', () => {
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 5, character: 0 }
                        },
                        text: 'replacement'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            const topFiles = tracker.getTopFiles(5);
            expect(topFiles[0].linesChanged).toBe(6); // 5 lines + 1
        });
        it('should sum multiple content changes', () => {
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 }
                        },
                        text: 'first'
                    },
                    {
                        range: {
                            start: { line: 1, character: 0 },
                            end: { line: 3, character: 0 }
                        },
                        text: 'second'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            const topFiles = tracker.getTopFiles(5);
            expect(topFiles[0].linesChanged).toBe(4); // 1 + 3
        });
    });
    describe('getTopFiles', () => {
        beforeEach(() => {
            // Add some test data
            const mockEditor = (filePath) => ({
                document: {
                    uri: vscode.Uri.file(filePath),
                    scheme: 'file'
                }
            });
            const mockChangeEvent = (filePath, lines) => ({
                document: {
                    uri: vscode.Uri.file(filePath),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: lines - 1, character: 0 }
                        },
                        text: 'x'.repeat(lines)
                    }
                ]
            });
            // Add multiple files with different line changes
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file1.ts'));
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file1.ts', 5));
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file2.ts'));
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file2.ts', 10));
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file3.ts'));
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file3.ts', 3));
        });
        it('should return files sorted by lines changed', () => {
            const topFiles = tracker.getTopFiles(5);
            // Should be sorted by lines changed descending
            expect(topFiles.length).toBeGreaterThan(0);
            for (let i = 1; i < topFiles.length; i++) {
                expect(topFiles[i - 1].linesChanged).toBeGreaterThanOrEqual(topFiles[i].linesChanged);
            }
        });
        it('should respect limit parameter', () => {
            const topFiles = tracker.getTopFiles(2);
            expect(topFiles.length).toBeLessThanOrEqual(2);
        });
        it('should include files with zero time but non-zero lines', () => {
            const mockChangeEvent = {
                document: {
                    uri: vscode.Uri.file('/test/newfile.ts'),
                    scheme: 'file'
                },
                contentChanges: [
                    {
                        range: {
                            start: { line: 0, character: 0 },
                            end: { line: 0, character: 10 }
                        },
                        text: 'content'
                    }
                ]
            };
            vscode_1.callbacks.onDidChangeTextDocument[0](mockChangeEvent);
            const topFiles = tracker.getTopFiles(5);
            const newFile = topFiles.find(f => f.file === '/test/newfile.ts');
            expect(newFile).toBeDefined();
        });
    });
    describe('reset', () => {
        it('should clear all tracking data', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            vscode_1.callbacks.onDidChangeActiveTextEditor[0](mockEditor);
            expect(tracker.getFileCount()).toBeGreaterThan(0);
            tracker.reset();
            expect(tracker.getFileCount()).toBe(0);
            expect(mockContext.globalState.update).toHaveBeenCalledWith('activityTrackerData', expect.any(Object));
        });
    });
    describe('dispose', () => {
        it('should save state on dispose', () => {
            tracker.dispose();
            expect(mockContext.globalState.update).toHaveBeenCalled();
        });
        it('should clear interval timer', () => {
            const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
            tracker.dispose();
            expect(clearIntervalSpy).toHaveBeenCalled();
            clearIntervalSpy.mockRestore();
        });
    });
});
//# sourceMappingURL=activityTracker.test.js.map