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
exports.HistoryPanel = void 0;
const vscode = __importStar(require("vscode"));
const HistoryService_1 = require("../services/HistoryService");
class HistoryPanel {
    static createOrShow(extensionUri, context) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (HistoryPanel.currentPanel) {
            HistoryPanel.currentPanel._panel.reveal(column);
            return;
        }
        const panel = vscode.window.createWebviewPanel('standupAutobot.history', 'Standup History & Trends', column || vscode.ViewColumn.One, {
            enableScripts: true,
            localResourceRoots: [extensionUri]
        });
        HistoryPanel.currentPanel = new HistoryPanel(panel, extensionUri, context);
    }
    constructor(panel, extensionUri, context) {
        this._disposables = [];
        this._panel = panel;
        this._update(extensionUri, context);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case 'copyToClipboard':
                    if (message.text) {
                        await vscode.env.clipboard.writeText(message.text);
                        vscode.window.showInformationMessage('Copied to clipboard!');
                    }
                    return;
            }
        }, null, this._disposables);
    }
    _update(extensionUri, context) {
        const historyService = new HistoryService_1.HistoryService(context);
        const history = historyService.getHistory();
        const activity = historyService.getAllActivity(); // In Reality we filter for last 7 days in React
        this._panel.webview.html = this._getHtmlForWebview(this._panel.webview, history, activity);
    }
    _getHtmlForWebview(webview, history, activity) {
        const nonce = getNonce();
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Standup History</title>
                <!-- Tailwind for layout if desired, but we'll stick to CSS for maximum control as per instructions -->
                <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                <style>
                    :root {
                        --bg: #1e1e1e;
                        --card-bg: #252526;
                        --border: #3e3e42;
                        --accent: #007acc;
                        --text: #cccccc;
                        --text-bright: #ffffff;
                    }
                    body {
                        background-color: var(--bg);
                        color: var(--text);
                        font-family: 'Segoe UI', sans-serif;
                        padding: 20px;
                        margin: 0;
                    }
                    .container { max-width: 800px; margin: 0 auto; }
                    h1 { color: var(--text-bright); font-size: 1.5rem; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 10px; }
                    
                    /* Heatmap */
                    .heatmap-section { background: var(--card-bg); padding: 20px; border-radius: 8px; margin-bottom: 30px; border: 1px solid var(--border); }
                    .heatmap-title { font-size: 0.9rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; opacity: 0.8; }
                    .heatmap-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 12px; }
                    .day-cell { display: flex; flex-direction: column; align-items: center; gap: 8px; }
                    .square { width: 40px; height: 40px; border-radius: 4px; transition: transform 0.2s; border: 1px solid rgba(255,255,255,0.05); }
                    .square:hover { transform: scale(1.1); filter: brightness(1.2); }
                    .day-label { font-size: 0.75rem; opacity: 0.7; }

                    /* History List */
                    .history-item { background: var(--card-bg); padding: 16px; border-radius: 8px; margin-bottom: 16px; border-left: 4px solid var(--accent); box-shadow: 0 4px 6px rgba(0,0,0,0.2); transition: transform 0.2s; }
                    .history-item:hover { transform: translateX(5px); }
                    .item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
                    .date { font-weight: bold; color: var(--accent); font-size: 0.9rem; }
                    .copy-btn { background: #3e3e42; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.75rem; }
                    .copy-btn:hover { background: #505055; }
                    .content { font-size: 0.9rem; line-height: 1.5; white-space: pre-wrap; color: #e0e0e0; }
                </style>
            </head>
            <body>
                <div id="root"></div>
                <script type="text/babel" nonce="${nonce}">
                    const { useState, useEffect } = React;

                    const historyData = ${JSON.stringify(history)};
                    const activityData = ${JSON.stringify(activity)};

                    const Heatmap = ({ data }) => {
                        const today = new Date();
                        const days = [];
                        const activityMap = new Map(data.map(a => [a.date, a.fileCount]));

                        for (let i = 6; i >= 0; i--) {
                            const d = new Date();
                            d.setDate(today.getDate() - i);
                            const dateStr = d.toISOString().split('T')[0];
                            const label = d.toLocaleDateString('en-US', { weekday: 'short' });
                            const count = activityMap.get(dateStr) || 0;
                            days.push({ label, count, date: dateStr });
                        }

                        const getColor = (count) => {
                            if (count === 0) return '#333333';
                            if (count <= 5) return '#4ade80';
                            if (count <= 15) return '#22c55e';
                            return '#15803d';
                        };

                        return (
                            <div className="heatmap-section">
                                <div className="heatmap-title">7-Day Productivity (Files Touched)</div>
                                <div className="heatmap-grid">
                                    {days.map(day => (
                                        <div className="day-cell" key={day.date}>
                                            <div 
                                                className="square" 
                                                style={{ backgroundColor: getColor(day.count) }}
                                                title={day.count + " files on " + day.date}
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
                                <h1>History & Trends</h1>
                                <Heatmap data={activityData} />
                                
                                <div className="history-list">
                                    <div className="heatmap-title">Past standups</div>
                                    {historyData.length === 0 && <div style={{opacity: 0.5, fontStyle: 'italic'}}>No history found yet.</div>}
                                    {historyData.map(item => (
                                        <div className="history-item" key={item.id}>
                                            <div className="item-header">
                                                <span className="date">{new Date(item.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                                <button className="copy-btn" onClick={() => handleCopy(item.text)}>Copy</button>
                                            </div>
                                            <div className="content">{item.text}</div>
                                        </div>
                                    ))}
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
    dispose() {
        HistoryPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}
exports.HistoryPanel = HistoryPanel;
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
//# sourceMappingURL=HistoryPanel.js.map