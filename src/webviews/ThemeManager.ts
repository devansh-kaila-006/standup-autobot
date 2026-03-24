/**
 * Theme Manager
 *
 * Provides theme management for webviews including:
 * - Dark/light theme detection
 * - Theme CSS generation
 * - Color palette management
 * - Theme change notifications
 */

import * as vscode from 'vscode';

export interface ThemeColors {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    border: string;
    card: string;
    text: string;
    textSecondary: string;
    shadow: string;
}

export interface ThemeConfig {
    colors: ThemeColors;
    fonts: {
        body: string;
        heading: string;
        code: string;
    };
    spacing: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
    };
    borderRadius: {
        sm: string;
        md: string;
        lg: string;
    };
}

export class ThemeManager {
    private currentTheme: 'light' | 'dark' | 'high-contrast';
    private disposables: vscode.Disposable[] = [];

    constructor() {
        this.currentTheme = this.detectTheme();
        this.setupThemeListener();
    }

    /**
     * Detect current VS Code theme
     */
    private detectTheme(): 'light' | 'dark' | 'high-contrast' {
        const theme = vscode.workspace.getConfiguration('workbench').get<string>('colorTheme');

        if (theme?.toLowerCase().includes('high contrast')) {
            return 'high-contrast';
        } else if (theme?.toLowerCase().includes('light') || theme?.toLowerCase().includes('light+')) {
            return 'light';
        }
        return 'dark';
    }

    /**
     * Setup theme change listener
     */
    private setupThemeListener(): void {
        const disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.colorTheme')) {
                this.currentTheme = this.detectTheme();
            }
        });
        this.disposables.push(disposable);
    }

    /**
     * Get current theme
     */
    public getTheme(): 'light' | 'dark' | 'high-contrast' {
        return this.currentTheme;
    }

    /**
     * Get theme configuration
     */
    public getThemeConfig(): ThemeConfig {
        const colors = this.getThemeColors();

        return {
            colors,
            fonts: {
                body: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                heading: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                code: '"Menlo", "Monaco", "Courier New", monospace',
            },
            spacing: {
                xs: '4px',
                sm: '8px',
                md: '16px',
                lg: '24px',
                xl: '32px',
            },
            borderRadius: {
                sm: '4px',
                md: '8px',
                lg: '12px',
            },
        };
    }

    /**
     * Get theme colors
     */
    private getThemeColors(): ThemeColors {
        const isDark = this.currentTheme === 'dark';
        const isHighContrast = this.currentTheme === 'high-contrast';

        if (isHighContrast) {
            return {
                background: '#000000',
                foreground: '#ffffff',
                primary: '#ffff00',
                secondary: '#00ffff',
                accent: '#ff00ff',
                success: '#00ff00',
                warning: '#ffff00',
                error: '#ff0000',
                border: '#ffffff',
                card: '#1a1a1a',
                text: '#ffffff',
                textSecondary: '#e0e0e0',
                shadow: 'rgba(255, 255, 255, 0.2)',
            };
        }

        if (isDark) {
            return {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                primary: '#007acc',
                secondary: '#3a3d41',
                accent: '#007acc',
                success: '#4ec9b0',
                warning: '#dcdcaa',
                error: '#f48771',
                border: '#3c3c3c',
                card: '#252526',
                text: '#cccccc',
                textSecondary: '#858585',
                shadow: 'rgba(0, 0, 0, 0.3)',
            };
        }

        return {
            background: '#ffffff',
            foreground: '#333333',
            primary: '#0066cc',
            secondary: '#f0f0f0',
            accent: '#0066cc',
            success: '#008000',
            warning: '#9a6700',
            error: '#cd3131',
            border: '#e0e0e0',
            card: '#f8f8f8',
            text: '#333333',
            textSecondary: '#666666',
            shadow: 'rgba(0, 0, 0, 0.1)',
        };
    }

    /**
     * Get CSS for theme
     */
    public getThemeCSS(): string {
        const config = this.getThemeConfig();
        const c = config.colors;

        return `
            :root {
                --background-color: ${c.background};
                --foreground-color: ${c.foreground};
                --primary-color: ${c.primary};
                --secondary-color: ${c.secondary};
                --accent-color: ${c.accent};
                --success-color: ${c.success};
                --warning-color: ${c.warning};
                --error-color: ${c.error};
                --border-color: ${c.border};
                --card-color: ${c.card};
                --text-color: ${c.text};
                --text-secondary-color: ${c.textSecondary};
                --shadow-color: ${c.shadow};

                --font-body: ${config.fonts.body};
                --font-heading: ${config.fonts.heading};
                --font-code: ${config.fonts.code};

                --spacing-xs: ${config.spacing.xs};
                --spacing-sm: ${config.spacing.sm};
                --spacing-md: ${config.spacing.md};
                --spacing-lg: ${config.spacing.lg};
                --spacing-xl: ${config.spacing.xl};

                --border-radius-sm: ${config.borderRadius.sm};
                --border-radius-md: ${config.borderRadius.md};
                --border-radius-lg: ${config.borderRadius.lg};
            }

            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: var(--font-body);
                background-color: var(--background-color);
                color: var(--text-color);
                line-height: 1.6;
                padding: var(--spacing-md);
            }

            h1, h2, h3, h4, h5, h6 {
                font-family: var(--font-heading);
                font-weight: 600;
                margin-bottom: var(--spacing-md);
                color: var(--foreground-color);
            }

            h1 { font-size: 2rem; }
            h2 { font-size: 1.5rem; }
            h3 { font-size: 1.25rem; }
            h4 { font-size: 1rem; }

            p {
                margin-bottom: var(--spacing-md);
            }

            a {
                color: var(--primary-color);
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }

            button {
                font-family: var(--font-body);
                font-size: 0.875rem;
                padding: var(--spacing-sm) var(--spacing-md);
                border: none;
                border-radius: var(--border-radius-md);
                background-color: var(--primary-color);
                color: white;
                cursor: pointer;
                transition: background-color 0.2s;
            }

            button:hover {
                background-color: var(--accent-color);
            }

            button:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            button.secondary {
                background-color: var(--secondary-color);
                color: var(--text-color);
            }

            button.success {
                background-color: var(--success-color);
            }

            button.warning {
                background-color: var(--warning-color);
            }

            button.error {
                background-color: var(--error-color);
            }

            .card {
                background-color: var(--card-color);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-lg);
                padding: var(--spacing-md);
                margin-bottom: var(--spacing-md);
                box-shadow: 0 2px 4px var(--shadow-color);
            }

            .button-group {
                display: flex;
                gap: var(--spacing-sm);
                flex-wrap: wrap;
            }

            .button-group button {
                flex: 1;
                min-width: 120px;
            }

            input, textarea, select {
                font-family: var(--font-body);
                font-size: 0.875rem;
                padding: var(--spacing-sm);
                border: 1px solid var(--border-color);
                border-radius: var(--border-radius-sm);
                background-color: var(--background-color);
                color: var(--text-color);
                width: 100%;
            }

            input:focus, textarea:focus, select:focus {
                outline: 2px solid var(--primary-color);
                outline-offset: -2px;
            }

            code {
                font-family: var(--font-code);
                background-color: var(--secondary-color);
                padding: 2px 6px;
                border-radius: var(--border-radius-sm);
                font-size: 0.875em;
            }

            pre {
                background-color: var(--secondary-color);
                padding: var(--spacing-md);
                border-radius: var(--border-radius-md);
                overflow-x: auto;
            }

            pre code {
                background-color: transparent;
                padding: 0;
            }

            .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .badge.success {
                background-color: var(--success-color);
                color: white;
            }

            .badge.warning {
                background-color: var(--warning-color);
                color: black;
            }

            .badge.error {
                background-color: var(--error-color);
                color: white;
            }

            .badge.info {
                background-color: var(--primary-color);
                color: white;
            }

            .spinner {
                border: 2px solid var(--secondary-color);
                border-top: 2px solid var(--primary-color);
                border-radius: 50%;
                width: 20px;
                height: 20px;
                animation: spin 1s linear infinite;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }

            .sr-only {
                position: absolute;
                width: 1px;
                height: 1px;
                padding: 0;
                margin: -1px;
                overflow: hidden;
                clip: rect(0, 0, 0, 0);
                white-space: nowrap;
                border-width: 0;
            }

            [role="button"] {
                cursor: pointer;
            }

            [role="button"]:focus {
                outline: 2px solid var(--primary-color);
                outline-offset: 2px;
            }
        `;
    }

    /**
     * Get nonce for security
     */
    public getNonce(): string {
        let text = '';
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        for (let i = 0; i < 32; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
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
