/**
 * Analytics Panel Webview
 *
 * Displays advanced analytics including productivity insights,
 * trend analysis, sprint summaries, and project health reports.
 */
import * as vscode from 'vscode';
export declare class AnalyticsPanel {
    static currentPanel: AnalyticsPanel | undefined;
    private readonly _panel;
    private _disposables;
    private analyticsService;
    private themeManager;
    private accessibilityManager;
    private i18nService;
    static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext): void;
    private constructor();
    private _update;
    private exportCSV;
    private generateSprintSummary;
    private getHealthReport;
    private _getHtmlForWebview;
    dispose(): void;
}
//# sourceMappingURL=AnalyticsPanel.d.ts.map