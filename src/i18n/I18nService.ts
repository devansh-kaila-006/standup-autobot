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
import * as path from 'path';

export interface LocaleData {
    [key: string]: string | LocaleData;
}

export interface TranslationEntry {
    message: string;
    description?: string;
    placeholders?: Record<string, { content: string; example?: string }>;
}

export type LocaleCode = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh-CN' | 'zh-TW' | 'pt-BR' | 'ru' | 'ar';

export class I18nService {
    private currentLocale: LocaleCode;
    private translations: Map<LocaleCode, LocaleData> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(private context?: vscode.ExtensionContext) {
        this.currentLocale = this.detectLocale();
        this.loadTranslations();
        if (this.context) {
            this.setupLocaleListener();
        }
    }

    /**
     * Detect user's locale
     */
    private detectLocale(): LocaleCode {
        // Get VS Code locale
        const vsCodeLocale = vscode.env.language;

        // Map to supported locales
        const localeMap: Record<string, LocaleCode> = {
            'en': 'en',
            'es': 'es',
            'fr': 'fr',
            'de': 'de',
            'ja': 'ja',
            'zh-cn': 'zh-CN',
            'zh-tw': 'zh-TW',
            'pt-br': 'pt-BR',
            'ru': 'ru',
            'ar': 'ar',
        };

        return localeMap[vsCodeLocale.toLowerCase()] || 'en';
    }

    /**
     * Setup locale change listener
     */
    private setupLocaleListener(): void {
        // Listen for VS Code config changes
        const disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('standup.locale')) {
                const config = vscode.workspace.getConfiguration('standup');
                const newLocale = config.get<string>('locale');

                if (newLocale && this.isSupportedLocale(newLocale)) {
                    this.currentLocale = newLocale as LocaleCode;
                }
            }
        });
        this.disposables.push(disposable);
    }

    /**
     * Check if locale is supported
     */
    private isSupportedLocale(locale: string): locale is LocaleCode {
        return ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'zh-TW', 'pt-BR', 'ru', 'ar'].includes(locale);
    }

    /**
     * Load translations
     */
    private async loadTranslations(): Promise<void> {
        // Load English as base
        this.translations.set('en', this.getEnglishTranslations());

        // Load other locales (in a real implementation, these would be loaded from JSON files)
        // For now, we'll use placeholders
    }

    /**
     * Get English translations (base)
     */
    private getEnglishTranslations(): LocaleData {
        return {
            // Common
            'common.ok': 'OK',
            'common.cancel': 'Cancel',
            'common.save': 'Save',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.close': 'Close',
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.success': 'Success',
            'common.warning': 'Warning',
            'common.info': 'Information',

            // Standup
            'standup.title': 'Standup',
            'standup.generate': 'Generate Standup',
            'standup.today': 'Today',
            'standup.yesterday': 'Yesterday',
            'standup.blockers': 'Blockers',
            'standup.goals': 'Goals',
            'standup.noActivities': 'No activities recorded',
            'standup.generated': 'Standup generated successfully',
            'standup.copied': 'Standup copied to clipboard',

            // History
            'history.title': 'History',
            'history.noEntries': 'No history entries',
            'history.deleteConfirm': 'Are you sure you want to delete this entry?',
            'history.export': 'Export History',

            // Analytics
            'analytics.title': 'Analytics',
            'analytics.productivity': 'Productivity',
            'analytics.insights': 'Insights',
            'analytics.trends': 'Trends',
            'analytics.weekOverWeek': 'Week over Week',
            'analytics.productivityScore': 'Productivity Score',

            // Settings
            'settings.title': 'Settings',
            'settings.general': 'General',
            'settings.tracking': 'Tracking',
            'settings.ai': 'AI',
            'settings.integrations': 'Integrations',
            'settings.accessibility': 'Accessibility',

            // Notifications
            'notifications.title': 'Notifications',
            'notifications.standupReminder': 'Standup Reminder',
            'notifications.activitySummary': 'Activity Summary',
            'notifications.goalProgress': 'Goal Progress',
            'notifications.blockerAlert': 'Blocker Alert',

            // Errors
            'error.apiKeyMissing': 'API key is missing',
            'error.apiConnectionFailed': 'Failed to connect to API',
            'error.invalidConfig': 'Invalid configuration',
            'error.fileNotFound': 'File not found',

            // Commands
            'command.generateStandup': 'Generate Standup',
            'command.showHistory': 'Show History',
            'command.showAnalytics': 'Show Analytics',
            'command.copyToClipboard': 'Copy to Clipboard',
            'command.export': 'Export',
            'command.configureSettings': 'Configure Settings',
        };
    }

    /**
     * Get current locale
     */
    public getLocale(): LocaleCode {
        return this.currentLocale;
    }

    /**
     * Set locale
     */
    public async setLocale(locale: LocaleCode): Promise<void> {
        if (!this.isSupportedLocale(locale)) {
            throw new Error(`Unsupported locale: ${locale}`);
        }

        this.currentLocale = locale;
        if (this.context) {
            await this.context.globalState.update('locale', locale);
        }
    }

    /**
     * Translate a key
     */
    public translate(key: string, placeholders?: Record<string, string>): string {
        const translations = this.translations.get(this.currentLocale) || this.translations.get('en');
        if (!translations) {
            return key;
        }

        const message = this.getNestedValue(translations, key);
        if (typeof message !== 'string') {
            return key;
        }

        // Replace placeholders
        if (placeholders) {
            return this.replacePlaceholders(message, placeholders);
        }

        return message;
    }

    /**
     * Shorthand for translate
     */
    public t(key: string, placeholders?: Record<string, string>): string {
        return this.translate(key, placeholders);
    }

    /**
     * Get nested value from object
     */
    private getNestedValue(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Replace placeholders in message
     */
    private replacePlaceholders(message: string, placeholders: Record<string, string>): string {
        let result = message;

        for (const [key, value] of Object.entries(placeholders)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }

        return result;
    }

    /**
     * Format date according to locale
     */
    public formatDate(date: Date, format?: 'short' | 'medium' | 'long' | 'full'): string {
        const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
            short: { year: 'numeric', month: 'numeric', day: 'numeric' },
            medium: { year: 'numeric', month: 'short', day: 'numeric' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
            full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
        };

        const options = optionsMap[format || 'medium'];

        return date.toLocaleDateString(this.currentLocale, options);
    }

    /**
     * Format time according to locale
     */
    public formatTime(date: Date, format?: 'short' | 'medium' | 'long'): string {
        const optionsMap: Record<string, Intl.DateTimeFormatOptions> = {
            short: { hour: 'numeric', minute: 'numeric' },
            medium: { hour: 'numeric', minute: 'numeric', second: 'numeric' },
            long: { hour: 'numeric', minute: 'numeric', second: 'numeric', timeZoneName: 'short' },
        };

        const options = optionsMap[format || 'medium'];

        return date.toLocaleTimeString(this.currentLocale, options);
    }

    /**
     * Format number according to locale
     */
    public formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
        return num.toLocaleString(this.currentLocale, options);
    }

    /**
     * Format percentage according to locale
     */
    public formatPercent(num: number, decimals: number = 1): string {
        return this.formatNumber(num, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }

    /**
     * Format currency according to locale
     */
    public formatCurrency(amount: number, currency: string = 'USD'): string {
        return this.formatNumber(amount, {
            style: 'currency',
            currency,
        });
    }

    /**
     * Format relative time (e.g., "2 hours ago")
     */
    public formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });

        if (diffSecs < 60) {
            return rtf.format(-diffSecs, 'second');
        } else if (diffMins < 60) {
            return rtf.format(-diffMins, 'minute');
        } else if (diffHours < 24) {
            return rtf.format(-diffHours, 'hour');
        } else {
            return rtf.format(-diffDays, 'day');
        }
    }

    /**
     * Pluralize a word based on count
     */
    public pluralize(count: number, singular: string, plural?: string): string {
        const word = count === 1 ? singular : (plural || singular + 's');
        return `${count} ${word}`;
    }

    /**
     * Check if current locale is RTL
     */
    public isRTL(): boolean {
        return this.currentLocale === 'ar';
    }

    /**
     * Get text direction for current locale
     */
    public getTextDirection(): 'ltr' | 'rtl' {
        return this.isRTL() ? 'rtl' : 'ltr';
    }

    /**
     * Get available locales
     */
    public getAvailableLocales(): LocaleCode[] {
        return ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'zh-TW', 'pt-BR', 'ru', 'ar'];
    }

    /**
     * Get locale display name
     */
    public getLocaleDisplayName(locale: LocaleCode): string {
        const displayNames = new Intl.DisplayNames(this.currentLocale, { type: 'language' });
        return displayNames.of(locale) || locale;
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
