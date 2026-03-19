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
exports.DashboardPanel = void 0;
const vscode = __importStar(require("vscode"));
class DashboardPanel {
    static createOrShow(extensionUri, state) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._panel.reveal(column);
            DashboardPanel.currentPanel._update(state);
            return;
        }
        const panel = vscode.window.createWebviewPanel(DashboardPanel.viewType, 'Standup Autobot Dashboard', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [extensionUri],
        });
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, state);
    }
    static revive(panel, extensionUri, state) {
        DashboardPanel.currentPanel = new DashboardPanel(panel, extensionUri, state);
    }
    static update(state) {
        if (DashboardPanel.currentPanel) {
            DashboardPanel.currentPanel._update(state);
        }
    }
    constructor(panel, _extensionUri, state) {
        this._extensionUri = _extensionUri;
        this._disposables = [];
        this._panel = panel;
        this._update(state);
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.onDidReceiveMessage(message => {
            switch (message.command) {
                case 'standup.generate':
                    vscode.commands.executeCommand('standup.generate');
                    return;
                case 'standup.generateWeeklyDigest':
                    vscode.commands.executeCommand('standup.generateWeeklyDigest');
                    return;
                case 'standup.previewData':
                    vscode.commands.executeCommand('standup.previewData');
                    return;
                case 'standup.toggleTracking':
                    vscode.commands.executeCommand('standup.toggleTracking');
                    return;
                case 'standup.exportNotion':
                    vscode.commands.executeCommand('standup.exportToNotion');
                    return;
                case 'standup.exportJira':
                    vscode.commands.executeCommand('standup.exportToJira');
                    return;
            }
        }, null, this._disposables);
    }
    dispose() {
        DashboardPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
    _update(state) {
        this._panel.webview.html = this._getHtmlForWebview(state);
    }
    _getHtmlForWebview(state) {
        const serializedState = JSON.stringify(state);
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' vscode-resource:; script-src 'unsafe-inline' vscode-resource:; img-src data: vscode-resource: https:;">
    <title>Standup Autobot</title>
    <style>
        :root {
            --bg-body: #0d0d0f;
            --bg-card: rgba(255, 255, 255, 0.03);
            --bg-card-hover: rgba(255, 255, 255, 0.06);
            --border-color: rgba(255, 255, 255, 0.08);
            --border-highlight: rgba(255, 255, 255, 0.15);
            --accent-primary: #5e6ad2;
            --accent-glow: rgba(94, 106, 210, 0.4);
            --text-main: #ffffff;
            --text-muted: #8b8b8e;
            --text-subtle: #52525b;
            --radius-md: 12px;
            --transition: all 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        body {
            background-color: var(--bg-body);
            color: var(--text-main);
            font-family: var(--vscode-font-family, sans-serif);
            padding: 24px;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 15% 50%, rgba(94, 106, 210, 0.08), transparent 25%),
                radial-gradient(circle at 85% 30%, rgba(56, 189, 248, 0.05), transparent 25%);
        }

        .container {
            max-width: 900px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 16px;
        }

        .brand h1 { font-size: 20px; font-weight: 600; margin: 0; }

        .status-badge {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 12px;
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            cursor: pointer;
            font-size: 11px;
            font-weight: 600;
        }

        .indicator { width: 8px; height: 8px; border-radius: 50%; }
        .active .indicator { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .paused .indicator { background: #ef4444; box-shadow: 0 0 8px #ef4444; }

        .action-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 20px;
            cursor: pointer;
            transition: var(--transition);
            backdrop-filter: blur(10px);
        }

        .card:hover {
            background: var(--bg-card-hover);
            border-color: var(--border-highlight);
            transform: translateY(-2px);
        }

        .card.primary { border-color: var(--accent-primary); }

        .card-title { font-weight: 600; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .card-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }

        .analytics-row {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 24px;
        }

        .section-box {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: var(--radius-md);
            padding: 16px;
        }

        .section-label { font-size: 11px; font-weight: 700; color: var(--text-subtle); text-transform: uppercase; margin-bottom: 16px; display: block; }

        .heatmap { display: flex; align-items: flex-end; justify-content: space-between; height: 100px; gap: 8px; }
        .heat-bar-col { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .heat-bar { width: 100%; background: #2a2a2e; border-radius: 4px; position: relative; height: 100%; overflow: hidden; }
        .heat-fill { position: absolute; bottom: 0; width: 100%; background: var(--accent-primary); transition: height 0.5s ease; radius: 4px; }
        .heat-day { font-size: 10px; color: var(--text-subtle); }

        .history-list { display: flex; flex-direction: column; gap: 8px; max-height: 300px; overflow-y: auto; }
        .history-item {
            padding: 12px;
            background: rgba(255,255,255,0.02);
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .h-date { font-size: 12px; font-weight: 500; }
        .h-text { font-size: 11px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 300px; }

        .export-links { display: flex; gap: 8px; margin-top: 16px; }
        .export-btn { flex: 1; padding: 10px; border: 1px solid var(--border-color); border-radius: 8px; font-size: 11px; text-align: center; cursor: pointer; transition: 0.2s; }
        .export-btn:hover { background: var(--bg-card-hover); border-color: var(--border-highlight); }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="brand"><h1>Standup Dashboard</h1></div>
            <div id="statusBtn" class="status-badge \${state.isPaused ? 'paused' : 'active'}" onclick="post('standup.toggleTracking')">
                <div class="indicator"></div>
                <span>\${state.isPaused ? 'PAUSED' : 'TRACKING'}</span>
            </div>
        </header>

        <div class="action-grid">
            <div class="card primary" onclick="post('standup.generate')">
                <div class="card-title">🚀 Generate Daily</div>
                <div class="card-desc">Sync your activity and draft today's standup report.</div>
            </div>
            <div class="card" onclick="post('standup.previewData')">
                <div class="card-title">🔍 Privacy Audit</div>
                <div class="card-desc">Review the raw data collected before it's processed.</div>
            </div>
            <div class="card" onclick="post('standup.generateWeeklyDigest')">
                <div class="card-title">📊 Weekly Digest</div>
                <div class="card-desc">Analyze trends and summarize your impact for the week.</div>
            </div>
        </div>

        <div class="analytics-row">
            <div class="section-box">
                <span class="section-label">Activity Intensity</span>
                <div class="heatmap">
                    \${state.heatmapData.map((v, i) => \`
                        <div class="heat-bar-col">
                            <div class="heat-bar">
                                <div class="heat-fill" style="height: \${Math.max(v * 100, 5)}%"></div>
                            </div>
                            <span class="heat-day">\${['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
                        </div>
                    \`).join('')}
                </div>
            </div>
            <div class="section-box">
                <span class="section-label">Recent History</span>
                <div class="history-list">
                    \${state.history.length === 0 ? '<div style="font-size:12px;color:var(--text-subtle)">No history found</div>' : 
                      state.history.map(h => \`
                        <div class="history-item">
                            <div>
                                <div class="h-date">\${h.date}</div>
                                <div class="h-text">\${h.text}</div>
                            </div>
                        </div>
                    \`).join('')}
                </div>
                <div class="export-links">
                    <div class="export-btn" onclick="post('standup.exportNotion')">To Notion</div>
                    <div class="export-btn" onclick="post('standup.exportJira')">To Jira</div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function post(cmd) { vscode.postMessage({ command: cmd }); }

        window.addEventListener('message', event => {
            // Panel handles updates via createOrShow logic usually, 
            // but we can add refresh logic here if needed.
        });
    </script>
</body>
</html>`;
    }
}
exports.DashboardPanel = DashboardPanel;
DashboardPanel.viewType = 'standupAutobot.dashboard';
//# sourceMappingURL=DashboardPanel.js.map