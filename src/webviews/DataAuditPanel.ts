import * as vscode from 'vscode';
import { ThemeManager } from './ThemeManager';
import { AccessibilityManager } from './AccessibilityManager';
import { I18nService } from '../i18n/I18nService';

export class DataAuditPanel {
    public static currentPanel: DataAuditPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private themeManager: ThemeManager;
    private accessibilityManager: AccessibilityManager;
    private i18nService: I18nService;

    public static createOrShow(extensionUri: vscode.Uri, data: any, onConfirm: () => void, context?: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        if (DataAuditPanel.currentPanel) {
            DataAuditPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'standupAutobot.dataAudit',
            'Standup: Review Data',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri]
            }
        );

        DataAuditPanel.currentPanel = new DataAuditPanel(panel, data, onConfirm, context);
    }

    private constructor(panel: vscode.WebviewPanel, data: any, onConfirm: () => void, context?: vscode.ExtensionContext) {
        this._panel = panel;

        // Initialize UX services
        this.themeManager = new ThemeManager();
        this.accessibilityManager = new AccessibilityManager();
        this.i18nService = context ? new I18nService(context) : new I18nService();

        this._panel.webview.html = this._getHtmlForWebview(data);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'confirm':
                        try {
                            onConfirm();
                        } catch (error) {
                            // Handle errors gracefully
                            console.error('Error during confirmation:', error);
                            vscode.window.showErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        } finally {
                            this.dispose();
                        }
                        return;
                    case 'cancel':
                        this.dispose();
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private _getHtmlForWebview(data: any) {
        const jsonStr = JSON.stringify(data, null, 4);
        const themeCSS = this.themeManager.getThemeCSS();
        const focusCSS = this.accessibilityManager.getFocusVisibleCSS();
        const locale = this.i18nService.getLocale();
        const direction = this.i18nService.getTextDirection();

        return `
            <!DOCTYPE html>
            <html lang="${locale}" dir="${direction}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Data Audit</title>
                <style>
                    ${themeCSS}
                    ${focusCSS}
                    body {
                        background-color: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                        padding: 20px;
                    }
                    h1 { color: var(--vscode-editor-foreground); font-size: 1.2rem; }
                    p { font-size: 0.9rem; opacity: 0.8; }
                    pre {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid var(--vscode-panel-border);
                        overflow: auto;
                        max-height: 400px;
                        font-family: var(--vscode-editor-font-family);
                        font-size: 12px;
                        color: var(--vscode-editor-foreground);
                    }
                    .footer {
                        margin-top: 20px;
                        display: flex;
                        gap: 12px;
                        justify-content: flex-end;
                    }
                    button {
                        padding: 8px 16px;
                        border-radius: 4px;
                        border: none;
                        cursor: pointer;
                        font-weight: bold;
                    }
                    .btn-primary { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
                    .btn-secondary { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
                    button:hover { opacity: 0.9; }
                    button:focus-visible {
                        outline: 2px solid var(--vscode-focusBorder);
                        outline-offset: 2px;
                    }
                </style>
            </head>
            <body>
                <h1>Privacy Audit: Review Your Data</h1>
                <p>The following information will be sent to generate your standup summary.</p>
                <pre>${jsonStr.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
                <div class="footer">
                    <button class="btn-secondary" onclick="cancel()">Cancel</button>
                    <button class="btn-primary" onclick="confirm()">Generate Anyway</button>
                </div>
                <script>
                    const vscode = acquireVsCodeApi();
                    function confirm() { vscode.postMessage({ command: 'confirm' }); }
                    function cancel() { vscode.postMessage({ command: 'cancel' }); }
                </script>
            </body>
            </html>
        `;
    }

    public dispose() {
        DataAuditPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) { x.dispose(); }
        }
    }
}
