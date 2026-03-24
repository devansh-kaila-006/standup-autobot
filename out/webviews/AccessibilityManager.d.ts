/**
 * Accessibility Manager
 *
 * Provides accessibility features including:
 * - Keyboard navigation
 * - Screen reader support
 * - ARIA label generation
 * - Focus management
 * - High contrast mode support
 */
export interface KeyboardShortcut {
    key: string;
    command: string;
    when?: string;
    mac?: string;
}
export interface AriaLabel {
    label: string;
    description?: string;
    live?: 'polite' | 'assertive';
    atomic?: boolean;
}
export declare class AccessibilityManager {
    private shortcuts;
    private disposables;
    constructor();
    /**
     * Register default keyboard shortcuts
     */
    private registerDefaultShortcuts;
    /**
     * Register a keyboard shortcut
     */
    registerShortcut(shortcut: KeyboardShortcut): void;
    /**
     * Get all shortcuts
     */
    getShortcuts(): KeyboardShortcut[];
    /**
     * Get shortcut for command
     */
    getShortcut(command: string): KeyboardShortcut | undefined;
    /**
     * Generate ARIA label
     */
    generateAriaLabel(config: AriaLabel): string;
    /**
     * Generate ARIA attributes
     */
    generateAriaAttributes(config: AriaLabel): Record<string, string>;
    /**
     * Generate accessible HTML structure
     */
    generateAccessibleHTML(options: {
        tag: string;
        content: string;
        role?: string;
        aria?: AriaLabel;
        tabindex?: number;
        attributes?: Record<string, string>;
    }): string;
    /**
     * Generate accessible button HTML
     */
    generateButton(options: {
        label: string;
        description?: string;
        id?: string;
        disabled?: boolean;
        primary?: boolean;
        onclick: string;
    }): string;
    /**
     * Generate accessible input HTML
     */
    generateInput(options: {
        label: string;
        id: string;
        type?: string;
        placeholder?: string;
        required?: boolean;
        value?: string;
        description?: string;
    }): string;
    /**
     * Generate screen reader announcement
     */
    generateAnnouncement(message: string, priority?: 'polite' | 'assertive'): string;
    /**
     * Generate skip navigation link
     */
    generateSkipLink(target: string, label?: string): string;
    /**
     * Generate focus trap HTML
     */
    generateFocusTrap(options: {
        id: string;
        content: string;
        onEscape?: string;
    }): string;
    /**
     * Check if screen reader is active
     */
    isScreenReaderActive(): boolean;
    /**
     * Get focus visible styles
     */
    getFocusVisibleCSS(): string;
    /**
     * Generate landmarks for page structure
     */
    generateLandmarks(options: {
        header?: string;
        main?: string;
        nav?: string;
        footer?: string;
    }): string;
    /**
     * Generate accessible table HTML
     */
    generateTable(options: {
        headers: string[];
        rows: string[][];
        caption?: string;
        summary?: string;
    }): string;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=AccessibilityManager.d.ts.map