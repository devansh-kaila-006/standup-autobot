/**
 * Represents the structure of a single commit as requested.
 */
export interface GitCommit {
    hash: string;
    timestamp: string;
    message: string;
    files: string[];
}
/**
 * GitTracker handles the retrieval of Git history for the current workspace.
 */
export declare class GitTracker {
    private cache;
    private readonly CACHE_TTL;
    private debouncedGetRecentCommits;
    private rateLimiter;
    constructor();
    /**
     * Retrieves commits made by the current git user in the last specified hours.
     * This method is debounced and rate-limited for performance.
     *
     * @param hours The number of hours to look back (default 24).
     * @returns Promise<Array<GitCommit>> A list of commit objects.
     */
    getRecentCommits(hours?: number): Promise<GitCommit[]>;
    /**
     * Internal implementation of getRecentCommits without debouncing.
     */
    private getRecentCommitsInternal;
    /**
     * Actual implementation of getRecentCommits.
     */
    private getRecentCommitsInternalImpl;
    /**
     * Helper to get the git user.name from the repository config.
     */
    private getGitUserName;
    /**
     * Helper to escape special characters in strings passed to the shell.
     * Prevents issues if the username contains quotes (e.g., O'Connor).
     */
    private escapeShell;
    /**
     * Parses the raw text output from `git log` into an array of objects.
     *
     * Expected raw format structure:
     * hash1|timestamp1|message1
     * file1.js
     * file2.ts
     *
     * hash2|timestamp2|message2
     * file3.ts
     */
    private parseGitLogOutput;
    /**
     * Clear the commit cache
     */
    clearCache(): void;
    /**
     * Get cache size
     */
    getCacheSize(): number;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): import("../utils/performanceMonitor").PerformanceStats | null;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=gitTracker.d.ts.map