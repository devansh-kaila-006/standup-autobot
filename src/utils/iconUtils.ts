/**
 * SVG Icon Utilities
 *
 * Provides custom SVG icons to replace emojis throughout the application.
 * All SVGs are inline and optimized for webview display.
 */

export class SVGIcons {
    /**
     * Robot icon (replaces 🤖)
     */
    static robot(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2"/>
            <circle cx="12" cy="5" r="2"/>
            <path d="M12 7v4"/>
            <line x1="8" y1="16" x2="8" y2="16"/>
            <line x1="16" y1="16" x2="16" y2="16"/>
        </svg>`;
    }

    /**
     * Check mark icon (replaces ✅)
     */
    static checkmark(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>`;
    }

    /**
     * Refresh/rotate icon (replaces 🔄)
     */
    static refresh(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>`;
    }

    /**
     * Target icon (replaces 🎯)
     */
    static target(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="6"/>
            <circle cx="12" cy="12" r="2"/>
        </svg>`;
    }

    /**
     * Chart icon (replaces 📊)
     */
    static chart(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>`;
    }

    /**
     * Trending up icon (replaces 📈)
     */
    static trendingUp(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
            <polyline points="17 6 23 6 23 12"/>
        </svg>`;
    }

    /**
     * Shield icon (replaces 🛡️)
     */
    static shield(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>`;
    }

    /**
     * Warning icon (replaces ⚠️)
     */
    static warning(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>`;
    }

    /**
     * Wave/hello icon (replaces 👋)
     */
    static wave(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19.5 12c0 1.232-.046 2.453-.138 3.662a4.006 4.006 0 0 1-3.7 3.7 48.678 48.678 0 0 1-7.324 0 4.006 4.006 0 0 1-3.7-3.7c-.017-.22-.032-.441-.046-.662M19.5 12l3-3m-3 3l-3-3m-12 3l3-3m-3 3l-3-3"/>
            <path d="M12 15.5a3.5 3.5 0 0 0-3.5-3.5H7a3.5 3.5 0 0 0-3.5 3.5v.5"/>
        </svg>`;
    }

    /**
     * Rocket icon (replaces 🚀)
     */
    static rocket(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
            <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
            <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
            <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
        </svg>`;
    }

    /**
     * Party/celebration icon (replaces 🎉)
     */
    static celebration(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2v2"/>
            <path d="M12 20v2"/>
            <path d="m4.93 4.93 1.41 1.41"/>
            <path d="m17.66 17.66 1.41 1.41"/>
            <path d="M2 12h2"/>
            <path d="M20 12h2"/>
            <path d="m6.34 17.66-1.41 1.41"/>
            <path d="m19.07 4.93-1.41 1.41"/>
            <circle cx="12" cy="12" r="4"/>
        </svg>`;
    }

    /**
     * X/close icon (replaces ❌)
     */
    static xmark(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>`;
    }

    /**
     * Info icon (replaces ℹ️)
     */
    static info(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`;
    }

    /**
     * Get icon as HTML image tag
     */
    static asImg(svgString: string, alt: string, className?: string): string {
        const svgBase64 = Buffer.from(svgString).toString('base64');
        const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
        return `<img src="${imgSrc}" alt="${alt}" class="${className || ''}" style="vertical-align: middle; width: 16px; height: 16px; margin: 0 2px;" />`;
    }

    /**
     * Get inline SVG with wrapper div
     */
    static asDiv(svgString: string, className?: string): string {
        return `<div class="${className || ''}" style="display: inline-block; vertical-align: middle; width: 16px; height: 16px; margin: 0 2px;">${svgString}</div>`;
    }
}

/**
 * Icon name mapping for easy access
 */
export const Icons = {
    robot: () => SVGIcons.asImg(SVGIcons.robot(), 'Robot icon'),
    checkmark: () => SVGIcons.asImg(SVGIcons.checkmark(), 'Checkmark icon'),
    refresh: () => SVGIcons.asImg(SVGIcons.refresh(), 'Refresh icon'),
    target: () => SVGIcons.asImg(SVGIcons.target(), 'Target icon'),
    chart: () => SVGIcons.asImg(SVGIcons.chart(), 'Chart icon'),
    trendingUp: () => SVGIcons.asImg(SVGIcons.trendingUp(), 'Trending up icon'),
    shield: () => SVGIcons.asImg(SVGIcons.shield(), 'Shield icon'),
    warning: () => SVGIcons.asImg(SVGIcons.warning(), 'Warning icon'),
    wave: () => SVGIcons.asImg(SVGIcons.wave(), 'Wave icon'),
    rocket: () => SVGIcons.asImg(SVGIcons.rocket(), 'Rocket icon'),
    celebration: () => SVGIcons.asImg(SVGIcons.celebration(), 'Celebration icon'),
    xmark: () => SVGIcons.asImg(SVGIcons.xmark(), 'X mark icon'),
    info: () => SVGIcons.asImg(SVGIcons.info(), 'Info icon'),
};
