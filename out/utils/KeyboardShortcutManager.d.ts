/**
 * Keyboard Shortcut Manager
 *
 * Provides keyboard shortcut management including:
 * - Shortcut registration
 * - Shortcut conflict detection
 * - Platform-specific shortcuts (Win/Mac/Linux)
 * - Custom shortcut configuration
 * - Shortcut help panel
 */
export interface ShortcutConfig {
    key: string;
    mac?: string;
    linux?: string;
    command: string;
    when?: string;
    description: string;
    category?: string;
}
export interface ShortcutConflict {
    shortcut: string;
    existing: ShortcutConfig;
    new: ShortcutConfig;
}
export declare class KeyboardShortcutManager {
    private shortcuts;
    private conflicts;
    constructor();
    /**
     * Register default keyboard shortcuts
     */
    private registerDefaultShortcuts;
    /**
     * Register a custom shortcut
     */
    registerShortcut(shortcut: ShortcutConfig): ShortcutConflict | null;
    /**
     * Check for shortcut conflicts
     */
    private checkConflict;
    /**
     * Get platform-specific shortcut
     */
    private getPlatformShortcut;
    /**
     * Get current platform
     */
    private getPlatform;
    /**
     * Get all shortcuts
     */
    getShortcuts(): ShortcutConfig[];
    /**
     * Get shortcuts by category
     */
    getShortcutsByCategory(category: string): ShortcutConfig[];
    /**
     * Get shortcut for command
     */
    getShortcut(command: string): ShortcutConfig | undefined;
    /**
     * Get display key for command
     */
    getDisplayKey(command: string): string;
    /**
     * Format shortcut key for display
     */
    private formatShortcut;
    /**
     * Generate keybindings.json content
     */
    generateKeybindings(): any[];
    /**
     * Show shortcut help panel
     */
    showShortcutHelp(): Promise<void>;
    /**
     * Export shortcuts as JSON
     */
    exportShortcuts(): string;
    /**
     * Import shortcuts from JSON
     */
    importShortcuts(json: string): number;
    /**
     * Get shortcut conflicts
     */
    getConflicts(): ShortcutConflict[];
    /**
     * Resolve a conflict by choosing which shortcut to keep
     */
    resolveConflict(conflict: ShortcutConflict, keep: 'existing' | 'new'): void;
    /**
     * Clear all shortcuts
     */
    clearShortcuts(): void;
    /**
     * Reset to default shortcuts
     */
    resetToDefaults(): void;
    /**
     * Get statistics
     */
    getStatistics(): {
        totalShortcuts: number;
        conflicts: number;
        byCategory: Record<string, number>;
    };
}
//# sourceMappingURL=KeyboardShortcutManager.d.ts.map