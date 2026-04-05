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

import * as vscode from 'vscode';

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

export class AccessibilityManager {
    private shortcuts: Map<string, KeyboardShortcut> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.registerDefaultShortcuts();
    }

    /**
     * Register default keyboard shortcuts
     */
    private registerDefaultShortcuts(): void {
        const defaultShortcuts: KeyboardShortcut[] = [
            {
                key: 'ctrl+alt+s',
                command: 'standup.generateStandup',
                mac: 'cmd+alt+s',
            },
            {
                key: 'ctrl+alt+h',
                command: 'standup.showHistory',
                mac: 'cmd+alt+h',
            },
            {
                key: 'ctrl+alt+c',
                command: 'standup.copyToClipboard',
                mac: 'cmd+alt+c',
            },
            {
                key: 'ctrl+alt+d',
                command: 'standup.dataAudit',
                mac: 'cmd+alt+d',
            },
            {
                key: 'ctrl+alt+n',
                command: 'standup.showNotifications',
                mac: 'cmd+alt+n',
            },
        ];

        for (const shortcut of defaultShortcuts) {
            this.shortcuts.set(shortcut.command, shortcut);
        }
    }

    /**
     * Register a keyboard shortcut
     */
    public registerShortcut(shortcut: KeyboardShortcut): void {
        this.shortcuts.set(shortcut.command, shortcut);
    }

    /**
     * Get all shortcuts
     */
    public getShortcuts(): KeyboardShortcut[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Get shortcut for command
     */
    public getShortcut(command: string): KeyboardShortcut | undefined {
        return this.shortcuts.get(command);
    }

    /**
     * Generate ARIA label
     */
    public generateAriaLabel(config: AriaLabel): string {
        let label = config.label;

        if (config.description) {
            label += `. ${config.description}`;
        }

        return label;
    }

    /**
     * Generate ARIA attributes
     */
    public generateAriaAttributes(config: AriaLabel): Record<string, string> {
        const attrs: Record<string, string> = {};

        attrs['aria-label'] = this.generateAriaLabel(config);

        if (config.live) {
            attrs['aria-live'] = config.live;
        }

        if (config.atomic) {
            attrs['aria-atomic'] = 'true';
        }

        return attrs;
    }

    /**
     * Generate accessible HTML structure
     */
    public generateAccessibleHTML(options: {
        tag: string;
        content: string;
        role?: string;
        aria?: AriaLabel;
        tabindex?: number;
        attributes?: Record<string, string>;
    }): string {
        const attrs: string[] = [];

        if (options.role) {
            attrs.push(`role="${options.role}"`);
        }

        if (options.aria) {
            const ariaAttrs = this.generateAriaAttributes(options.aria);
            for (const [key, value] of Object.entries(ariaAttrs)) {
                attrs.push(`${key}="${value}"`);
            }
        }

        if (options.tabindex !== undefined) {
            attrs.push(`tabindex="${options.tabindex}"`);
        }

        if (options.attributes) {
            for (const [key, value] of Object.entries(options.attributes)) {
                attrs.push(`${key}="${value}"`);
            }
        }

        const attrString = attrs.length > 0 ? ` ${attrs.join(' ')}` : '';

        return `<${options.tag}${attrString}>${options.content}</${options.tag}>`;
    }

    /**
     * Generate accessible button HTML
     */
    public generateButton(options: {
        label: string;
        description?: string;
        id?: string;
        disabled?: boolean;
        primary?: boolean;
        onclick: string;
    }): string {
        const aria: AriaLabel = {
            label: options.label,
            description: options.description,
        };

        const attributes: Record<string, string> = {
            type: 'button',
        };

        if (options.id) {
            attributes.id = options.id;
        }

        if (options.disabled) {
            attributes.disabled = 'disabled';
        }

        if (options.primary) {
            attributes.class = 'primary';
        }

        attributes.onclick = options.onclick;

        return this.generateAccessibleHTML({
            tag: 'button',
            content: options.label,
            role: 'button',
            aria,
            tabindex: 0,
            attributes,
        });
    }

    /**
     * Generate accessible input HTML
     */
    public generateInput(options: {
        label: string;
        id: string;
        type?: string;
        placeholder?: string;
        required?: boolean;
        value?: string;
        description?: string;
    }): string {
        const aria: AriaLabel = {
            label: options.label,
            description: options.description,
        };

        const attributes: Record<string, string> = {
            id: options.id,
            name: options.id,
            type: options.type || 'text',
        };

        if (options.placeholder) {
            attributes.placeholder = options.placeholder;
        }

        if (options.required) {
            attributes.required = 'required';
            attributes['aria-required'] = 'true';
        }

        if (options.value) {
            attributes.value = options.value;
        }

        const inputHTML = this.generateAccessibleHTML({
            tag: 'input',
            content: '',
            aria,
            attributes,
        });

        const labelHTML = `<label for="${options.id}">${options.label}</label>`;

        return `<div class="form-group">${labelHTML}${inputHTML}</div>`;
    }

    /**
     * Generate screen reader announcement
     */
    public generateAnnouncement(message: string, priority: 'polite' | 'assertive' = 'polite'): string {
        return `<div aria-live="${priority}" aria-atomic="true" class="sr-only">${message}</div>`;
    }

    /**
     * Generate skip navigation link
     */
    public generateSkipLink(target: string, label: string = 'Skip to main content'): string {
        return `<a href="${target}" class="skip-link">${label}</a>`;
    }

    /**
     * Generate focus trap HTML
     */
    public generateFocusTrap(options: {
        id: string;
        content: string;
        onEscape?: string;
    }): string {
        const script = `
            <script>
                (function() {
                    const trap = document.getElementById('${options.id}');
                    if (!trap) return;

                    const focusableElements = trap.querySelectorAll(
                        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                    );

                    const firstFocusable = focusableElements[0];
                    const lastFocusable = focusableElements[focusableElements.length - 1];

                    trap.addEventListener('keydown', function(e) {
                        if (e.key === 'Tab') {
                            if (e.shiftKey) {
                                if (document.activeElement === firstFocusable) {
                                    lastFocusable.focus();
                                    e.preventDefault();
                                }
                            } else {
                                if (document.activeElement === lastFocusable) {
                                    firstFocusable.focus();
                                    e.preventDefault();
                                }
                            }
                        }

                        if (e.key === 'Escape' ${options.onEscape ? `&& ${options.onEscape}` : ''}) {
                            trap.blur();
                        }
                    });

                    // Set initial focus
                    if (firstFocusable) {
                        firstFocusable.focus();
                    }
                })();
            </script>
        `;

        return `<div id="${options.id}" tabindex="-1">${options.content}${script}</div>`;
    }

    /**
     * Check if screen reader is active
     */
    public isScreenReaderActive(): boolean {
        // Check for common screen reader indicators (only in browser context)
        if (typeof (globalThis as any).window !== 'undefined' && (globalThis as any).window?.navigator) {
            const win = (globalThis as any).window;
            return (
                win.navigator.userAgent.includes('JAWS') ||
                win.navigator.userAgent.includes('NVDA') ||
                win.navigator.userAgent.includes('VOICEOVER') ||
                win.speechSynthesis !== undefined
            );
        }
        return false;
    }

    /**
     * Get focus visible styles
     */
    public getFocusVisibleCSS(): string {
        return `
            /* Focus visible styles for keyboard navigation */
            *:focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }

            /* Remove outline for mouse users */
            *:focus:not(:focus-visible) {
                outline: none;
            }

            /* Skip link styles */
            .skip-link {
                position: absolute;
                top: -40px;
                left: 0;
                background: var(--primary-color);
                color: white;
                padding: 8px;
                text-decoration: none;
                z-index: 100;
            }

            .skip-link:focus {
                top: 0;
            }

            /* High contrast mode support */
            @media (prefers-contrast: high) {
                *:focus-visible {
                    outline: 3px solid currentColor;
                    outline-offset: 2px;
                }
            }

            /* Reduced motion support */
            @media (prefers-reduced-motion: reduce) {
                *,
                *::before,
                *::after {
                    animation-duration: 0.01ms !important;
                    animation-iteration-count: 1 !important;
                    transition-duration: 0.01ms !important;
                }
            }
        `;
    }

    /**
     * Generate landmarks for page structure
     */
    public generateLandmarks(options: {
        header?: string;
        main?: string;
        nav?: string;
        footer?: string;
    }): string {
        const parts: string[] = [];

        if (options.header) {
            parts.push(`<header role="banner">${options.header}</header>`);
        }

        if (options.nav) {
            parts.push(`<nav role="navigation" aria-label="Main navigation">${options.nav}</nav>`);
        }

        if (options.main) {
            parts.push(`<main role="main">${options.main}</main>`);
        }

        if (options.footer) {
            parts.push(`<footer role="contentinfo">${options.footer}</footer>`);
        }

        return parts.join('\n');
    }

    /**
     * Generate accessible table HTML
     */
    public generateTable(options: {
        headers: string[];
        rows: string[][];
        caption?: string;
        summary?: string;
    }): string {
        const headerRow = options.headers.map(h => `<th scope="col">${h}</th>`).join('');
        const rows = options.rows.map(row => {
            const cells = row.map(cell => `<td>${cell}</td>`).join('');
            return `<tr>${cells}</tr>`;
        }).join('');

        const caption = options.caption ? `<caption>${options.caption}</caption>` : '';

        return `
            <table${options.summary ? ` summary="${options.summary}"` : ''}>
                ${caption}
                <thead>
                    <tr>${headerRow}</tr>
                </thead>
                <tbody>
                    ${rows}
                </tbody>
            </table>
        `;
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
