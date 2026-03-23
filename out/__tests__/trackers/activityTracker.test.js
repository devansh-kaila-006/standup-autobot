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
// Mock dependencies
jest.mock('../../utils/ignore');
jest.mock('../../utils/ConfigManager');
describe('ActivityTracker', () => {
    let tracker;
    let mockContext;
    let mockOnDidChangeActiveTextEditor;
    let mockOnDidChangeTextDocument;
    beforeEach(() => {
        // Mock VS Code extension context
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
        // Mock default behaviors
        mockContext.globalState.get.mockReturnValue(false);
        ignore_1.isIgnored.mockReturnValue(false);
        ConfigManager_1.ConfigManager.get.mockReturnValue(['**/node_modules/**', '**/.git/**']);
        // Mock VS Code window methods
        mockOnDidChangeActiveTextEditor = jest.fn().mockReturnValue({ dispose: jest.fn() });
        mockOnDidChangeTextDocument = jest.fn().mockReturnValue({ dispose: jest.fn() });
        vscode.window.onDidChangeActiveTextEditor = mockOnDidChangeActiveTextEditor;
        vscode.workspace.onDidChangeTextDocument = mockOnDidChangeTextDocument;
        // Use fake timers to avoid actual setInterval
        jest.useFakeTimers();
        tracker = new activityTracker_1.ActivityTracker(mockContext);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
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
            const callback = mockOnDidChangeTextDocument.mock.calls[0][0];
            callback(mockChangeEvent);
            expect(tracker.getFileCount()).toBe(1);
        });
        it('should ignore non-file schemes', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.parse('untitled:Untitled-1'),
                    scheme: 'untitled'
                }
            };
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
            // Advance timer by 5 seconds
            jest.advanceTimersByTime(5000);
            // Get top files and check time
            const topFiles = tracker.getTopFiles(5);
            expect(topFiles.length).toBe(1);
            expect(topFiles[0].timeSpent).toBe('5 mins'); // Rounded
        });
        it('should not accumulate time for inactive files', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            };
            vscode.window.activeTextEditor = mockEditor;
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
            // Clear active editor
            vscode.window.activeTextEditor = undefined;
            // Advance timer
            jest.advanceTimersByTime(10000);
            const topFiles = tracker.getTopFiles(5);
            // Should have accumulated minimal time (0-1 seconds)
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
            const callback = mockOnDidChangeTextDocument.mock.calls[0][0];
            callback(mockChangeEvent);
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
            const callback = mockOnDidChangeTextDocument.mock.calls[0][0];
            callback(mockChangeEvent);
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
            const callback = mockOnDidChangeTextDocument.mock.calls[0][0];
            callback(mockChangeEvent);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            // Add multiple files
            callback(mockEditor('/test/file1.ts'));
            callback(mockEditor('/test/file2.ts'));
            callback(mockEditor('/test/file3.ts'));
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
            const callback = mockOnDidChangeTextDocument.mock.calls[0][0];
            callback(mockChangeEvent);
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
            const callback = mockOnDidChangeActiveTextEditor.mock.calls[0][0];
            callback(mockEditor);
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