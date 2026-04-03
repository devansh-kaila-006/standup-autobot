/**
 * Analytics Panel Webview
 *
 * Displays advanced analytics including productivity insights,
 * trend analysis, sprint summaries, and project health reports.
 */

import * as vscode from 'vscode';
import { AnalyticsService } from '../services/AnalyticsService';
import { getNonce } from '../utils/getNonce';
import { SVGIcons } from '../utils/iconUtils';

export class AnalyticsPanel {
    public static currentPanel: AnalyticsPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];
    private analyticsService: AnalyticsService;

    public static createOrShow(extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        const column = vscode.window.activeTextEditor ? vscode.window.activeTextEditor.viewColumn : undefined;

        // Always dispose and recreate to ensure fresh data
        if (AnalyticsPanel.currentPanel) {
            AnalyticsPanel.currentPanel.dispose();
        }

        const panel = vscode.window.createWebviewPanel(
            'standupAutobot.analytics',
            'Analytics Dashboard',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [extensionUri],
                retainContextWhenHidden: true
            }
        );

        AnalyticsPanel.currentPanel = new AnalyticsPanel(panel, extensionUri, context);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, context: vscode.ExtensionContext) {
        this._panel = panel;
        this.analyticsService = new AnalyticsService(context);

        this._update(extensionUri);

        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'refresh':
                        this._update(extensionUri);
                        return;
                    case 'exportCSV':
                        await this.exportCSV();
                        return;
                    case 'generateSprint':
                        await this.generateSprintSummary();
                        return;
                    case 'getHealthReport':
                        await this.getHealthReport();
                        return;
                    case 'generateStandup':
                        await vscode.commands.executeCommand('standup.generate');
                        return;
                }
            },
            null,
            this._disposables
        );
    }

    private async _update(extensionUri: vscode.Uri) {
        console.log('AnalyticsPanel: Updating analytics...');

        const productivityMetrics = await this.analyticsService.getProductivityInsights(30);
        const trendData = await this.analyticsService.getTrendData(30);
        const weekOverWeek = await this.analyticsService.getWeekOverWeekComparison();
        const rollingAverage = await this.analyticsService.getRollingAverage(30, 7);

        console.log('AnalyticsPanel: Productivity metrics:', productivityMetrics);
        console.log('AnalyticsPanel: Trend data points:', trendData.length);

        this._panel.webview.html = this._getHtmlForWebview(
            this._panel.webview,
            productivityMetrics,
            trendData,
            weekOverWeek,
            rollingAverage
        );
    }

    private async exportCSV() {
        try {
            const csv = await this.analyticsService.exportAnalyticsReport(30);
            const uri = await vscode.env.openExternal(
                vscode.Uri.parse(`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`)
            );
            vscode.window.showInformationMessage('Analytics report exported successfully');
        } catch (error) {
            vscode.window.showErrorMessage('Failed to export report: ' + (error as Error).message);
        }
    }

    private async generateSprintSummary() {
        try {
            const summary = await this.analyticsService.generateSprintSummary(14);

            const message = `
Sprint Summary (${summary.startDate} to ${summary.endDate})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Activity: ${summary.totalActivity} events
Commits: ${summary.commitCount}
Productivity Trend: ${summary.productivityTrend}

Top Files:
${summary.topFiles.map(f => `  • ${f.file}: ${f.linesChanged} lines, ${f.time}`).join('\n')}

Highlights:
${summary.highlights.map(h => `  • ${h}`).join('\n')}
            `;

            vscode.window.showInformationMessage('Sprint summary generated', 'Copy').then(selection => {
                if (selection === 'Copy') {
                    vscode.env.clipboard.writeText(message);
                    vscode.window.showInformationMessage('Sprint summary copied to clipboard');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage('Failed to generate sprint summary: ' + (error as Error).message);
        }
    }

    private async getHealthReport() {
        try {
            const report = await this.analyticsService.generateProjectHealthReport();

            const message = `
Project Health Report: ${report.projectName}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Health: ${report.overallHealth.toUpperCase()}

Metrics:
  • Code Quality: ${report.metrics.codeQuality}%
  • Activity Level: ${report.metrics.activityLevel}%
  • Consistency: ${report.metrics.consistency}%
  • Collaboration: ${report.metrics.collaboration}%

Recommendations:
${report.recommendations.map(r => `  • ${r}`).join('\n')}
            `;

            vscode.window.showInformationMessage(message, 'Copy').then(selection => {
                if (selection === 'Copy') {
                    vscode.env.clipboard.writeText(message);
                    vscode.window.showInformationMessage('Health report copied to clipboard');
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage('Failed to generate health report: ' + (error as Error).message);
        }
    }

    private _getHtmlForWebview(
        webview: vscode.Webview,
        metrics: any,
        trendData: any[],
        weekOverWeek: any,
        rollingAverage: number[]
    ) {
        const nonce = getNonce();

        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Analytics Dashboard</title>
                <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                <style>
                    :root {
                        --bg: #1e1e1e;
                        --card-bg: #252526;
                        --border: #3e3e42;
                        --accent: #007acc;
                        --text: #cccccc;
                        --text-bright: #ffffff;
                        --success: #4ec9b0;
                        --warning: #ce9178;
                        --error: #f48771;
                    }
                    body {
                        background-color: var(--bg);
                        color: var(--text);
                        font-family: var(--vscode-font-family);
                        margin: 0;
                        padding: 20px;
                    }
                    .container {
                        max-width: 1200px;
                        margin: 0 auto;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        margin: 0;
                        color: var(--text-bright);
                    }
                    .actions {
                        display: flex;
                        gap: 10px;
                    }
                    .actions button {
                        padding: 8px 16px;
                        background: var(--accent);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 14px;
                    }
                    .actions button:hover {
                        opacity: 0.9;
                    }
                    .metrics-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .metric-card {
                        background: var(--card-bg);
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .metric-card h3 {
                        margin: 0 0 10px 0;
                        font-size: 14px;
                        color: var(--text);
                    }
                    .metric-card .value {
                        font-size: 32px;
                        font-weight: bold;
                        color: var(--text-bright);
                        margin: 10px 0;
                    }
                    .metric-card .subtitle {
                        font-size: 12px;
                        color: var(--text);
                        opacity: 0.7;
                    }
                    .charts-section {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                        gap: 20px;
                        margin-bottom: 30px;
                    }
                    .chart-card {
                        background: var(--card-bg);
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        padding: 20px;
                    }
                    .chart-card h3 {
                        margin: 0 0 15px 0;
                        color: var(--text-bright);
                    }
                    .wow-comparison {
                        background: var(--card-bg);
                        border: 1px solid var(--border);
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 20px;
                    }
                    .wow-comparison h3 {
                        margin: 0 0 15px 0;
                        color: var(--text-bright);
                    }
                    .wow-grid {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 20px;
                    }
                    .wow-item {
                        text-align: center;
                    }
                    .wow-item .label {
                        font-size: 12px;
                        color: var(--text);
                        opacity: 0.7;
                        margin-bottom: 5px;
                    }
                    .wow-item .change {
                        font-size: 24px;
                        font-weight: bold;
                    }
                    .wow-item .change.positive {
                        color: var(--success);
                    }
                    .wow-item .change.negative {
                        color: var(--error);
                    }
                    .wow-item .change.neutral {
                        color: var(--text);
                    }
                    canvas {
                        max-height: 300px;
                    }
                    .empty-state {
                        text-align: center;
                        padding: 60px 20px;
                        color: var(--text);
                    }
                    .empty-state-icon {
                        font-size: 64px;
                        margin-bottom: 20px;
                        opacity: 0.5;
                    }
                    .empty-state h2 {
                        margin: 0 0 10px 0;
                        color: var(--text-bright);
                    }
                    .empty-state p {
                        margin: 0 0 30px 0;
                        opacity: 0.7;
                    }
                    .primary-button {
                        background: var(--accent);
                        color: white;
                        border: none;
                        padding: 12px 24px;
                        border-radius: 4px;
                        font-size: 14px;
                        cursor: pointer;
                        transition: background 0.2s;
                    }
                    .primary-button:hover {
                        background: #0062a3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>${SVGIcons.chart()} Analytics Dashboard</h1>
                        <div class="actions">
                            <button onclick="generateSprint()">${SVGIcons.trendingUp()} Sprint Summary</button>
                            <button onclick="getHealth()">${SVGIcons.health()} Health Report</button>
                            <button onclick="exportCSV()">${SVGIcons.download()} Export CSV</button>
                            <button onclick="refresh()">${SVGIcons.refresh()} Refresh</button>
                        </div>
                    </div>

                    ${!metrics || metrics.totalActiveTime === 0 ? `
                    <div class="empty-state">
                        <div class="empty-state-icon">📊</div>
                        <h2>No Analytics Data Available</h2>
                        <p>Start generating standups to see your productivity analytics and trends.</p>
                        <button onclick="generateStandup()" class="primary-button">Generate Your First Standup</button>
                    </div>
                    ` : `

                    <div class="metrics-grid">
                        <div class="metric-card">
                            <h3>Total Active Time</h3>
                            <div class="value">${Math.round(metrics.totalActiveTime / 3600)}h</div>
                            <div class="subtitle">Last 30 days</div>
                        </div>
                        <div class="metric-card">
                            <h3>Avg Session Length</h3>
                            <div class="value">${Math.round(metrics.averageSessionLength / 60)}m</div>
                            <div class="subtitle">Per active session</div>
                        </div>
                        <div class="metric-card">
                            <h3>Most Productive Hours</h3>
                            <div class="value">${metrics.mostProductiveHours.map((h: number) => `${h}:00`).join(', ')}</div>
                            <div class="subtitle">Peak activity times</div>
                        </div>
                        <div class="metric-card">
                            <h3>Peak Day</h3>
                            <div class="value">${new Date(metrics.peakProductivityDay).toLocaleDateString('en-US', { weekday: 'long' })}</div>
                            <div class="subtitle">Most active day</div>
                        </div>
                    </div>

                    <div class="wow-comparison">
                        <h3>Week-over-Week Comparison</h3>
                        <div class="wow-grid">
                            <div class="wow-item">
                                <div class="label">Activity</div>
                                <div class="change ${weekOverWeek.change.activity >= 0 ? 'positive' : 'negative'}">
                                    ${weekOverWeek.change.activity >= 0 ? '+' : ''}${weekOverWeek.change.activity}%
                                </div>
                            </div>
                            <div class="wow-item">
                                <div class="label">Commits</div>
                                <div class="change ${weekOverWeek.change.commits >= 0 ? 'positive' : 'negative'}">
                                    ${weekOverWeek.change.commits >= 0 ? '+' : ''}${weekOverWeek.change.commits}%
                                </div>
                            </div>
                            <div class="wow-item">
                                <div class="label">Lines Changed</div>
                                <div class="change ${weekOverWeek.change.linesChanged >= 0 ? 'positive' : 'negative'}">
                                    ${weekOverWeek.change.linesChanged >= 0 ? '+' : ''}${weekOverWeek.change.linesChanged}%
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="charts-section">
                        <div class="chart-card">
                            <h3>Activity Trend (30 Days)</h3>
                            <canvas id="activityChart"></canvas>
                        </div>
                        <div class="chart-card">
                            <h3>Rolling Average (7-day window)</h3>
                            <canvas id="rollingChart"></canvas>
                        </div>
                    </div>

                    <div class="chart-card">
                        <h3>Activity Distribution</h3>
                        <canvas id="distributionChart"></canvas>
                    </div>
                </div>
                    `}
                </div>

                <script>
                    const vscode = acquireVsCodeApi();

                    function generateStandup() {
                        vscode.postMessage({ command: 'generateStandup' });
                    }

                    // Activity Trend Chart
                    const activityCtx = document.getElementById('activityChart').getContext('2d');
                    const activityData = ${JSON.stringify(trendData)};
                    new Chart(activityCtx, {
                        type: 'line',
                        data: {
                            labels: activityData.map(d => d.date),
                            datasets: [{
                                label: 'Activity Count',
                                data: activityData.map(d => d.activityCount),
                                borderColor: '#007acc',
                                backgroundColor: 'rgba(0, 122, 204, 0.1)',
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });

                    // Rolling Average Chart
                    const rollingCtx = document.getElementById('rollingChart').getContext('2d');
                    const rollingData = ${JSON.stringify(rollingAverage)};
                    new Chart(rollingCtx, {
                        type: 'line',
                        data: {
                            labels: rollingData.map((_, i) => \`Day \${i + 1}\`),
                            datasets: [{
                                label: 'Rolling Average',
                                data: rollingData,
                                borderColor: '#4ec9b0',
                                backgroundColor: 'rgba(78, 201, 176, 0.1)',
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { display: false }
                            },
                            scales: {
                                y: { beginAtZero: true }
                            }
                        }
                    });

                    // Distribution Chart
                    const distCtx = document.getElementById('distributionChart').getContext('2d');
                    const distData = ${JSON.stringify(metrics.activityDistribution)};
                    new Chart(distCtx, {
                        type: 'doughnut',
                        data: {
                            labels: ['File Activity', 'Git Commits', 'Terminal Commands'],
                            datasets: [{
                                data: [distData.file, distData.git, distData.terminal],
                                backgroundColor: ['#007acc', '#4ec9b0', '#ce9178']
                            }]
                        },
                        options: {
                            responsive: true,
                            plugins: {
                                legend: { position: 'right' }
                            }
                        }
                    });

                    function refresh() {
                        vscode.postMessage({ command: 'refresh' });
                    }

                    function exportCSV() {
                        vscode.postMessage({ command: 'exportCSV' });
                    }

                    function generateSprint() {
                        vscode.postMessage({ command: 'generateSprint' });
                    }

                    function getHealth() {
                        vscode.postMessage({ command: 'getHealthReport' });
                    }
                </script>
            </body>
            </html>
        `;
    }

    public dispose() {
        AnalyticsPanel.currentPanel = undefined;
        this._panel.dispose();
        this.analyticsService.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
