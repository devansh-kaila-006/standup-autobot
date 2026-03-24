import * as vscode from 'vscode';
import { getNonce } from '../utils/getNonce';
import { ThemeManager } from './ThemeManager';
import { AccessibilityManager } from './AccessibilityManager';
import { I18nService } from '../i18n/I18nService';

export class StandupCardProvider {
    public static currentPanel: StandupCardProvider | undefined;
    public static readonly viewType = 'standupAutobot.standupCard';

    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private themeManager: ThemeManager;
    private accessibilityManager: AccessibilityManager;
    private i18nService: I18nService;

    public static createOrShow(extensionUri: vscode.Uri, markdown: string, context?: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it.
        if (StandupCardProvider.currentPanel) {
            StandupCardProvider.currentPanel._panel.reveal(column);
            StandupCardProvider.currentPanel._update(markdown);
            return;
        }

        // Otherwise, create a new panel.
        const panel = vscode.window.createWebviewPanel(
            StandupCardProvider.viewType,
            'Standup Summary',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'media')
                ]
            }
        );

        StandupCardProvider.currentPanel = new StandupCardProvider(panel, extensionUri, markdown, context);
    }

    private constructor(panel: vscode.WebviewPanel, private readonly _extensionUri: vscode.Uri, private _markdown: string, context?: vscode.ExtensionContext) {
        this._panel = panel;

        // Initialize UX services
        this.themeManager = new ThemeManager();
        this.accessibilityManager = new AccessibilityManager();
        this.i18nService = context ? new I18nService(context) : new I18nService();

        // Set the initial HTML content
        this._update();

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'copyToClipboard':
                        if (message.text) {
                            try {
                                await vscode.env.clipboard.writeText(message.text);
                                this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'copy' });
                                vscode.window.showInformationMessage('Standup copied to clipboard!');
                            } catch (error) {
                                vscode.window.showErrorMessage('Failed to copy to clipboard');
                            }
                        }
                        return;
                    case 'copyToTeams':
                        if (message.text) {
                            try {
                                await vscode.commands.executeCommand('standup.copyForTeams', message.text);
                                this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'teams' });
                            } catch (error) {
                                vscode.window.showErrorMessage('Failed to copy for Teams');
                            }
                        }
                        return;
                    case 'sendEmail':
                        if (message.text) {
                            try {
                                await vscode.commands.executeCommand('standup.sendEmail', message.text);
                                this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'email' });
                            } catch (error) {
                                vscode.window.showErrorMessage('Failed to open email client');
                            }
                        }
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    public dispose() {
        StandupCardProvider.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update(newMarkdown?: string) {
        if (newMarkdown) {
            this._markdown = newMarkdown;
        }

        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = getNonce();
        const themeCSS = this.themeManager.getThemeCSS();
        const focusCSS = this.accessibilityManager.getFocusVisibleCSS();
        const locale = this.i18nService.getLocale();
        const direction = this.i18nService.getTextDirection();

        return `<!DOCTYPE html>
<html lang="${locale}" dir="${direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' https://cdn.tailwindcss.com; script-src 'nonce-${nonce}' 'unsafe-inline' https://unpkg.com https://cdn.jsdelivr.net;">

    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com" nonce="${nonce}"></script>

    <!-- React & ReactDOM -->
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js" nonce="${nonce}"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" nonce="${nonce}"></script>

    <!-- Babel for JSX -->
    <script src="https://unpkg.com/@babel/standalone/babel.min.js" nonce="${nonce}"></script>

    <!-- Marked for Markdown -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js" nonce="${nonce}"></script>

    <style>
        ${themeCSS}
        ${focusCSS}
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: var(--vscode-editor-background); }
        ::-webkit-scrollbar-thumb { background: var(--vscode-scrollbarSlider-background); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--vscode-scrollbarSlider-hoverBackground); }

        .prose h1 { font-size: 1.5em; font-weight: 700; margin-bottom: 0.5em; color: var(--vscode-editor-foreground); }
        .prose h2 { font-size: 1.25em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: var(--vscode-editor-foreground); }
        .prose h3 { font-size: 1.1em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: var(--vscode-editor-foreground); }
        .prose p { margin-bottom: 0.75em; line-height: 1.6; color: var(--vscode-editor-foreground); }
        .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.75em; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 0.75em; }
        .prose li { margin-bottom: 0.25em; color: var(--vscode-editor-foreground); }
        .prose strong { color: var(--vscode-editor-foreground); font-weight: 600; }
        .prose code { background-color: var(--vscode-textCodeBlock-background); padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: var(--vscode-textLink-foreground); }
        .prose blockquote { border-left: 4px solid var(--vscode-textLink-foreground); padding-left: 1em; font-style: italic; color: var(--vscode-editor-foreground); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

        body { background-color: transparent; font-family: var(--vscode-font-family); margin: 0; }

        button:focus-visible {
            outline: 2px solid var(--vscode-focusBorder);
            outline-offset: 2px;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel" nonce="${nonce}">
        const { useState, useEffect } = React;

        // Acquire VSCode API
        const vscode = acquireVsCodeApi();

        const StandupCard = () => {
            const initialMarkdown = window.initialMarkdown || "No content provided.";

            const [markdown, setMarkdown] = useState(initialMarkdown);
            const [status, setStatus] = useState({ type: null, active: false });

            useEffect(() => {
                const handleMessage = (event) => {
                    const message = event.data;
                    if (message.command === 'actionConfirmation') {
                        setStatus({ type: message.type, active: true });
                        setTimeout(() => setStatus({ type: null, active: false }), 2000);
                    }
                };
                window.addEventListener('message', handleMessage);
                return () => window.removeEventListener('message', handleMessage);
            }, []);

            const handleCopyClick = () => {
                vscode.postMessage({ command: 'copyToClipboard', text: markdown });
            };

            const handleTeamsClick = () => {
                vscode.postMessage({ command: 'copyToTeams', text: markdown });
            };

            const handleEmailClick = () => {
                vscode.postMessage({ command: 'sendEmail', text: markdown });
            };

            const createMarkup = () => {
                return { __html: marked.parse(markdown) };
            };

            return (
                <div className="w-full h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--vscode-editor-background)' }}>
                    <div className="w-full max-w-lg relative rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90%] animate-fade-in"
                         style={{ backgroundColor: 'var(--vscode-editor-background)', border: '1px solid var(--vscode-panel-border)' }}>

                        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>

                        <div className="px-6 py-3 border-b flex justify-between items-center"
                             style={{ backgroundColor: 'var(--vscode-sideBarSectionHeader-background)', borderColor: 'var(--vscode-panel-border)' }}>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" aria-hidden="true"></div>
                                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--vscode-sideBarTitle-foreground)' }}>
                                    Standup Report
                                </span>
                            </div>
                            <span className="text-[10px] font-mono" style={{ color: 'var(--vscode-descriptionForeground)' }}>
                                {new Date().toLocaleDateString()}
                            </span>
                        </div>

                        <div className="p-5 overflow-y-auto custom-scrollbar flex-grow" style={{ backgroundColor: 'var(--vscode-editor-background)' }}>
                            <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={createMarkup()} />
                        </div>

                        <div className="p-4 border-t flex flex-col gap-3"
                             style={{ backgroundColor: 'var(--vscode-editor-selectionBackground)', borderColor: 'var(--vscode-panel-border)' }}>
                            <button
                                onClick={handleCopyClick}
                                aria-label="Copy standup to clipboard"
                                className={status.active && status.type === 'copy'
                                    ? 'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all duration-300'
                                    : 'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all duration-300'}
                                style={{ backgroundColor: status.active && status.type === 'copy' ? 'var(--vscode-terminal-ansiGreen' : 'var(--vscode-button-background)' }}
                            >
                                <span className="flex items-center gap-2 text-xs">
                                    {status.active && status.type === 'copy' ? 'Copied!' : 'Copy to Clipboard'}
                                </span>
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleTeamsClick}
                                    aria-label="Copy standup for Microsoft Teams"
                                    className={status.active && status.type === 'teams'
                                        ? 'flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all duration-300'
                                        : 'flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all duration-300'}
                                    style={{ backgroundColor: status.active && status.type === 'teams' ? 'var(--vscode-terminal-ansiGreen' : 'var(--vscode-button-secondaryBackground)' }}
                                >
                                    <span className="text-[10px]">
                                        {status.active && status.type === 'teams' ? 'Copied!' : 'Teams'}
                                    </span>
                                </button>

                                <button
                                    onClick={handleEmailClick}
                                    aria-label="Send standup via email"
                                    className="flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white transition-all duration-300"
                                    style={{ backgroundColor: 'var(--vscode-button-secondaryBackground)' }}
                                >
                                    <span className="text-[10px]">Email</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<StandupCard />);
    </script>

    <!-- Injection of initial data -->
    <script nonce="${nonce}">
        window.initialMarkdown = ${JSON.stringify(this._markdown)};
    </script>
</body>
</html>`;
    }
}
