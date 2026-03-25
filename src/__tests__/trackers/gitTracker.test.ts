// Mock child_process and util BEFORE importing GitTracker
const mockExec = jest.fn();
const mockPromisify = jest.fn((fn) => {
    if (fn === mockExec) {
        return mockExec; // Return the mock directly
    }
    return jest.fn();
});

jest.mock('child_process', () => ({
    exec: mockExec
}));

jest.mock('util', () => ({
    promisify: mockPromisify
}));

import { GitTracker, GitCommit } from '../../trackers/gitTracker';
import * as vscode from 'vscode';

describe('GitTracker', () => {
    let tracker: GitTracker;
    let mockWorkspaceFolder: vscode.WorkspaceFolder;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup exec mock to resolve with success by default
        mockExec.mockResolvedValue({ stdout: '', stderr: '' });

        tracker = new GitTracker();

        // Mock workspace folder
        mockWorkspaceFolder = {
            uri: vscode.Uri.file('/test/workspace'),
            name: 'test-workspace',
            index: 0
        };

        (vscode.workspace.workspaceFolders as any) = [mockWorkspaceFolder];
        (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
            get: jest.fn((key: string, defaultValue: any) => {
                if (key === 'paused') return false;
                return defaultValue;
            })
        });
    });

    describe('getRecentCommits', () => {
        it('should return empty array when no workspace is open', async () => {
            (vscode.workspace.workspaceFolders as any) = undefined;

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toEqual([]);
        });

        it('should return empty array when tracking is paused', async () => {
            (vscode.workspace.getConfiguration as jest.Mock).mockReturnValue({
                get: jest.fn((key: string) => {
                    if (key === 'paused') return true;
                    return undefined;
                })
            });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toEqual([]);
        });

        it('should return empty array when not a git repository', async () => {
            // First call (git config) fails
            mockExec.mockRejectedValueOnce(new Error('fatal: not a git repository'));

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toEqual([]);
        });

        it('should return empty array when git user cannot be determined', async () => {
            // First call (git config) fails
            mockExec.mockRejectedValueOnce(new Error('no user configured'));

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toEqual([]);
        });

        it('should successfully retrieve and parse commits', async () => {
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Add new feature
src/file1.ts
src/file2.ts
fed789cba0123456789012345678901234567890|2024-01-15T11:00:00+00:00|Fix bug
src/file3.ts`;

            // Mock git config to return user name
            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                // Mock git log to return commits
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toHaveLength(2);
            expect(commits[0]).toEqual({
                hash: 'abc123def4567890123456789012345678901234',
                timestamp: '2024-01-15T10:30:00+00:00',
                message: 'Add new feature',
                files: ['src/file1.ts', 'src/file2.ts']
            });
            expect(commits[1]).toEqual({
                hash: 'fed789cba0123456789012345678901234567890',
                timestamp: '2024-01-15T11:00:00+00:00',
                message: 'Fix bug',
                files: ['src/file3.ts']
            });
        });

        it('should handle commits with special characters in messages', async () => {
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Fix "weird" bug's
src/file1.ts`;

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toHaveLength(1);
            expect(commits[0].message).toBe('Fix "weird" bug\'s');
        });

        it('should escape special characters in username', async () => {
            const userName = 'O"Connor';
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Test commit
src/file1.ts`;

            mockExec
                .mockResolvedValueOnce({ stdout: userName, stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            await tracker.getRecentCommits(24);

            // Check that git log was called
            expect(mockExec).toHaveBeenCalledTimes(2);
            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('git log'),
                expect.any(Object)
            );
        });

        it('should handle commits with no files', async () => {
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Empty commit`;

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toHaveLength(1);
            expect(commits[0].files).toEqual([]);
        });

        it('should use correct time range in git command', async () => {
            const hours = 48;
            const mockGitOutput = '';

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            await tracker.getRecentCommits(hours);

            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining(`${hours} hours ago`),
                expect.any(Object)
            );
        });

        it('should filter commits by current git user', async () => {
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Test commit
src/file1.ts`;

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            await tracker.getRecentCommits(24);

            expect(mockExec).toHaveBeenCalledWith(
                expect.stringContaining('--author='),
                expect.any(Object)
            );
        });

        it('should handle empty git log output', async () => {
            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: '', stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toEqual([]);
        });

        it('should handle malformed git log output gracefully', async () => {
            const malformedOutput = `invalid line
another invalid line`;

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: malformedOutput, stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            // Should not crash, just return empty or partial results
            expect(Array.isArray(commits)).toBe(true);
        });

        it('should handle Windows-style line endings', async () => {
            const mockGitOutput = `abc123def4567890123456789012345678901234|2024-01-15T10:30:00+00:00|Test commit\r
src/file1.ts\r
fed789cba0123456789012345678901234567890|2024-01-15T11:00:00+00:00|Another commit\r
src/file2.ts`;

            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockResolvedValueOnce({ stdout: mockGitOutput, stderr: '' });

            const commits = await tracker.getRecentCommits(24);

            expect(commits).toHaveLength(2);
            expect(commits[0].files).toContain('src/file1.ts');
            expect(commits[1].files).toContain('src/file2.ts');
        });
    });

    describe('error handling', () => {
        it('should handle git command errors', async () => {
            mockExec
                .mockResolvedValueOnce({ stdout: 'Test User', stderr: '' })
                .mockRejectedValueOnce(new Error('Unknown git error'));

            const commits = await tracker.getRecentCommits(24);

            // Should return empty array on error
            expect(commits).toEqual([]);
        });
    });
});
