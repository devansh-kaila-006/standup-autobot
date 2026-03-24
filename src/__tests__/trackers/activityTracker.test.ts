import { ActivityTracker, ActivityReport } from '../../trackers/activityTracker';
import * as vscode from 'vscode';
import { isIgnored } from '../../utils/ignore';
import { ConfigManager } from '../../utils/ConfigManager';
import { callbacks as mockCallbacks } from '../../__mocks__/vscode';

// Mock dependencies
jest.mock('../../utils/ignore');
jest.mock('../../utils/ConfigManager');

describe('ActivityTracker', () => {
    let tracker: ActivityTracker;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        // Mock VS Code extension context
        mockContext = {
            globalState: {
                get: jest.fn((key: string, defaultValue?: any) => {
                    if (key === 'standup.paused') return false;
                    if (key === 'activityTrackerData') return undefined;
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
            environmentVariableCollection: {} as any,
            asAbsolutePath: (path: string) => path,
            executeCommand: jest.fn(),
            secrets: {} as any
        } as any;

        // Mock default behaviors
        (isIgnored as jest.Mock).mockReturnValue(false);
        (ConfigManager.get as jest.Mock).mockReturnValue(['**/node_modules/**', '**/.git/**']);

        // Reset VS Code mocks
        (vscode.window.onDidChangeActiveTextEditor as jest.Mock).mockClear();
        (vscode.workspace.onDidChangeTextDocument as jest.Mock).mockClear();

        // Use fake timers to avoid actual setInterval
        jest.useFakeTimers();

        tracker = new ActivityTracker(mockContext);

        // Clear the callbacks array and keep only the most recent ones (from this tracker)
        mockCallbacks.onDidChangeActiveTextEditor.splice(0, mockCallbacks.onDidChangeActiveTextEditor.length - 1);
        mockCallbacks.onDidChangeTextDocument.splice(0, mockCallbacks.onDidChangeTextDocument.length - 1);
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

            (mockContext.globalState.get as jest.Mock).mockReturnValue(existingData);

            tracker.dispose(); // Dispose previous instance
            tracker = new ActivityTracker(mockContext);

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
            } as any;

            // Trigger the callback
            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

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
            } as any;

            // Trigger the callback
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

            expect(tracker.getFileCount()).toBe(1);
        });

        it('should ignore non-file schemes', () => {
            const mockEditor = {
                document: {
                    uri: vscode.Uri.parse('untitled:Untitled-1'),
                    scheme: 'untitled'
                }
            } as any;

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

            expect(tracker.getFileCount()).toBe(0);
        });

        it('should respect ignore patterns', () => {
            (isIgnored as jest.Mock).mockReturnValue(true);

            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/node_modules/file.ts'),
                    scheme: 'file'
                }
            } as any;

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

            expect(tracker.getFileCount()).toBe(0);
        });

        it('should pause tracking when paused', () => {
            (mockContext.globalState.get as jest.Mock).mockReturnValue(true);

            const mockEditor = {
                document: {
                    uri: vscode.Uri.file('/test/path/file.ts'),
                    scheme: 'file'
                }
            } as any;

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

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
            } as any;

            // Mock active editor
            (vscode.window.activeTextEditor as any) = mockEditor;

            // Trigger file switch
            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

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
            } as any;
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

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
            } as any;

            (vscode.window.activeTextEditor as any) = mockEditor;

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

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
            } as any;
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

            // Clear active editor
            (vscode.window.activeTextEditor as any) = undefined;

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
            } as any;

            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

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
            } as any;

            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

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
            } as any;

            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

            const topFiles = tracker.getTopFiles(5);
            expect(topFiles[0].linesChanged).toBe(4); // 1 + 3
        });
    });

    describe('getTopFiles', () => {
        beforeEach(() => {
            // Add some test data
            const mockEditor = (filePath: string) => ({
                document: {
                    uri: vscode.Uri.file(filePath),
                    scheme: 'file'
                }
            } as any);

            const mockChangeEvent = (filePath: string, lines: number) => ({
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
            } as any);

            // Add multiple files with different line changes
            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file1.ts'));
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file1.ts', 5));

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file2.ts'));
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file2.ts', 10));

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor('/test/file3.ts'));
            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent('/test/file3.ts', 3));
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
            } as any;

            mockCallbacks.onDidChangeTextDocument[0](mockChangeEvent);

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
            } as any;

            mockCallbacks.onDidChangeActiveTextEditor[0](mockEditor);

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
