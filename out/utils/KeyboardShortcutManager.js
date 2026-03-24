"use strict";
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
exports.KeyboardShortcutManager = void 0;
const vscode = __importStar(require("vscode"));
class KeyboardShortcutManager {
    constructor() {
        this.shortcuts = new Map();
        this.conflicts = [];
        this.registerDefaultShortcuts();
    }
    /**
     * Register default keyboard shortcuts
     */
    registerDefaultShortcuts() {
        const defaults = [
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
    registerShortcut(shortcut) {
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
    checkConflict(shortcut) {
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
    getPlatformShortcut(shortcut, platform) {
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
    getPlatform() {
        return process.platform;
    }
    /**
     * Get all shortcuts
     */
    getShortcuts() {
        return Array.from(this.shortcuts.values());
    }
    /**
     * Get shortcuts by category
     */
    getShortcutsByCategory(category) {
        return Array.from(this.shortcuts.values()).filter(s => s.category === category);
    }
    /**
     * Get shortcut for command
     */
    getShortcut(command) {
        return this.shortcuts.get(command);
    }
    /**
     * Get display key for command
     */
    getDisplayKey(command) {
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
    formatShortcut(key) {
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
        }
        else {
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
    generateKeybindings() {
        const keybindings = [];
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
    async showShortcutHelp() {
        const categories = Array.from(new Set(Array.from(this.shortcuts.values()).map(s => s.category || 'Other'))).sort();
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
    exportShortcuts() {
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
    importShortcuts(json) {
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
        }
        catch (error) {
            throw new Error(`Failed to import shortcuts: ${error}`);
        }
    }
    /**
     * Get shortcut conflicts
     */
    getConflicts() {
        return [...this.conflicts];
    }
    /**
     * Resolve a conflict by choosing which shortcut to keep
     */
    resolveConflict(conflict, keep) {
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
    clearShortcuts() {
        this.shortcuts.clear();
        this.conflicts = [];
    }
    /**
     * Reset to default shortcuts
     */
    resetToDefaults() {
        this.clearShortcuts();
        this.registerDefaultShortcuts();
    }
    /**
     * Get statistics
     */
    getStatistics() {
        const byCategory = {};
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
exports.KeyboardShortcutManager = KeyboardShortcutManager;
//# sourceMappingURL=KeyboardShortcutManager.js.map