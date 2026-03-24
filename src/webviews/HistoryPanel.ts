import * as vscode from 'vscode';
import { HistoryService } from '../services/HistoryService';
import { ThemeManager } from './ThemeManager';
import { AccessibilityManager } from './AccessibilityManager';
import { I18nService } from '../i18n/I18nService';

export class HistoryPanel {
    public static currentPanel: HistoryPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private _extensionUri: vscode.Uri;
    private _context: vscode.ExtensionContext;
    private themeManager: ThemeManager;
    private accessibilityManager: AccessibilityManager;
    private i18nService: I18nService;

    // Lazy loading state
    private readonly PAGE_SIZE = 20;
    private _currentHistoryPage = 0;
    private _currentActivityPage = 0;
    private _loadedHistory: any[] = [];
    private _loadedActivity: any[] = [];
    private _isLoading = false;

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'standupAutobot.history',
            'Standup History & Trends',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._context = context;

        // Initialize Phase 7 services
        this.themeManager = new ThemeManager();
        this.accessibilityManager = new AccessibilityManager();
        this.i18nService = new I18nService(context);

        // Load initial page only
        this._updateInitial();

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'copyToClipboard':
                        if (message.text) {
                            await vscode.env.clipboard.writeText(message.text);
                            vscode.window.showInformationMessage('Copied to clipboard!');
                        }
                        return;
                    case 'loadMoreHistory':
                        await this._loadMoreHistory();
                        return;
                    case 'loadMoreActivity':
                        await this._loadMoreActivity();
                        return;
                    case 'clearCache':
                        this._clearCache();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    /**
     * Initialize with first page of data only (lazy loading)
     */
    private _updateInitial() {
        this._currentHistoryPage = 0;
        this._currentActivityPage = 0;
        this._loadedHistory = [];
        this._loadedActivity = [];

        // Load first page
        this._loadMoreHistory();
        this._loadMoreActivity();
    }

    /**
     * Load more history data (pagination)
     */
    private async _loadMoreHistory() {
        if (this._isLoading) {
            return;
        }

        this._isLoading = true;

        try {
            const historyService = new HistoryService(this._context);
            const allHistory = historyService.getHistory();

            const startIndex = this._currentHistoryPage * this.PAGE_SIZE;
            const endIndex = startIndex + this.PAGE_SIZE;
            const newItems = allHistory.slice(startIndex, endIndex);

            this._loadedHistory = [...this._loadedHistory, ...newItems];
            this._currentHistoryPage++;

            const hasMore = endIndex < allHistory.length;

            this._panel.webview.html = this._getHtmlForWebview(
                this._panel.webview,
                this._loadedHistory,
                this._loadedActivity,
                hasMore,
                false // TODO: Add activity hasMore
            );
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * Load more activity data (pagination)
     */
    private async _loadMoreActivity() {
        if (this._isLoading) {
            return;
        }

        this._isLoading = true;

        try {
            const historyService = new HistoryService(this._context);
            const allActivity = historyService.getAllActivity();

            const startIndex = this._currentActivityPage * this.PAGE_SIZE;
            const endIndex = startIndex + this.PAGE_SIZE;
            const newItems = allActivity.slice(startIndex, endIndex);

            this._loadedActivity = [...this._loadedActivity, ...newItems];
            this._currentActivityPage++;

            const hasMore = endIndex < allActivity.length;

            this._panel.webview.html = this._getHtmlForWebview(
                this._panel.webview,
                this._loadedHistory,
                this._loadedActivity,
                false, // TODO: Add history hasMore
                hasMore
            );
        } finally {
            this._isLoading = false;
        }
    }

    /**
     * Clear cached data and reload
     */
    private _clearCache() {
        this._updateInitial();
    }

    /**
     * @deprecated Use _updateInitial for lazy loading
     */
    private _update(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._updateInitial();
    }

    private _getHtmlForWebview(
        webview: vscode.Webview,
        history: any[],
        activity: any[],
        hasMoreHistory: boolean = false,
        hasMoreActivity: boolean = false
    ) {
        const nonce = this.themeManager.getNonce();
        const themeCSS = this.themeManager.getThemeCSS();
        const focusCSS = this.accessibilityManager.getFocusVisibleCSS();
        const direction = this.i18nService.getTextDirection();

        return `
            <!DOCTYPE html>
            <html lang="${this.i18nService.getLocale()}" dir="${direction}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Standup History</title>
                <!-- Tailwind for layout if desired, but we'll stick to CSS for maximum control as per instructions -->
                <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <script>
                    // Initialize vscode API for message passing
                    const vscode = acquireVsCodeApi();
                </script>
                <style>
                    ${themeCSS}
                    ${focusCSS}

                    /* History-specific styles */
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }

                    h1 {
                        margin-bottom: var(--spacing-md);
                    }

                    /* Heatmap */
                    .heatmap-section {
                        margin-bottom: var(--spacing-lg);
                    }

                    .heatmap-title {
                        font-size: 0.875rem;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                        margin-bottom: var(--spacing-md);
                        opacity: 0.8;
                        font-weight: 600;
                    }

                    .heatmap-grid {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        gap: var(--spacing-sm);
                    }

                    .day-cell {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: var(--spacing-xs);
                    }

                    .square {
                        width: 40px;
                        height: 40px;
                        border-radius: var(--border-radius-sm);
                        transition: transform 0.2s;
                        border: 1px solid var(--border-color);
                    }

                    .square:hover {
                        transform: scale(1.1);
                        filter: brightness(1.2);
                    }

                    .square:focus {
                        outline: 2px solid var(--primary-color);
                        outline-offset: 2px;
                    }

                    .day-label {
                        font-size: 0.75rem;
                        opacity: 0.7;
                    }

                    /* History List */
                    .history-list {
                        margin-top: var(--spacing-lg);
                    }

                    .history-item {
                        margin-bottom: var(--spacing-md);
                    }

                    .item-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: var(--spacing-sm);
                    }

                    .date {
                        font-weight: 600;
                        color: var(--primary-color);
                        font-size: 0.875rem;
                    }

                    .copy-btn {
                        font-size: 0.75rem;
                    }

                    .content {
                        font-size: 0.875rem;
                        line-height: 1.5;
                        white-space: pre-wrap;
                        color: var(--text-secondary-color);
                    }

                    .load-more-btn {
                        margin-top: var(--spacing-md);
                        width: 100%;
                    }

                    /* Empty state */
                    .empty-state {
                        text-align: center;
                        padding: var(--spacing-xl);
                        opacity: 0.5;
                        font-style: italic;
                    }
                </style>
            </head>
            <body>
                ${this.accessibilityManager.generateSkipLink('#root', 'Skip to content')}
                <div id="root" role="main"></div>
                <script type="text/babel" nonce="${nonce}">
                    const { useState, useEffect } = React;

                    const translations = ${JSON.stringify(this.getTranslations())};
                    const locale = "${this.i18nService.getLocale()}";

                    const historyData = ${JSON.stringify(history)};
                    const activityData = ${JSON.stringify(activity)};

                    const t = (key) => translations[key] || key;

                    const Heatmap = ({ data }) => {
                        const today = new Date();
                        const days = [];
                        const activityMap = new Map(data.map(a => [a.date, a.fileCount]));

                        for (let i = 6; i >= 0; i--) {
                            const d = new Date();
                            d.setDate(today.getDate() - i);
                            const dateStr = d.toISOString().split('T')[0];
                            const label = d.toLocaleDateString(locale, { weekday: 'short' });
                            const count = activityMap.get(dateStr) || 0;
                            days.push({ label, count, date: dateStr });
                        }

                        const getColor = (count) => {
                            if (count === 0) return 'var(--card-color)';
                            if (count <= 5) return 'var(--success-color)';
                            if (count <= 15) return 'var(--success-color)';
                            return 'var(--success-color)';
                        };

                        return (
                            <div className="card heatmap-section" role="region" aria-label={t('analytics.title')}>
                                <h2 className="heatmap-title">{t('analytics.productivity')}</h2>
                                <div className="heatmap-grid" role="list" aria-label="7-day activity overview">
                                    {days.map(day => (
                                        <div className="day-cell" key={day.date} role="listitem">
                                            <div
                                                className="square"
                                                style={{ backgroundColor: getColor(day.count) }}
                                                title={day.count + " " + t('analytics.files') + " " + day.date}
                                                tabIndex={0}
                                                aria-label={day.count + " " + t('analytics.files') + " " + day.date}
                                            />
                                            <span className="day-label">{day.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    };

                    const HistoryApp = () => {
                        const vscode = acquireVsCodeApi();

                        const handleCopy = (text) => {
                            vscode.postMessage({ command: 'copyToClipboard', text });
                        };

                        return (
                            <div className="container">
                                <h1>{t('history.title')}</h1>
                                <Heatmap data={activityData} />

                                <div className="history-list">
                                    <h2 className="heatmap-title">{t('history.pastStandups')}</h2>
                                    {historyData.length === 0 && <div className="empty-state" role="status">{t('history.noEntries')}</div>}
                                    {historyData.map(item => (
                                        <div className="card history-item" key={item.id}>
                                            <div className="item-header">
                                                <time className="date" dateTime={new Date(item.timestamp).toISOString()}>
                                                    {new Date(item.timestamp).toLocaleDateString(locale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                                </time>
                                                <button
                                                    className="copy-btn"
                                                    onClick={() => handleCopy(item.text)}
                                                    aria-label={t('standup.copied')}
                                                >
                                                    {t('common.copy')}
                                                </button>
                                            </div>
                                            <div className="content">{item.text}</div>
                                        </div>
                                    ))}
                                    ${hasMoreHistory ? `
                                    <div style={{textAlign: 'center', marginTop: 'var(--spacing-md)'}}>
                                        <button
                                            className="load-more-btn"
                                            onClick={() => vscode.postMessage({command: 'loadMoreHistory'})}
                                            aria-label={t('history.loadMore')}
                                        >
                                            {t('history.loadMore')}
                                        </button>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        );
                    };

                    const root = ReactDOM.createRoot(document.getElementById('root'));
                    root.render(<HistoryApp />);
                </script>
            </body>
            </html>
        `;
    }

    /**
     * Get translations for webview
     */
    private getTranslations(): Record<string, string> {
        return {
            'history.title': this.i18nService.t('history.title'),
            'history.noEntries': this.i18nService.t('history.noEntries'),
            'history.pastStandups': 'Past standups',
            'history.loadMore': 'Load More',
            'analytics.title': 'Productivity',
            'analytics.productivity': '7-Day Productivity (Files Touched)',
            'analytics.files': 'files',
            'common.copy': 'Copy',
            'standup.copied': 'Copy to clipboard',
        };
    }

    public dispose() {
        this.themeManager.dispose();
        this.accessibilityManager.dispose();
        this.i18nService.dispose();
        HistoryPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) { x.dispose(); }
        }
    }
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
