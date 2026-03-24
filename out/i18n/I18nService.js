"use strict";
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
exports.I18nService = void 0;
const vscode = __importStar(require("vscode"));
class I18nService {
    constructor(context) {
        this.context = context;
        this.translations = new Map();
        this.disposables = [];
        this.currentLocale = this.detectLocale();
        this.loadTranslations();
        if (this.context) {
            this.setupLocaleListener();
        }
    }
    /**
     * Detect user's locale
     */
    detectLocale() {
        // Get VS Code locale
        const vsCodeLocale = vscode.env.language;
        // Map to supported locales
        const localeMap = {
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
    setupLocaleListener() {
        // Listen for VS Code config changes
        const disposable = vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('standup.locale')) {
                const config = vscode.workspace.getConfiguration('standup');
                const newLocale = config.get('locale');
                if (newLocale && this.isSupportedLocale(newLocale)) {
                    this.currentLocale = newLocale;
                }
            }
        });
        this.disposables.push(disposable);
    }
    /**
     * Check if locale is supported
     */
    isSupportedLocale(locale) {
        return ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'zh-TW', 'pt-BR', 'ru', 'ar'].includes(locale);
    }
    /**
     * Load translations
     */
    async loadTranslations() {
        // Load English as base
        this.translations.set('en', this.getEnglishTranslations());
        // Load other locales (in a real implementation, these would be loaded from JSON files)
        // For now, we'll use placeholders
    }
    /**
     * Get English translations (base)
     */
    getEnglishTranslations() {
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
    getLocale() {
        return this.currentLocale;
    }
    /**
     * Set locale
     */
    async setLocale(locale) {
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
    translate(key, placeholders) {
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
    t(key, placeholders) {
        return this.translate(key, placeholders);
    }
    /**
     * Get nested value from object
     */
    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Replace placeholders in message
     */
    replacePlaceholders(message, placeholders) {
        let result = message;
        for (const [key, value] of Object.entries(placeholders)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }
    /**
     * Format date according to locale
     */
    formatDate(date, format) {
        const optionsMap = {
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
    formatTime(date, format) {
        const optionsMap = {
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
    formatNumber(num, options) {
        return num.toLocaleString(this.currentLocale, options);
    }
    /**
     * Format percentage according to locale
     */
    formatPercent(num, decimals = 1) {
        return this.formatNumber(num, {
            style: 'percent',
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals,
        });
    }
    /**
     * Format currency according to locale
     */
    formatCurrency(amount, currency = 'USD') {
        return this.formatNumber(amount, {
            style: 'currency',
            currency,
        });
    }
    /**
     * Format relative time (e.g., "2 hours ago")
     */
    formatRelativeTime(date) {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        const rtf = new Intl.RelativeTimeFormat(this.currentLocale, { numeric: 'auto' });
        if (diffSecs < 60) {
            return rtf.format(-diffSecs, 'second');
        }
        else if (diffMins < 60) {
            return rtf.format(-diffMins, 'minute');
        }
        else if (diffHours < 24) {
            return rtf.format(-diffHours, 'hour');
        }
        else {
            return rtf.format(-diffDays, 'day');
        }
    }
    /**
     * Pluralize a word based on count
     */
    pluralize(count, singular, plural) {
        const word = count === 1 ? singular : (plural || singular + 's');
        return `${count} ${word}`;
    }
    /**
     * Check if current locale is RTL
     */
    isRTL() {
        return this.currentLocale === 'ar';
    }
    /**
     * Get text direction for current locale
     */
    getTextDirection() {
        return this.isRTL() ? 'rtl' : 'ltr';
    }
    /**
     * Get available locales
     */
    getAvailableLocales() {
        return ['en', 'es', 'fr', 'de', 'ja', 'zh-CN', 'zh-TW', 'pt-BR', 'ru', 'ar'];
    }
    /**
     * Get locale display name
     */
    getLocaleDisplayName(locale) {
        const displayNames = new Intl.DisplayNames(this.currentLocale, { type: 'language' });
        return displayNames.of(locale) || locale;
    }
    /**
     * Dispose of resources
     */
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
exports.I18nService = I18nService;
//# sourceMappingURL=I18nService.js.map