/**
 * Internationalization (i18n) Service
 *
 * Provides multi-language support including:
 * - Translation management
 * - Locale detection
 * - Date/number formatting
 * - Pluralization support
 * - RTL language support
 */
import * as vscode from 'vscode';
export interface LocaleData {
    [key: string]: string | LocaleData;
}
export interface TranslationEntry {
    message: string;
    description?: string;
    placeholders?: Record<string, {
        content: string;
        example?: string;
    }>;
}
export type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN' | 'zh-TW' | 'pt-BR' | 'ru' | 'ar';
export declare class I18nService {
    private context?;
    private currentLocale;
    private translations;
    private disposables;
    constructor(context?: vscode.ExtensionContext | undefined);
    /**
     * Detect user's locale
     */
    private detectLocale;
    /**
     * Setup locale change listener
     */
    private setupLocaleListener;
    /**
     * Check if locale is supported
     */
    private isSupportedLocale;
    /**
     * Load translations
     */
    private loadTranslations;
    /**
     * Get English translations (base)
     */
    private getEnglishTranslations;
    /**
     * Get current locale
     */
    getLocale(): LocaleCode;
    /**
     * Set locale
     */
    setLocale(locale: LocaleCode): Promise<void>;
    /**
     * Translate a key
     */
    translate(key: string, placeholders?: Record<string, string>): string;
    /**
     * Shorthand for translate
     */
    t(key: string, placeholders?: Record<string, string>): string;
    /**
     * Get nested value from object
     */
    private getNestedValue;
    /**
     * Replace placeholders in message
     */
    private replacePlaceholders;
    /**
     * Format date according to locale
     */
    formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'full'): string;
    /**
     * Format time according to locale
     */
    formatTime(date: Date, format?: 'short' | 'medium' | 'long'): string;
    /**
     * Format number according to locale
     */
    formatNumber(num: number, options?: Intl.NumberFormatOptions): string;
    /**
     * Format percentage according to locale
     */
    formatPercent(num: number, decimals?: number): string;
    /**
     * Format currency according to locale
     */
    formatCurrency(amount: number, currency?: string): string;
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date: Date): string;
    /**
     * Pluralize a word based on count
     */
    pluralize(count: number, singular: string, plural?: string): string;
    /**
     * Check if current locale is RTL
     */
    isRTL(): boolean;
    /**
     * Get text direction for current locale
     */
    getTextDirection(): 'ltr' | 'rtl';
    /**
     * Get available locales
     */
    getAvailableLocales(): LocaleCode[];
    /**
     * Get locale display name
     */
    getLocaleDisplayName(locale: LocaleCode): string;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=I18nService.d.ts.map