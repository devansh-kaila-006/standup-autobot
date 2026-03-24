/**
 * Theme Manager
 *
 * Provides theme management for webviews including:
 * - Dark/light theme detection
 * - Theme CSS generation
 * - Color palette management
 * - Theme change notifications
 */
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
export declare class ThemeManager {
    private currentTheme;
    private disposables;
    constructor();
    /**
     * Detect current VS Code theme
     */
    private detectTheme;
    /**
     * Setup theme change listener
     */
    private setupThemeListener;
    /**
     * Get current theme
     */
    getTheme(): 'light' | 'dark' | 'high-contrast';
    /**
     * Get theme configuration
     */
    getThemeConfig(): ThemeConfig;
    /**
     * Get theme colors
     */
    private getThemeColors;
    /**
     * Get CSS for theme
     */
    getThemeCSS(): string;
    /**
     * Get nonce for security
     */
    getNonce(): string;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=ThemeManager.d.ts.map