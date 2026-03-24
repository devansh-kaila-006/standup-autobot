import { HistoryService, StandupEntry, DailyActivity } from '../../services/HistoryService';
import * as vscode from 'vscode';

describe('HistoryService', () => {
    let service: HistoryService;
    let mockContext: vscode.ExtensionContext;
    let mockHistory: StandupEntry[] = [];
    let mockActivity: DailyActivity[] = [];

    beforeEach(() => {
        // Mock VS Code extension context
        mockHistory = [];
        mockActivity = [];

        mockContext = {
            globalState: {
                get: jest.fn((key: string, defaultValue?: any) => {
                    if (key === 'standup.history') return mockHistory;
                    if (key === 'standup.activityDaily') return mockActivity;
                    return defaultValue;
                }),
                update: jest.fn(async (key: string, value: any) => {
                    if (key === 'standup.history') {
                        mockHistory = value;
                    } else if (key === 'standup.activityDaily') {
                        mockActivity = value;
                    }
                }),
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

        service = new HistoryService(mockContext);
    });

    describe('saveStandup', () => {
        it('should save a new standup entry', async () => {
            const testText = 'Today I worked on feature X';

            await service.saveStandup(testText);

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'standup.history',
                expect.any(Array)
            );

            const savedHistory = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedHistory).toHaveLength(1);
            expect(savedHistory[0].text).toBe(testText);
            expect(savedHistory[0].date).toBeDefined();
            expect(savedHistory[0].timestamp).toBeDefined();
            expect(savedHistory[0].id).toBeDefined();
        });

        it('should add new entry at the beginning of history', async () => {
            mockHistory = [
                {
                    id: '1',
                    date: '2024-01-01',
                    timestamp: Date.now() - 100000,
                    text: 'Old standup'
                }
            ];

            await service.saveStandup('New standup');

            const savedHistory = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedHistory[0].text).toBe('New standup');
            expect(savedHistory[1].text).toBe('Old standup');
        });

        it('should trim history to last 30 days', async () => {
            const now = Date.now();
            const dayInMs = 24 * 60 * 60 * 1000;

            mockHistory = [
                {
                    id: '1',
                    date: new Date(now - 35 * dayInMs).toISOString().split('T')[0],
                    timestamp: now - 35 * dayInMs,
                    text: 'Old entry (should be removed)'
                },
                {
                    id: '2',
                    date: new Date(now - 25 * dayInMs).toISOString().split('T')[0],
                    timestamp: now - 25 * dayInMs,
                    text: 'Recent entry (should be kept)'
                }
            ];

            await service.saveStandup('New entry');

            const savedHistory = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedHistory).toHaveLength(2); // Recent + New
            expect(savedHistory.every((entry: StandupEntry) => entry.timestamp > now - 30 * dayInMs)).toBe(true);
        });

        it('should generate unique IDs for entries', async () => {
            await service.saveStandup('First');
            await service.saveStandup('Second');

            const firstId = mockHistory[1].id; // First entry (oldest)
            const secondId = mockHistory[0].id; // Second entry (most recent)

            expect(firstId).toBeDefined();
            expect(secondId).toBeDefined();
            expect(firstId).not.toBe(secondId);
        });
    });

    describe('getHistory', () => {
        it('should return empty array when no history exists', () => {
            const history = service.getHistory();

            expect(history).toEqual([]);
            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.history', []);
        });

        it('should return existing history', () => {
            const testHistory: StandupEntry[] = [
                {
                    id: '1',
                    date: '2024-01-01',
                    timestamp: Date.now(),
                    text: 'Test standup'
                }
            ];

            (mockContext.globalState.get as jest.Mock).mockReturnValue(testHistory);

            const history = service.getHistory();

            expect(history).toEqual(testHistory);
        });
    });

    describe('logActivity', () => {
        it('should create new activity entry for today', async () => {
            await service.logActivity(5);

            expect(mockContext.globalState.update).toHaveBeenCalledWith(
                'standup.activityDaily',
                expect.any(Array)
            );

            const savedActivity = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedActivity).toHaveLength(1);
            expect(savedActivity[0].fileCount).toBe(5);
            expect(savedActivity[0].date).toBe(new Date().toISOString().split('T')[0]);
        });

        it('should update existing activity entry for today', async () => {
            const today = new Date().toISOString().split('T')[0];
            mockActivity = [
                { date: today, fileCount: 3 }
            ];

            await service.logActivity(7);

            const savedActivity = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedActivity).toHaveLength(1);
            expect(savedActivity[0].fileCount).toBe(7);
        });

        it('should keep only last 30 days of activity', async () => {
            const today = new Date();
            const oldActivity: DailyActivity[] = [];

            // Create 35 days of activity
            for (let i = 35; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                oldActivity.push({
                    date: date.toISOString().split('T')[0],
                    fileCount: i
                });
            }

            mockActivity = oldActivity;

            await service.logActivity(10);

            const savedActivity = (mockContext.globalState.update as jest.Mock).mock.calls[0][1];
            expect(savedActivity.length).toBeLessThanOrEqual(30);
        });
    });

    describe('getAllActivity', () => {
        it('should return empty array when no activity exists', () => {
            const activity = service.getAllActivity();

            expect(activity).toEqual([]);
            expect(mockContext.globalState.get).toHaveBeenCalledWith('standup.activityDaily', []);
        });

        it('should return existing activity', () => {
            const testActivity: DailyActivity[] = [
                { date: '2024-01-01', fileCount: 5 }
            ];

            (mockContext.globalState.get as jest.Mock).mockReturnValue(testActivity);

            const activity = service.getAllActivity();

            expect(activity).toEqual(testActivity);
        });
    });

    describe('getWeeklySummaries', () => {
        it('should return entries from last 7 days', () => {
            const now = Date.now();
            const dayInMs = 24 * 60 * 60 * 1000;

            mockHistory = [
                {
                    id: '1',
                    date: new Date(now - 3 * dayInMs).toISOString().split('T')[0],
                    timestamp: now - 3 * dayInMs,
                    text: '3 days ago'
                },
                {
                    id: '2',
                    date: new Date(now - 10 * dayInMs).toISOString().split('T')[0],
                    timestamp: now - 10 * dayInMs,
                    text: '10 days ago (should be excluded)'
                }
            ];

            const weekly = service.getWeeklySummaries();

            expect(weekly).toHaveLength(1);
            expect(weekly[0].text).toBe('3 days ago');
        });

        it('should return all entries when history is less than 7 days', () => {
            const now = Date.now();

            mockHistory = [
                {
                    id: '1',
                    date: new Date(now).toISOString().split('T')[0],
                    timestamp: now,
                    text: 'Today'
                },
                {
                    id: '2',
                    date: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    timestamp: now - 2 * 24 * 60 * 60 * 1000,
                    text: '2 days ago'
                }
            ];

            const weekly = service.getWeeklySummaries();

            expect(weekly).toHaveLength(2);
        });

        it('should return empty array when no history', () => {
            const weekly = service.getWeeklySummaries();

            expect(weekly).toEqual([]);
        });
    });

    describe('getWeeklyActivityIntensity', () => {
        it('should return 7 values', () => {
            const intensity = service.getWeeklyActivityIntensity();

            expect(intensity).toHaveLength(7);
        });

        it('should normalize activity values to 0-1 range', () => {
            const today = new Date().toISOString().split('T')[0];
            mockActivity = [
                { date: today, fileCount: 10 }
            ];

            const intensity = service.getWeeklyActivityIntensity();

            // Today should be 1.0 (10 files / 10 = 1.0)
            expect(intensity[6]).toBe(1.0);
        });

        it('should cap intensity at 1.0 for high activity', () => {
            const today = new Date().toISOString().split('T')[0];
            mockActivity = [
                { date: today, fileCount: 20 }
            ];

            const intensity = service.getWeeklyActivityIntensity();

            expect(intensity[6]).toBe(1.0); // Should be capped
        });

        it('should return 0 for days with no activity', () => {
            const intensity = service.getWeeklyActivityIntensity();

            expect(intensity.every(value => value === 0)).toBe(true);
        });

        it('should correctly map activity to last 7 days', () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            mockActivity = [
                { date: today.toISOString().split('T')[0], fileCount: 5 },
                { date: yesterday.toISOString().split('T')[0], fileCount: 3 }
            ];

            const intensity = service.getWeeklyActivityIntensity();

            expect(intensity[6]).toBe(0.5); // Today: 5/10 = 0.5
            expect(intensity[5]).toBe(0.3); // Yesterday: 3/10 = 0.3
            expect(intensity[4]).toBe(0); // 2 days ago: no activity
        });
    });

    describe('integration scenarios', () => {
        it('should handle multiple standups in one day', async () => {
            await service.saveStandup('Morning standup');
            await service.saveStandup('Afternoon standup');

            const history = service.getHistory();
            const today = new Date().toISOString().split('T')[0];

            const todayEntries = history.filter(entry => entry.date === today);
            expect(todayEntries.length).toBeGreaterThanOrEqual(2);
        });

        it('should maintain chronological order in history', async () => {
            await service.saveStandup('First');
            await service.saveStandup('Second');
            await service.saveStandup('Third');

            const history = service.getHistory();

            // Most recent should be first
            expect(history[0].text).toBe('Third');
            expect(history[1].text).toBe('Second');
            expect(history[2].text).toBe('First');
        });

        it('should correlate activity with standups', async () => {
            await service.logActivity(5);
            await service.saveStandup('Worked on 5 files');

            const activity = service.getAllActivity();
            const history = service.getHistory();

            const today = new Date().toISOString().split('T')[0];

            expect(activity.some(a => a.date === today && a.fileCount === 5)).toBe(true);
            expect(history.some(h => h.date === today)).toBe(true);
        });
    });
});
