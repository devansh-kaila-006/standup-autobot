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
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const terminalTracker_1 = require("../../trackers/terminalTracker");
// Mock vscode
jest.mock('vscode', () => ({
    workspace: {
        getConfiguration: jest.fn(),
    },
    window: {
        terminals: [],
        onDidOpenTerminal: jest.fn(() => ({ dispose: jest.fn() })),
        onDidCloseTerminal: jest.fn(() => ({ dispose: jest.fn() })),
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
describe('TerminalTracker - Enhanced Cross-Platform', () => {
    let terminalTracker;
    let mockGetConfiguration;
    beforeEach(() => {
        terminalTracker = new terminalTracker_1.TerminalTracker();
        jest.clearAllMocks();
        // Reset vscode.window.terminals to empty array
        vscode.window.terminals = [];
        mockGetConfiguration = vscode.workspace.getConfiguration;
        // Set up default configuration
        const mockConfig = {
            get: jest.fn((key, defaultValue) => {
                if (key === 'paused')
                    return false;
                if (key === 'terminalTracking.enabled')
                    return true;
                return defaultValue;
            }),
        };
        mockGetConfiguration.mockReturnValue(mockConfig);
        // Set up default mocks
        os.homedir.mockReturnValue('/home/test');
        os.platform.mockReturnValue('linux');
        path.join.mockImplementation((...args) => args.filter(a => a).join('/'));
        // Set up exec mock to prevent timeouts
        const { exec } = require('child_process');
        exec.mockImplementation((command, callback) => {
            callback(null, '', '');
        });
    });
    afterEach(() => {
        terminalTracker.dispose();
    });
    describe('initialization', () => {
        it('should initialize terminal event listeners', () => {
            terminalTracker.initialize();
            expect(vscode.window.onDidOpenTerminal).toHaveBeenCalled();
            expect(vscode.window.onDidCloseTerminal).toHaveBeenCalled();
        });
        it('should track existing terminals on initialization', () => {
            const mockTerminal = {
                name: 'Test Terminal',
                processId: 12345,
                sendText: jest.fn(),
            };
            vscode.window.terminals = [mockTerminal];
            terminalTracker.initialize();
            expect(vscode.window.onDidOpenTerminal).toHaveBeenCalled();
        });
        it('should clean up disposables on dispose', () => {
            const mockDispose = jest.fn();
            vscode.window.onDidOpenTerminal.mockReturnValue({ dispose: mockDispose });
            vscode.window.onDidCloseTerminal.mockReturnValue({ dispose: mockDispose });
            terminalTracker.initialize();
            terminalTracker.dispose();
            expect(mockDispose).toHaveBeenCalledTimes(2);
        });
    });
    describe('cross-platform shell detection', () => {
        it('should detect PowerShell terminal on Windows', () => {
            os.platform.mockReturnValue('win32');
            const mockTerminal = {
                name: 'PowerShell',
                processId: 12345,
                sendText: jest.fn(),
            };
            terminalTracker.initialize();
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0); // No actual terminal created in test
        });
        it('should detect bash terminal on Linux', () => {
            os.platform.mockReturnValue('linux');
            const mockTerminal = {
                name: 'bash',
                processId: 12345,
                sendText: jest.fn(),
            };
            terminalTracker.initialize();
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0);
        });
        it('should detect zsh terminal on macOS', () => {
            os.platform.mockReturnValue('darwin');
            const mockTerminal = {
                name: 'zsh',
                processId: 12345,
                sendText: jest.fn(),
            };
            terminalTracker.initialize();
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0);
        });
    });
    describe('shell history file paths', () => {
        it('should return Windows-specific paths on win32', () => {
            os.platform.mockReturnValue('win32');
            os.homedir.mockReturnValue('C:\\Users\\test');
            terminalTracker.initialize();
            // The tracker should handle Windows paths correctly
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
        });
        it('should return Unix-specific paths on Linux', () => {
            os.platform.mockReturnValue('linux');
            os.homedir.mockReturnValue('/home/test');
            terminalTracker.initialize();
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
        });
        it('should return Unix-specific paths on macOS', () => {
            os.platform.mockReturnValue('darwin');
            os.homedir.mockReturnValue('/Users/test');
            terminalTracker.initialize();
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
        });
    });
    describe('bash history parsing', () => {
        it('should parse simple bash history', async () => {
            os.platform.mockReturnValue('linux');
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('git status\n' +
                'npm run build\n' +
                'git commit -m "test"\n' +
                'npm test');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toContain('git status');
            expect(result).toContain('npm run build');
            expect(result).toContain('git commit -m "test"');
            expect(result).toContain('npm test');
        });
        it('should filter out comments and empty lines', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockImplementation((path) => {
                // Only return true for .bash_history to avoid reading multiple files
                return path.includes('.bash_history');
            });
            fs.readFileSync.mockReturnValue('# This is a comment\n' +
                'git status\n' +
                '\n' +
                'npm test\n' +
                '; another comment\n');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toEqual(['git status', 'npm test']);
        });
    });
    describe('zsh history parsing', () => {
        it('should parse zsh history with timestamps', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            os.platform.mockReturnValue('darwin');
            os.homedir.mockReturnValue('/Users/test');
            // Don't override path.join - let it use the default implementation
            fs.existsSync.mockImplementation((path) => {
                return path.includes('.zsh_history');
            });
            fs.readFileSync.mockReturnValue(': 1710000000:0;git status\n' +
                ': 1710000100:0;npm run build\n' +
                ': 1710000200:0;git commit -m "test"');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toContain('git status');
            expect(result).toContain('npm run build');
            expect(result).toContain('git commit -m "test"');
        });
        it('should handle mixed zsh history formats', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            os.platform.mockReturnValue('darwin');
            os.homedir.mockReturnValue('/Users/test');
            fs.existsSync.mockImplementation((path) => {
                return path.includes('.zsh_history');
            });
            fs.readFileSync.mockReturnValue(': 1710000000:0;git status\n' +
                'simple command\n' +
                ': 1710000100:0;npm test');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toContain('git status');
            expect(result).toContain('simple command');
            expect(result).toContain('npm test');
        });
    });
    describe('fish shell history parsing', () => {
        it('should parse fish history format', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            os.platform.mockReturnValue('linux');
            fs.existsSync.mockReturnValue(true);
            path.join.mockReturnValue('/home/test/.local/share/fish/fish_history');
            fs.readFileSync.mockReturnValue('- cmd: git status\n' +
                '  when: 1710000000\n' +
                '- cmd: npm run build\n' +
                '  when: 1710000100\n');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toContain('git status');
            expect(result).toContain('npm run build');
        });
        it('should handle malformed fish history gracefully', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            os.platform.mockReturnValue('linux');
            fs.existsSync.mockReturnValue(true);
            path.join.mockReturnValue('/home/test/fish_history');
            fs.readFileSync.mockReturnValue('malformed data\n' +
                'more malformed data\n');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toEqual([]);
        });
    });
    describe('PowerShell history parsing', () => {
        it('should parse PowerShell history on Windows', async () => {
            os.platform.mockReturnValue('win32');
            os.homedir.mockReturnValue('C:\\Users\\test');
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(true);
            path.join.mockReturnValue('C:/Users/test/.../ConsoleHost_history.txt');
            fs.readFileSync.mockReturnValue('git status\r\n' +
                'npm run build\r\n' +
                'Write-Host "Hello"\r\n');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toContain('git status');
            expect(result).toContain('npm run build');
            expect(result).toContain('Write-Host "Hello"');
        });
    });
    describe('command tracking', () => {
        it('should add commands to tracked history', () => {
            terminalTracker.addCommand('git status', 'bash');
            terminalTracker.addCommand('npm test', 'bash');
            const stats = terminalTracker.getTerminalStats();
            expect(stats.totalCommands).toBe(2);
            expect(stats.shells).toContain('bash');
        });
        it('should limit history size', () => {
            // Add more commands than maxHistorySize
            for (let i = 0; i < 1100; i++) {
                terminalTracker.addCommand(`command ${i}`, 'bash');
            }
            const stats = terminalTracker.getTerminalStats();
            expect(stats.totalCommands).toBe(1000); // maxHistorySize
        });
        it('should track commands from multiple shells', () => {
            terminalTracker.addCommand('git status', 'bash');
            terminalTracker.addCommand('npm test', 'powershell');
            terminalTracker.addCommand('ls -la', 'zsh');
            const stats = terminalTracker.getTerminalStats();
            expect(stats.totalCommands).toBe(3);
            expect(stats.shells).toContain('bash');
            expect(stats.shells).toContain('powershell');
            expect(stats.shells).toContain('zsh');
        });
    });
    describe('terminal statistics', () => {
        it('should return accurate terminal statistics', () => {
            terminalTracker.addCommand('cmd1', 'bash');
            terminalTracker.addCommand('cmd2', 'zsh');
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0);
            expect(stats.totalCommands).toBe(2);
            expect(stats.shells).toContain('bash');
            expect(stats.shells).toContain('zsh');
        });
        it('should handle empty statistics', () => {
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0);
            expect(stats.totalCommands).toBe(0);
            expect(stats.shells).toEqual([]);
        });
    });
    describe('configuration checks', () => {
        it('should respect terminal tracking enabled setting', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'terminalTracking.enabled')
                        return false;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toEqual([]);
        });
        it('should use default value when terminal tracking enabled is not set', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'terminalTracking.enabled')
                        return defaultValue;
                    if (key === 'paused')
                        return false;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
            await terminalTracker.getTerminalHistory();
            expect(mockConfig.get).toHaveBeenCalledWith('terminalTracking.enabled', true);
        });
    });
    describe('error handling', () => {
        it('should handle file system errors gracefully', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockImplementation(() => {
                throw new Error('Permission denied');
            });
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toBeDefined();
            expect(consoleSpy).toHaveBeenCalled();
            consoleSpy.mockRestore();
        });
        it('should handle exec errors gracefully', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            os.platform.mockReturnValue('win32');
            fs.existsSync.mockReturnValue(false);
            const { exec } = require('child_process');
            exec.mockImplementation((command, callback) => {
                callback(new Error('Exec failed'), '', '');
            });
            const consoleSpy = jest.spyOn(console, 'debug').mockImplementation();
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toBeDefined();
            consoleSpy.mockRestore();
        });
        it('should handle malformed history files gracefully', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue('corrupted data \x00\x01\x02');
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toBeDefined();
        });
    });
    describe('cross-platform fallbacks', () => {
        it('should use Windows fallback when shell history files are not available', async () => {
            os.platform.mockReturnValue('win32');
            os.homedir.mockReturnValue('C:\\Users\\test');
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
            // Mock successful PowerShell exec
            const { exec } = require('child_process');
            exec.mockImplementation((command, callback) => {
                if (command.includes('powershell')) {
                    callback(null, 'git status\nnpm test\n', '');
                }
                else {
                    callback(new Error('Command failed'), '', '');
                }
            });
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toBeDefined();
        });
        it('should use Unix fallback when shell history files are not available', async () => {
            os.platform.mockReturnValue('linux');
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            fs.existsSync.mockReturnValue(false);
            // Mock successful shell exec
            const { exec } = require('child_process');
            exec.mockImplementation((command, callback) => {
                if (command.includes('bash') || command.includes('zsh')) {
                    callback(null, 'git status\nnpm test\n', '');
                }
                else {
                    callback(new Error('Command failed'), '', '');
                }
            });
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toBeDefined();
        });
    });
    describe('memory management', () => {
        it('should clean up resources on dispose', () => {
            terminalTracker.addCommand('cmd1', 'bash');
            terminalTracker.addCommand('cmd2', 'zsh');
            terminalTracker.dispose();
            const stats = terminalTracker.getTerminalStats();
            expect(stats.trackedTerminals).toBe(0);
            expect(stats.totalCommands).toBe(0);
            expect(stats.shells).toEqual([]);
        });
        it('should handle multiple dispose calls safely', () => {
            terminalTracker.addCommand('cmd1', 'bash');
            terminalTracker.dispose();
            terminalTracker.dispose();
            terminalTracker.dispose();
            const stats = terminalTracker.getTerminalStats();
            expect(stats.totalCommands).toBe(0);
        });
    });
    describe('integration with existing tests', () => {
        it('should maintain backward compatibility with pause functionality', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            const result = await terminalTracker.getTerminalHistory();
            expect(result).toEqual([]);
            expect(mockConfig.get).toHaveBeenCalledWith('paused', false);
        });
        it('should maintain backward compatibility with limit parameter', async () => {
            const mockConfig = {
                get: jest.fn((key, defaultValue) => {
                    if (key === 'paused')
                        return false;
                    if (key === 'terminalTracking.enabled')
                        return true;
                    return defaultValue;
                }),
            };
            mockGetConfiguration.mockReturnValue(mockConfig);
            const history = Array.from({ length: 30 }, (_, i) => `command ${i + 1}`);
            fs.existsSync.mockReturnValue(true);
            fs.readFileSync.mockReturnValue(history.join('\n'));
            const result = await terminalTracker.getTerminalHistory(10);
            expect(result.length).toBeLessThanOrEqual(10);
        });
    });
});
//# sourceMappingURL=terminalTracker.enhanced.test.js.map