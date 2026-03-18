"use strict";
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
exports.StandupCardProvider = void 0;
const vscode = __importStar(require("vscode"));
const getNonce_1 = require("../utils/getNonce");
class StandupCardProvider {
    static createOrShow(extensionUri, markdown) {
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
        const panel = vscode.window.createWebviewPanel(StandupCardProvider.viewType, 'Standup Summary', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media')
            ]
        });
        StandupCardProvider.currentPanel = new StandupCardProvider(panel, extensionUri, markdown);
    }
    constructor(panel, _extensionUri, _markdown) {
        this._extensionUri = _extensionUri;
        this._markdown = _markdown;
        this._disposables = [];
        this._panel = panel;
        // Set the initial HTML content
        this._update();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'copyToClipboard':
                    if (message.text) {
                        try {
                            await vscode.env.clipboard.writeText(message.text);
                            this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'copy' });
                            vscode.window.showInformationMessage('Standup copied to clipboard!');
                        }
                        catch (error) {
                            vscode.window.showErrorMessage('Failed to copy to clipboard');
                        }
                    }
                    return;
                case 'copyToTeams':
                    if (message.text) {
                        try {
                            await vscode.commands.executeCommand('standup.copyForTeams', message.text);
                            this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'teams' });
                        }
                        catch (error) {
                            vscode.window.showErrorMessage('Failed to copy for Teams');
                        }
                    }
                    return;
                case 'sendEmail':
                    if (message.text) {
                        try {
                            await vscode.commands.executeCommand('standup.sendEmail', message.text);
                            this._panel.webview.postMessage({ command: 'actionConfirmation', type: 'email' });
                        }
                        catch (error) {
                            vscode.window.showErrorMessage('Failed to open email client');
                        }
                    }
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        StandupCardProvider.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    _update(newMarkdown) {
        if (newMarkdown) {
            this._markdown = newMarkdown;
        }
        const webview = this._panel.webview;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }
    _getHtmlForWebview(webview) {
        const nonce = (0, getNonce_1.getNonce)();
        return `<!DOCTYPE html>
<html lang="en">
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
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-track { background: #1e1e1e; }
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #555; }
        
        .prose h1 { font-size: 1.5em; font-weight: 700; margin-bottom: 0.5em; color: #fff; }
        .prose h2 { font-size: 1.25em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: #e5e5e5; }
        .prose h3 { font-size: 1.1em; font-weight: 600; margin-top: 1em; margin-bottom: 0.5em; color: #cbd5e1; }
        .prose p { margin-bottom: 0.75em; line-height: 1.6; color: #a3a3a3; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; margin-bottom: 0.75em; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; margin-bottom: 0.75em; }
        .prose li { margin-bottom: 0.25em; color: #a3a3a3; }
        .prose strong { color: #fff; font-weight: 600; }
        .prose code { background-color: #27272a; padding: 0.2em 0.4em; border-radius: 4px; font-family: monospace; font-size: 0.9em; color: #fca5a5; }
        .prose blockquote { border-left: 4px solid #3b82f6; padding-left: 1em; font-style: italic; color: #d4d4d8; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fadeIn 0.4s ease-out forwards; }

        body { background-color: transparent; font-family: 'Inter', sans-serif; margin: 0; }
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
                <div className="w-full h-screen flex items-center justify-center p-4 bg-[#1e1e1e]">
                    <div className="w-full max-w-lg relative bg-[#252526] border border-[#3e3e42] rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[90%] animate-fade-in">
                        
                        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                        
                        <div className="px-6 py-3 border-b border-[#3e3e42] flex justify-between items-center bg-[#2d2d2d]">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                <span className="text-xs font-semibold text-gray-200 uppercase tracking-wider">Standup Report</span>
                            </div>
                            <span className="text-[10px] text-gray-500 font-mono">
                                {new Date().toLocaleDateString()}
                            </span>
                        </div>

                        <div className="p-5 overflow-y-auto custom-scrollbar bg-[#1e1e1e] flex-grow">
                            <div className="prose prose-invert prose-sm max-w-none" dangerouslySetInnerHTML={createMarkup()} />
                        </div>

                        <div className="p-4 bg-[#2d2d2d] border-t border-[#3e3e42] flex flex-col gap-3">
                            <button
                                onClick={handleCopyClick}
                                className={status.active && status.type === 'copy'
                                    ? 'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-green-600 transition-all duration-300' 
                                    : 'w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-500 transition-all duration-300'}
                            >
                                <span className="flex items-center gap-2 text-xs">
                                    {status.active && status.type === 'copy' ? 'Copied to Slack!' : 'Copy for Slack'}
                                </span>
                            </button>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleTeamsClick}
                                    className={status.active && status.type === 'teams'
                                        ? 'flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-green-600 transition-all duration-300' 
                                        : 'flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-[#3e3e42] hover:bg-[#4e4e52] transition-all duration-300'}
                                >
                                    <span className="text-[10px]">
                                        {status.active && status.type === 'teams' ? 'Copied for Teams!' : 'Copy for Teams'}
                                    </span>
                                </button>
                                
                                <button
                                    onClick={handleEmailClick}
                                    className="flex-grow flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-medium text-white bg-[#3e3e42] hover:bg-[#4e4e52] transition-all duration-300"
                                >
                                    <span className="text-[10px]">Send via Email</span>
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
exports.StandupCardProvider = StandupCardProvider;
StandupCardProvider.viewType = 'standupAutobot.standupCard';
//# sourceMappingURL=standupCard.js.map