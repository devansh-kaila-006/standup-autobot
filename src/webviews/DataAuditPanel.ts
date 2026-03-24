import * as vscode from 'vscode';

export class DataAuditPanel {
    public static currentPanel: DataAuditPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    public static createOrShow(extensionUri: vscode.Uri, data: any, onConfirm: () => void) {
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

        DataAuditPanel.currentPanel = new DataAuditPanel(panel, data, onConfirm);
    }

    private constructor(panel: vscode.WebviewPanel, data: any, onConfirm: () => void) {
        this._panel = panel;
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

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Data Audit</title>
                <style>
                    body {
                        background-color: #1e1e1e;
                        color: #cccccc;
                        font-family: 'Segoe UI', sans-serif;
                        padding: 20px;
                    }
                    h1 { color: #ffffff; font-size: 1.2rem; }
                    p { font-size: 0.9rem; opacity: 0.8; }
                    pre {
                        background: #252526;
                        padding: 15px;
                        border-radius: 8px;
                        border: 1px solid #3e3e42;
                        overflow: auto;
                        max-height: 400px;
                        font-family: 'Consolas', monospace;
                        font-size: 12px;
                        color: #d4d4d4;
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
                    .btn-primary { background: #007acc; color: white; }
                    .btn-secondary { background: #3e3e42; color: white; }
                    button:hover { opacity: 0.9; }
                </style>
            </head>
            <body>
                <h1>Privacy Audit: Review Your Data</h1>
                <p>The following information will be sent to Google Gemini Flash to generate your standup summary.</p>
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
