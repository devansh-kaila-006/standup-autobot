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
     * Clipboard/copy icon (replaces 📋)
     */
    static clipboard(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="8" height="4" x="8" y="2" rx="1" ry="1"/>
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
        </svg>`;
    }

    /**
     * Thumbs up icon (replaces 👍)
     */
    static thumbsUp(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 10v12"/>
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7"/>
            <path d="M9 9.88V6a3 3 0 0 1 5.12-2.12"/>
        </svg>`;
    }

    /**
     * Comment/bubble icon (replaces 💬)
     */
    static comment(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>`;
    }

    /**
     * Prohibited/blocked icon (replaces 🚫)
     */
    static prohibited(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="m4.93 4.93 14.14 14.14"/>
        </svg>`;
    }

    /**
     * Hospital/health icon (replaces 🏥)
     */
    static health(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 6v12"/>
            <path d="M6 12h12"/>
            <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 9 9"/>
            <path d="M3 12a9 9 0 0 0 9 9 9 9 0 0 0 9-9"/>
        </svg>`;
    }

    /**
     * Download/export icon (replaces 📥)
     */
    static download(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>`;
    }

    /**
     * Search/magnifier icon (replaces 🔍)
     */
    static search(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
        </svg>`;
    }

    /**
     * Document/file icon (replaces 📝)
     */
    static document(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
        </svg>`;
    }

    /**
     * Light bulb icon (replaces 💡)
     */
    static lightbulb(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
            <path d="M9 18h6"/>
            <path d="M10 22h4"/>
        </svg>`;
    }

    /**
     * Globe icon (replaces 🌍)
     */
    static globe(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>
            <path d="M2 12h20"/>
        </svg>`;
    }

    /**
     * Wrench/tool icon (replaces 🔧)
     */
    static wrench(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
        </svg>`;
    }

    /**
     * Lock/security icon (replaces 🔒)
     */
    static lock(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>`;
    }

    /**
     * Bug icon (for debugging)
     */
    static bug(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="8" height="8" x="8" y="8" rx="2"/>
            <path d="M12 8V2"/>
            <path d="M12 16v6"/>
            <path d="M8 12H2"/>
            <path d="M16 12h6"/>
            <path d="m5 5 3 3"/>
            <path d="m19 5-3 3"/>
            <path d="m5 19 3-3"/>
            <path d="m19 19-3-3"/>
        </svg>`;
    }

    /**
     * Terminal/code icon
     */
    static terminal(): string {
        return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="4 17 10 11 4 5"/>
            <line x1="12" y1="19" x2="20" y2="19"/>
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
    clipboard: () => SVGIcons.asImg(SVGIcons.clipboard(), 'Clipboard icon'),
    thumbsUp: () => SVGIcons.asImg(SVGIcons.thumbsUp(), 'Thumbs up icon'),
    comment: () => SVGIcons.asImg(SVGIcons.comment(), 'Comment icon'),
    prohibited: () => SVGIcons.asImg(SVGIcons.prohibited(), 'Prohibited icon'),
    health: () => SVGIcons.asImg(SVGIcons.health(), 'Health icon'),
    download: () => SVGIcons.asImg(SVGIcons.download(), 'Download icon'),
    search: () => SVGIcons.asImg(SVGIcons.search(), 'Search icon'),
    document: () => SVGIcons.asImg(SVGIcons.document(), 'Document icon'),
    lightbulb: () => SVGIcons.asImg(SVGIcons.lightbulb(), 'Light bulb icon'),
    globe: () => SVGIcons.asImg(SVGIcons.globe(), 'Globe icon'),
    wrench: () => SVGIcons.asImg(SVGIcons.wrench(), 'Wrench icon'),
    lock: () => SVGIcons.asImg(SVGIcons.lock(), 'Lock icon'),
    bug: () => SVGIcons.asImg(SVGIcons.bug(), 'Bug icon'),
    terminal: () => SVGIcons.asImg(SVGIcons.terminal(), 'Terminal icon'),
};
