import * as vscode from 'vscode';
export declare class HistoryPanel {
    static currentPanel: HistoryPanel | undefined;
    private readonly _panel;
    private _disposables;
    private _extensionUri;
    private _context;
    private readonly PAGE_SIZE;
    private _currentHistoryPage;
    private _currentActivityPage;
    private _loadedHistory;
    private _loadedActivity;
    private _isLoading;
    static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void;
    private constructor();
    /**
     * Initialize with first page of data only (lazy loading)
     */
    private _updateInitial;
    /**
     * Load more history data (pagination)
     */
    private _loadMoreHistory;
    /**
     * Load more activity data (pagination)
     */
    private _loadMoreActivity;
    /**
     * Clear cached data and reload
     */
    private _clearCache;
    /**
     * @deprecated Use _updateInitial for lazy loading
     */
    private _update;
    private _getHtmlForWebview;
    dispose(): void;
}
//# sourceMappingURL=HistoryPanel.d.ts.map