/**
 * Terminal Tracker - Cross-Platform Terminal Command Tracking
 *
 * This module tracks terminal commands executed by the user across different platforms
 * and shell types. It supports multiple tracking strategies with configurable modes.
 *
 * ## Configuration
 *
 * Enable/disable terminal tracking in VS Code settings:
 * - `standup.enableTerminalTracking`: Master switch (default: true)
 * - `standup.terminalTrackingMode`: Tracking mode
 *   - `integrated`: Track VS Code integrated terminals only
 *   - `history`: Read shell history files only
 *   - `both`: Use both methods (recommended for best coverage)
 *
 * ## Supported Platforms and Shells
 *
 * ### Windows
 * - PowerShell (with PSReadline history)
 * - Command Prompt (cmd)
 * - Git Bash
 * - Zsh (if installed)
 *
 * ### macOS/Linux
 * - Bash (with .bash_history)
 * - Zsh (with .zsh_history, including timestamp format)
 * - Fish shell (with fish_history)
 *
 * ## Limitations and Known Issues
 *
 * 1. **Integrated Terminal Tracking**
 *    - Only tracks commands in VS Code integrated terminals
 *    - Does not capture commands from external terminal windows
 *    - Requires terminal to be created/active during VS Code session
 *
 * 2. **Shell History File Reading**
 *    - May not capture commands from external terminals immediately
 *    - History files may be buffered by the shell
 *    - Some shells may not write to history files immediately
 *    - File permissions may prevent reading history files
 *
 * 3. **Cross-Platform Considerations**
 *    - Windows PowerShell history location may vary by version
 *    - macOS/Linux shell histories depend on user's default shell
 *    - Some shells (like fish) have different history formats
 *
 * 4. **Security and Privacy**
 *    - Commands may contain sensitive information (passwords, tokens)
 *    - History files are not encrypted
 *    - Use with caution in shared environments
 *
 * ## Recommendations
 *
 * - Use `both` tracking mode for best coverage
 * - Be aware that sensitive commands may be tracked
 * - Regularly review and clear terminal history if needed
 * - Consider using ignore patterns for sensitive projects
 *
 * @example
 * ```typescript
 * const tracker = new TerminalTracker();
 * tracker.initialize();
 * const commands = await tracker.getTerminalHistory(20);
 * console.log('Recent commands:', commands);
 * ```
 */
export interface TerminalCommand {
    command: string;
    timestamp: number;
    shell: string;
}
export declare class TerminalTracker {
    private trackedTerminals;
    private commandHistory;
    private readonly maxHistorySize;
    private disposables;
    /**
     * Initialize terminal tracking with VS Code terminal integration
     * Respects user configuration settings for terminal tracking mode
     */
    initialize(): void;
    /**
     * Start tracking a terminal
     */
    private trackTerminal;
    /**
     * Stop tracking a terminal
     */
    private untrackTerminal;
    /**
     * Get unique identifier for a terminal
     */
    private getTerminalId;
    /**
     * Detect shell type from terminal name and platform
     */
    private detectShellType;
    /**
     * Returns an array of recently run commands from all available sources.
     * Supports cross-platform shell history files and VS Code terminal integration.
     *
     * Respects the following configuration settings:
     * - standup.enableTerminalTracking: Master enable/disable switch
     * - standup.terminalTrackingMode: 'integrated', 'history', or 'both'
     * - standup.paused: Global tracking pause flag
     *
     * @param limit Maximum number of commands to return
     * @returns Array of terminal commands
     */
    getTerminalHistory(limit?: number): Promise<string[]>;
    /**
     * Get command history from shell history files (cross-platform)
     */
    private getShellHistoryFiles;
    /**
     * Get shell history file paths based on platform
     */
    private getShellHistoryPaths;
    /**
     * Parse history file content based on file type
     */
    private parseHistoryFile;
    /**
     * Parse zsh history format (with timestamps)
     * Format: : timestamp:duration;command or : timestamp:duration:command
     */
    private parseZshHistory;
    /**
     * Parse fish shell history format
     */
    private parseFishHistory;
    /**
     * Check if a line is metadata/comment
     */
    private isMetadataLine;
    /**
     * Get commands from tracked VS Code terminals
     */
    private getTrackedTerminalCommands;
    /**
     * Fallback history retrieval for platforms without shell history files
     */
    private getFallbackHistory;
    /**
     * Windows-specific fallback using PowerShell/Get-History
     */
    private getWindowsFallback;
    /**
     * Unix-specific fallback using shell history command
     */
    private getUnixFallback;
    /**
     * A stub function to represent running doskey or PowerShell Get-History.
     * Maintained for backward compatibility with existing tests.
     * In a real environment, this requires attaching to the specific terminal process PID.
     */
    private getDoskeyStub;
    /**
     * Add a command to the tracked history
     */
    addCommand(command: string, shell: string): void;
    /**
     * Get statistics about tracked terminals
     */
    getTerminalStats(): {
        trackedTerminals: number;
        totalCommands: number;
        shells: string[];
    };
    /**
     * Clean up resources
     */
    dispose(): void;
}
//# sourceMappingURL=terminalTracker.d.ts.map