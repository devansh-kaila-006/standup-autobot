/**
 * SVG Icon Utilities
 *
 * Provides custom SVG icons to replace emojis throughout the application.
 * All SVGs are inline and optimized for webview display.
 */
export declare class SVGIcons {
    /**
     * Robot icon (replaces 🤖)
     */
    static robot(): string;
    /**
     * Check mark icon (replaces ✅)
     */
    static checkmark(): string;
    /**
     * Refresh/rotate icon (replaces 🔄)
     */
    static refresh(): string;
    /**
     * Target icon (replaces 🎯)
     */
    static target(): string;
    /**
     * Chart icon (replaces 📊)
     */
    static chart(): string;
    /**
     * Trending up icon (replaces 📈)
     */
    static trendingUp(): string;
    /**
     * Shield icon (replaces 🛡️)
     */
    static shield(): string;
    /**
     * Warning icon (replaces ⚠️)
     */
    static warning(): string;
    /**
     * Wave/hello icon (replaces 👋)
     */
    static wave(): string;
    /**
     * Rocket icon (replaces 🚀)
     */
    static rocket(): string;
    /**
     * Party/celebration icon (replaces 🎉)
     */
    static celebration(): string;
    /**
     * X/close icon (replaces ❌)
     */
    static xmark(): string;
    /**
     * Info icon (replaces ℹ️)
     */
    static info(): string;
    /**
     * Get icon as HTML image tag
     */
    static asImg(svgString: string, alt: string, className?: string): string;
    /**
     * Get inline SVG with wrapper div
     */
    static asDiv(svgString: string, className?: string): string;
}
/**
 * Icon name mapping for easy access
 */
export declare const Icons: {
    robot: () => string;
    checkmark: () => string;
    refresh: () => string;
    target: () => string;
    chart: () => string;
    trendingUp: () => string;
    shield: () => string;
    warning: () => string;
    wave: () => string;
    rocket: () => string;
    celebration: () => string;
    xmark: () => string;
    info: () => string;
};
//# sourceMappingURL=iconUtils.d.ts.map