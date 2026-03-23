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
exports.Diagnostics = void 0;
exports.setDiagnosticsContext = setDiagnosticsContext;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const Logger_1 = require("./Logger");
const errors_1 = require("./errors");
/**
 * Diagnostic utilities for troubleshooting
 */
class Diagnostics {
    constructor(logger) {
        this.logger = logger || (0, Logger_1.getLogger)();
    }
    /**
     * Generate a diagnostic report
     */
    async generateReport() {
        const extension = vscode.extensions.getExtension('devansh-kaila-006.standup-autobot');
        const config = vscode.workspace.getConfiguration('standup');
        const report = {
            timestamp: new Date().toISOString(),
            extensionVersion: extension?.packageJSON.version || 'unknown',
            vscodeVersion: vscode.version,
            platform: process.platform,
            logs: this.logger.getLogsAsJSON(),
            configuration: this.sanitizeConfig(config),
        };
        // Try to get activity data stats
        try {
            const globalStoragePath = context?.globalStorageUri?.fsPath;
            if (globalStoragePath) {
                const activityPath = path.join(globalStoragePath, 'activities.json');
                const stats = await fs.stat(activityPath);
                if (stats.isFile()) {
                    const content = await fs.readFile(activityPath, 'utf-8');
                    const activities = JSON.parse(content);
                    report.activityData = {
                        totalFiles: Object.keys(activities).length,
                        totalActivities: Object.values(activities).reduce((sum, file) => {
                            return sum + (file.activities?.length || 0);
                        }, 0),
                        dataAge: Date.now() - stats.mtimeMs,
                    };
                }
            }
        }
        catch (error) {
            this.logger.warn('Could not read activity data for diagnostics', { error });
        }
        return report;
    }
    /**
     * Sanitize configuration to remove sensitive data
     */
    sanitizeConfig(config) {
        const sanitized = {};
        for (const key in config) {
            if (key.includes('token') || key.includes('key') || key.includes('password')) {
                sanitized[key] = '***REDACTED***';
            }
            else {
                sanitized[key] = config[key];
            }
        }
        return sanitized;
    }
    /**
     * Export diagnostic report to a file
     */
    async exportReport(filePath) {
        const report = await this.generateReport();
        const content = JSON.stringify(report, null, 2);
        if (!filePath) {
            const uri = await vscode.window.showSaveDialog({
                defaultUri: vscode.Uri.file(`standup-diagnostics-${Date.now()}.json`),
                filters: {
                    JSON: ['json'],
                },
            });
            if (!uri) {
                throw new errors_1.StandupError('Save dialog was cancelled', 'CANCELLED');
            }
            filePath = uri.fsPath;
        }
        await fs.writeFile(filePath, content, 'utf-8');
        this.logger.info(`Diagnostic report exported to ${filePath}`);
        return filePath;
    }
    /**
     * Test API connection
     */
    async testAPIConnection(apiKey) {
        // Import here to avoid circular dependencies
        const { StandupGenerator } = await Promise.resolve().then(() => __importStar(require('../services/standupGenerator')));
        try {
            const testKey = apiKey || vscode.workspace.getConfiguration('standup').get('geminiApiKey');
            if (!testKey) {
                return {
                    success: false,
                    message: 'No API key configured. Please set your Gemini API key.',
                };
            }
            // Test with a simple request
            const service = new StandupGenerator();
            await service.generateContent('Test', testKey);
            return {
                success: true,
                message: 'Successfully connected to Gemini API',
            };
        }
        catch (error) {
            this.logger.error('API connection test failed', error);
            return {
                success: false,
                message: `Failed to connect to Gemini API: ${error.message}`,
                details: {
                    error: error.name,
                    code: error.code,
                },
            };
        }
    }
    /**
     * Show diagnostic logs in a webview
     */
    async showLogs() {
        const panel = vscode.window.createWebviewPanel('standup.logs', 'Standup Autobot Logs', vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
        });
        const logs = this.logger.getLogsAsMarkdown();
        panel.webview.html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Standup Autobot Logs</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        background: var(--vscode-editor-background);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 {
                        font-size: 1.5em;
                        margin-bottom: 20px;
                        color: var(--vscode-foreground);
                    }
                    h3 {
                        font-size: 1.1em;
                        margin-top: 20px;
                        margin-bottom: 10px;
                        color: var(--vscode-foreground);
                    }
                    pre {
                        background: var(--vscode-textCodeBlock-background);
                        padding: 10px;
                        border-radius: 4px;
                        overflow-x: auto;
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        font-size: var(--vscode-editor-font-size);
                    }
                    .controls {
                        position: sticky;
                        top: 0;
                        background: var(--vscode-editor-background);
                        padding: 10px 0;
                        border-bottom: 1px solid var(--vscode-panel-border);
                        margin-bottom: 20px;
                    }
                    button {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        cursor: pointer;
                        margin-right: 10px;
                    }
                    button:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="controls">
                    <button onclick="copyLogs()">Copy Logs</button>
                    <button onclick="exportLogs()">Export as JSON</button>
                </div>
                <div id="logs">${this.renderMarkdown(logs)}</div>
                <script>
                    const vscode = acquireVsCodeApi();
                    const logsData = ${JSON.stringify(this.logger.getLogs())};

                    function copyLogs() {
                        const logsText = logsData.map(l =>
                            '[' + l.levelName + '] ' + l.message
                        ).join('\\n');
                        navigator.clipboard.writeText(logsText);
                    }

                    function exportLogs() {
                        vscode.postMessage({
                            command: 'exportLogs',
                            data: logsData
                        });
                    }
                </script>
            </body>
            </html>
        `;
        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'exportLogs') {
                const filePath = await this.exportReport();
                vscode.window.showInformationMessage(`Logs exported to ${filePath}`);
            }
        });
    }
    /**
     * Simple markdown renderer for logs
     */
    renderMarkdown(markdown) {
        // Very simple markdown to HTML conversion
        return markdown
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/```json\n([\s\S]+?)\n```/g, '<pre><code>$1</code></pre>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    }
}
exports.Diagnostics = Diagnostics;
// Global context (will be set from extension.ts)
let context;
function setDiagnosticsContext(ctx) {
    context = ctx;
}
//# sourceMappingURL=Diagnostics.js.map