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

import * as vscode from 'vscode';

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

export class KeyboardShortcutManager {
    private shortcuts: Map<string, ShortcutConfig> = new Map();
    private conflicts: ShortcutConflict[] = [];

    constructor() {
        this.registerDefaultShortcuts();
    }

    /**
     * Register default keyboard shortcuts
     */
    private registerDefaultShortcuts(): void {
        const defaults: ShortcutConfig[] = [
            // Standup commands
            {
                key: 'ctrl+alt+s',
                mac: 'cmd+alt+s',
                command: 'standup.generateStandup',
                description: 'Generate Standup',
                category: 'Standup',
            },
            {
                key: 'ctrl+alt+c',
                mac: 'cmd+alt+c',
                command: 'standup.copyToClipboard',
                description: 'Copy Standup to Clipboard',
                category: 'Standup',
            },
            {
                key: 'ctrl+alt+e',
                mac: 'cmd+alt+e',
                command: 'standup.export',
                description: 'Export Standup',
                category: 'Standup',
            },

            // View commands
            {
                key: 'ctrl+alt+h',
                mac: 'cmd+alt+h',
                command: 'standup.showHistory',
                description: 'Show Standup History',
                category: 'Views',
            },
            {
                key: 'ctrl+alt+a',
                mac: 'cmd+alt+a',
                command: 'standup.showAnalytics',
                description: 'Show Analytics Dashboard',
                category: 'Views',
            },
            {
                key: 'ctrl+alt+d',
                mac: 'cmd+alt+d',
                command: 'standup.dataAudit',
                description: 'Show Data Audit Panel',
                category: 'Views',
            },

            // Notification commands
            {
                key: 'ctrl+alt+n',
                mac: 'cmd+alt+n',
                command: 'standup.showNotifications',
                description: 'Show Notifications',
                category: 'Notifications',
            },
            {
                key: 'ctrl+alt+r',
                mac: 'cmd+alt+r',
                command: 'standup.markNotificationsRead',
                description: 'Mark All Notifications as Read',
                category: 'Notifications',
            },

            // Settings commands
            {
                key: 'ctrl+alt+,',
                mac: 'cmd+alt+,',
                command: 'standup.configureSettings',
                description: 'Open Settings',
                category: 'Settings',
            },

            // Timer commands
            {
                key: 'ctrl+alt+t',
                mac: 'cmd+alt+t',
                command: 'standup.toggleTimer',
                description: 'Toggle Activity Timer',
                category: 'Timer',
            },
        ];

        for (const shortcut of defaults) {
            this.shortcuts.set(shortcut.command, shortcut);
        }
    }

    /**
     * Register a custom shortcut
     */
    public registerShortcut(shortcut: ShortcutConfig): ShortcutConflict | null {
        // Check for conflicts
        const conflict = this.checkConflict(shortcut);
        if (conflict) {
            this.conflicts.push(conflict);
            return conflict;
        }

        this.shortcuts.set(shortcut.command, shortcut);
        return null;
    }

    /**
     * Check for shortcut conflicts
     */
    private checkConflict(shortcut: ShortcutConfig): ShortcutConflict | null {
        const platform = this.getPlatform();
        const shortcutKey = this.getPlatformShortcut(shortcut, platform);

        for (const [command, existing] of Array.from(this.shortcuts.entries())) {
            const existingKey = this.getPlatformShortcut(existing, platform);

            if (shortcutKey === existingKey) {
                return {
                    shortcut: shortcutKey,
                    existing,
                    new: shortcut,
                };
            }
        }

        return null;
    }

    /**
     * Get platform-specific shortcut
     */
    private getPlatformShortcut(shortcut: ShortcutConfig, platform: string): string {
        switch (platform) {
            case 'darwin':
                return shortcut.mac || shortcut.key;
            case 'linux':
                return shortcut.linux || shortcut.key;
            default:
                return shortcut.key;
        }
    }

    /**
     * Get current platform
     */
    private getPlatform(): string {
        return process.platform;
    }

    /**
     * Get all shortcuts
     */
    public getShortcuts(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Get shortcuts by category
     */
    public getShortcutsByCategory(category: string): ShortcutConfig[] {
        return Array.from(this.shortcuts.values()).filter(s => s.category === category);
    }

    /**
     * Get shortcut for command
     */
    public getShortcut(command: string): ShortcutConfig | undefined {
        return this.shortcuts.get(command);
    }

    /**
     * Get display key for command
     */
    public getDisplayKey(command: string): string {
        const shortcut = this.shortcuts.get(command);
        if (!shortcut) {
            return '';
        }

        const platform = this.getPlatform();
        return this.formatShortcut(this.getPlatformShortcut(shortcut, platform));
    }

    /**
     * Format shortcut key for display
     */
    private formatShortcut(key: string): string {
        const platform = this.getPlatform();

        // Convert to platform-specific format
        let formatted = key;

        if (platform === 'darwin') {
            formatted = formatted
                .replace(/ctrl/g, '⌃')
                .replace(/alt/g, '⌥')
                .replace(/shift/g, '⇧')
                .replace(/cmd/g, '⌘')
                .replace(/\+/g, '');
        } else {
            formatted = formatted
                .replace(/ctrl/g, 'Ctrl')
                .replace(/alt/g, 'Alt')
                .replace(/shift/g, 'Shift')
                .replace(/cmd/g, 'Win');
        }

        return formatted;
    }

    /**
     * Generate keybindings.json content
     */
    public generateKeybindings(): any[] {
        const keybindings: any[] = [];

        for (const shortcut of Array.from(this.shortcuts.values())) {
            keybindings.push({
                key: shortcut.key,
                mac: shortcut.mac,
                linux: shortcut.linux,
                command: shortcut.command,
                when: shortcut.when,
            });
        }

        return keybindings;
    }

    /**
     * Show shortcut help panel
     */
    public async showShortcutHelp(): Promise<void> {
        const categories = Array.from(new Set(
            Array.from(this.shortcuts.values()).map(s => s.category || 'Other')
        )).sort();

        const items = categories.flatMap(category => {
            const shortcuts = this.getShortcutsByCategory(category);
            return shortcuts.map(s => ({
                label: this.getDisplayKey(s.command),
                description: s.description,
                category,
            }));
        });

        // Create QuickPick items
        const qpItems = items.map(item => ({
            label: item.label || 'No shortcut',
            description: item.description,
            detail: item.category,
        }));

        await vscode.window.showQuickPick(qpItems, {
            placeHolder: 'Keyboard Shortcuts',
            matchOnDescription: true,
        });
    }

    /**
     * Export shortcuts as JSON
     */
    public exportShortcuts(): string {
        const data = {
            version: 1,
            shortcuts: Array.from(this.shortcuts.entries()).map(([command, config]) => ({
                command,
                key: config.key,
                mac: config.mac,
                linux: config.linux,
                description: config.description,
                category: config.category,
            })),
        };

        return JSON.stringify(data, null, 2);
    }

    /**
     * Import shortcuts from JSON
     */
    public importShortcuts(json: string): number {
        try {
            const data = JSON.parse(json);

            if (data.version !== 1) {
                throw new Error('Unsupported shortcuts file version');
            }

            let imported = 0;

            for (const shortcut of data.shortcuts) {
                const conflict = this.registerShortcut({
                    key: shortcut.key,
                    mac: shortcut.mac,
                    linux: shortcut.linux,
                    command: shortcut.command,
                    description: shortcut.description,
                    category: shortcut.category,
                });

                if (!conflict) {
                    imported++;
                }
            }

            return imported;
        } catch (error) {
            throw new Error(`Failed to import shortcuts: ${error}`);
        }
    }

    /**
     * Get shortcut conflicts
     */
    public getConflicts(): ShortcutConflict[] {
        return [...this.conflicts];
    }

    /**
     * Resolve a conflict by choosing which shortcut to keep
     */
    public resolveConflict(conflict: ShortcutConflict, keep: 'existing' | 'new'): void {
        if (keep === 'new') {
            // Remove existing, add new
            this.shortcuts.delete(conflict.existing.command);
            this.shortcuts.set(conflict.new.command, conflict.new);
        }

        // Remove from conflicts list
        this.conflicts = this.conflicts.filter(c => c !== conflict);
    }

    /**
     * Clear all shortcuts
     */
    public clearShortcuts(): void {
        this.shortcuts.clear();
        this.conflicts = [];
    }

    /**
     * Reset to default shortcuts
     */
    public resetToDefaults(): void {
        this.clearShortcuts();
        this.registerDefaultShortcuts();
    }

    /**
     * Get statistics
     */
    public getStatistics(): {
        totalShortcuts: number;
        conflicts: number;
        byCategory: Record<string, number>;
    } {
        const byCategory: Record<string, number> = {};

        for (const shortcut of Array.from(this.shortcuts.values())) {
            const category = shortcut.category || 'Other';
            byCategory[category] = (byCategory[category] || 0) + 1;
        }

        return {
            totalShortcuts: this.shortcuts.size,
            conflicts: this.conflicts.length,
            byCategory,
        };
    }
}
