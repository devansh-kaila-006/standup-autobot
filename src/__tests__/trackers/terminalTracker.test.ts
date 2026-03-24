import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { TerminalTracker } from '../../trackers/terminalTracker';

// Mock vscode
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
    },
}));

// Mock fs
jest.mock('fs');
jest.mock('path');
jest.mock('os');

// Mock child_process
jest.mock('child_process', () => ({
    exec: jest.fn(),
}));

describe('TerminalTracker', () => {
    let terminalTracker: TerminalTracker;
    let mockGetConfiguration: jest.Mock;

    beforeEach(() => {
        terminalTracker = new TerminalTracker();
        jest.clearAllMocks();

        mockGetConfiguration = vscode.workspace.getConfiguration as jest.Mock;

        // Set up default configuration with terminal tracking enabled
        const defaultConfig = {
            get: jest.fn((key: string, defaultValue: any) => {
                if (key === 'paused') return false;
                if (key === 'terminalTracking.enabled') return true;
                return defaultValue;
            }),
        };
        mockGetConfiguration.mockReturnValue(defaultConfig);

        // Set up default exec mock to prevent timeouts
        const { exec } = require('child_process');
        exec.mockImplementation((command: string, callback: any) => {
            callback(null, 'Simulating terminal history check...\n', '');
        });
    });

    describe('getTerminalHistory', () => {
        describe('when tracking is paused', () => {
            it('should return empty array when paused config is true', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([]);
                expect(mockConfig.get).toHaveBeenCalledWith('paused', false);
            });

            it('should not attempt to read files when paused', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return true;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                await terminalTracker.getTerminalHistory();

                expect(fs.existsSync).not.toHaveBeenCalled();
            });
        });

        describe('PowerShell history file exists', () => {
            beforeEach(() => {
                // Set platform to Windows for PowerShell tests
                (os.platform as jest.Mock).mockReturnValue('win32');
                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) =>
                    args.filter(a => a).join('/')
                );
            });

            it('should read and return PowerShell history', async () => {
                mockGetConfiguration.mockReturnValue({
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                });

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(
                    'git status\n' +
                    'npm run build\n' +
                    'git commit -m "test"\n' +
                    'npm test'
                );

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([
                    'git status',
                    'npm run build',
                    'git commit -m "test"',
                    'npm test',
                ]);
            });

            it('should limit results to specified limit', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                const history = Array.from({ length: 30 }, (_, i) => `command ${i + 1}`);
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(history.join('\n'));

                const result = await terminalTracker.getTerminalHistory(10);

                expect(result).toHaveLength(10);
                expect(result[0]).toBe('command 21');
                expect(result[9]).toBe('command 30');
            });

            it('should use default limit of 20', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                const history = Array.from({ length: 25 }, (_, i) => `command ${i + 1}`);
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(history.join('\n'));

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toHaveLength(20);
            });

            it('should filter out empty lines', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(
                    'git status\n\n' +
                    'npm run build\n   \n' +
                    'git commit'
                );

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([
                    'git status',
                    'npm run build',
                    'git commit',
                ]);
            });

            it('should handle Windows line endings (CRLF)', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(
                    'git status\r\n' +
                    'npm run build\r\n' +
                    'git commit'
                );

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([
                    'git status',
                    'npm run build',
                    'git commit',
                ]);
            });

            it('should handle mixed line endings', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue(
                    'git status\n\r\n' +
                    'npm run build\r' +
                    'git commit'
                );

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toHaveLength(3);
            });

            it('should return empty array when history file is empty', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue('');

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([]);
            });

            it('should handle file read errors gracefully', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockImplementation(() => {
                    throw new Error('Permission denied');
                });

                const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toBeDefined();
                expect(consoleSpy).toHaveBeenCalledWith(
                    'Error reading PowerShell history:',
                    expect.any(Error)
                );

                consoleSpy.mockRestore();
            });

            it('should construct correct PowerShell history path', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\testuser');
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue('command');

                await terminalTracker.getTerminalHistory();

                expect(path.join).toHaveBeenCalledWith(
                    'C:\\Users\\testuser',
                    'AppData',
                    'Roaming',
                    'Microsoft',
                    'Windows',
                    'PowerShell',
                    'PSReadline',
                    'ConsoleHost_history.txt'
                );
            });
        });

        describe('PowerShell history file does not exist', () => {
            beforeEach(() => {
                // Set platform to Windows for PowerShell tests
                (os.platform as jest.Mock).mockReturnValue('win32');
                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) =>
                    args.filter(a => a).join('/')
                );

                // Set up exec mock to resolve successfully
                const { exec } = require('child_process');
                exec.mockImplementation((command: string, callback: any) => {
                    callback(null, 'Simulating terminal history check...\n', '');
                });
            });

            it('should fall back to doskey stub when PowerShell history does not exist', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (fs.existsSync as jest.Mock).mockReturnValue(false);

                const result = await terminalTracker.getTerminalHistory();

                expect(result).toEqual([
                    'git status',
                    'npm run build',
                    "echo 'Hello World'",
                    '(Mock History: Real doskey requires session attachment)',
                ]);
            });
        });

        describe('edge cases', () => {
            beforeEach(() => {
                // Set platform to Windows for these tests
                (os.platform as jest.Mock).mockReturnValue('win32');
                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
            });

            it('should handle limit of 0 (returns all due to slice behavior)', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue('command1\ncommand2');

                const result = await terminalTracker.getTerminalHistory(0);

                // slice(-0) returns all elements in JavaScript
                expect(result).toEqual(['command1', 'command2']);
            });

            it('should handle negative limit (returns empty due to slice(-limit) behavior)', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue('command1\ncommand2');

                const result = await terminalTracker.getTerminalHistory(-5);

                // slice(-(-5)) = slice(5) which returns empty array for 2-element array
                expect(result).toEqual([]);
            });

            it('should handle very large limit', async () => {
                const mockConfig = {
                    get: jest.fn((key: string, defaultValue: any) => {
                        if (key === 'paused') return false;
                        if (key === 'terminalTracking.enabled') return true;
                        return defaultValue;
                    }),
                };
                mockGetConfiguration.mockReturnValue(mockConfig);

                (os.homedir as jest.Mock).mockReturnValue('C:\\Users\\test');
                (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
                (fs.existsSync as jest.Mock).mockReturnValue(true);
                (fs.readFileSync as jest.Mock).mockReturnValue('command1\ncommand2');

                const result = await terminalTracker.getTerminalHistory(10000);

                expect(result).toEqual(['command1', 'command2']);
            });
        });
    });

    describe('getDoskeyStub', () => {
        it('should return mock history data', async () => {
            const mockConfig = {
                get: jest.fn((key: string, defaultValue: any) => {
                    if (key === 'paused') return false;
                    if (key === 'terminalTracking.enabled') return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (os.homedir as jest.Mock).mockReturnValue('/users/test');
            (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            // Mock exec to resolve successfully
            const { exec } = require('child_process');
            exec.mockImplementation((command: string, callback: any) => {
                callback(null, 'Simulating terminal history check...\n', '');
            });

            const result = await terminalTracker.getTerminalHistory();

            expect(result).toContain('git status');
            expect(result).toContain('npm run build');
            expect(result).toContain("echo 'Hello World'");
            expect(result).toContain('(Mock History: Real doskey requires session attachment)');
        }, 10000);

        it('should handle exec errors gracefully', async () => {
            // This is a private method, but we can test it indirectly
            // by mocking the exec to fail
            const { exec } = require('child_process');
            exec.mockImplementation((command: string, callback: any) => {
                callback(new Error('Exec failed'), '', '');
            });

            const mockConfig = {
                get: jest.fn((key: string, defaultValue: any) => {
                    if (key === 'paused') return false;
                    if (key === 'terminalTracking.enabled') return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (os.homedir as jest.Mock).mockReturnValue('/users/test');
            (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await terminalTracker.getTerminalHistory();

            // When exec fails, it returns an empty array
            expect(result).toBeDefined();
            expect(result).toEqual([]);
            expect(consoleSpy).toHaveBeenCalled();

            consoleSpy.mockRestore();
        }, 10000);
    });

    describe('workspace configuration', () => {
        it('should check paused status from config', async () => {
            const mockConfig = {
                get: jest.fn((key: string, defaultValue: any) => {
                    if (key === 'paused') return false;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (os.homedir as jest.Mock).mockReturnValue('/users/test');
            (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await terminalTracker.getTerminalHistory();

            expect(mockConfig.get).toHaveBeenCalledWith('paused', false);
        });

        it('should use default value when paused is not set', async () => {
            const mockConfig = {
                get: jest.fn((key: string, defaultValue: any) => defaultValue),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);

            (os.homedir as jest.Mock).mockReturnValue('/users/test');
            (path.join as jest.Mock).mockImplementation((...args: string[]) => args.join('/'));
            (fs.existsSync as jest.Mock).mockReturnValue(false);

            await terminalTracker.getTerminalHistory();

            expect(mockConfig.get).toHaveBeenCalledWith('paused', false);
        });
    });
});
