import * as vscode from 'vscode';
import { getNonce } from '../utils/getNonce';
import { ThemeManager } from './ThemeManager';
import { AccessibilityManager } from './AccessibilityManager';
import { I18nService } from '../i18n/I18nService';
import { ActivityTracker } from '../trackers/activityTracker';
import { GitTracker } from '../trackers/gitTracker';
import { TerminalTracker } from '../trackers/terminalTracker';
import { HistoryService } from '../services/HistoryService';
import { ConfigurationService } from '../services/ConfigurationService';

/**
 * Side Panel Dashboard Provider
 *
 * Provides a dashboard in the VS Code Activity Bar side panel with:
 * - Quick Actions (Generate Standup, Toggle Tracking, Copy, View History/Analytics)
 * - Tracking Status (active/paused indicator, file count)
 * - Activity Feed (Top Files, Recent Commits, Recent Commands)
 * - Auto-refresh every 5 seconds
 */

export interface ActivityData {
    trackingStatus: 'active' | 'paused';
    topFiles: { file: string; timeSpent: string; linesChanged: number }[];
    fileCount: number;
    commits: Array<{ hash: string; timestamp: string; message: string; files: string[] }>;
    commands: string[];
    lastGenerated: string;
}

export class SidePanelProvider {
    public static readonly viewType = 'standupAutobot.sidePanel';

    private _view?: vscode.WebviewView;
    private themeManager: ThemeManager;
    private accessibilityManager: AccessibilityManager;
    private i18nService: I18nService;
    private updateInterval?: NodeJS.Timeout;

    constructor(
        private activityTracker: ActivityTracker,
        private gitTracker: GitTracker,
        private terminalTracker: TerminalTracker,
        private historyService: HistoryService,
        private context: vscode.ExtensionContext,
        private extensionUri: vscode.Uri
    ) {
        this.themeManager = new ThemeManager();
        this.accessibilityManager = new AccessibilityManager();
        this.i18nService = new I18nService(context);

        // Setup theme change listener
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('workbench.colorTheme')) {
                this.refresh();
            }
        });
    }

    /**
     * Resolve the webview view
     */
    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            enableCommandUris: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this.extensionUri, 'media')
            ]
        };

        // Set initial HTML asynchronously
        this.setInitialHtml(webviewView.webview).catch(error => {
            console.error('Failed to set initial HTML:', error);
        });

        // Handle messages from webview
        webviewView.webview.onDidReceiveMessage(async (message) => {
            await this.handleMessage(message);
        });

        // Start auto-refresh
        this.startAutoRefresh();
    }

    /**
     * Handle messages from webview
     */
    private async handleMessage(message: any) {
        switch (message.command) {
            // Main Actions
            case 'generateStandup':
                await vscode.commands.executeCommand('standup.generate');
                break;
            case 'toggleTracking':
                await vscode.commands.executeCommand('standup.toggleTracking');
                this.refresh(); // Update status display
                break;
            case 'copyToClipboard':
                await vscode.commands.executeCommand('standup.copyToClipboard');
                break;

            // Views & Analytics
            case 'viewHistory':
                await vscode.commands.executeCommand('standup.viewHistory');
                break;
            case 'viewAnalytics':
                await vscode.commands.executeCommand('standup.viewAnalytics');
                break;
            case 'dataAudit':
                await vscode.commands.executeCommand('standup.dataAudit');
                break;
            case 'previewData':
                await vscode.commands.executeCommand('standup.previewData');
                break;

            // Export
            case 'export':
                await vscode.commands.executeCommand('standup.export');
                break;
            case 'exportToNotion':
                await vscode.commands.executeCommand('standup.exportToNotion');
                break;
            case 'exportToJira':
                await vscode.commands.executeCommand('standup.exportToJira');
                break;
            case 'generateWeeklyDigest':
                await vscode.commands.executeCommand('standup.generateWeeklyDigest');
                break;

            // Configuration
            case 'configureSettings':
                await vscode.commands.executeCommand('standup.configureSettings');
                break;
            case 'setApiKey':
                await vscode.commands.executeCommand('standup.setApiKey');
                break;
            case 'setOpenaiApiKey':
                await vscode.commands.executeCommand('standup.setOpenaiApiKey');
                break;
            case 'setClaudeApiKey':
                await vscode.commands.executeCommand('standup.setClaudeApiKey');
                break;
            case 'setNotionToken':
                await vscode.commands.executeCommand('standup.setNotionToken');
                break;
            case 'setJiraToken':
                await vscode.commands.executeCommand('standup.setJiraToken');
                break;

            // Integration Tests
            case 'testJiraConnection':
                await vscode.commands.executeCommand('standup.testJiraConnection');
                break;
            case 'testGitHubConnection':
                await vscode.commands.executeCommand('standup.testGitHubConnection');
                break;
            case 'testSlackConnection':
                await vscode.commands.executeCommand('standup.testSlackConnection');
                break;

            // Notifications
            case 'showNotifications':
                await vscode.commands.executeCommand('standup.showNotifications');
                break;
            case 'markNotificationsRead':
                await vscode.commands.executeCommand('standup.markNotificationsRead');
                break;

            // Data refresh
            case 'requestData':
                // Initial data request
                this.refresh();
                break;
        }
    }

    /**
     * Get activity data from all services
     */
    private async getActivityData(): Promise<ActivityData> {
        const isPaused = this.context.globalState.get<boolean>('standup.paused', false);

        return {
            trackingStatus: isPaused ? 'paused' : 'active',
            topFiles: this.activityTracker.getTopFiles(5),
            fileCount: this.activityTracker.getFileCount(),
            commits: await this.gitTracker.getRecentCommits(24),
            commands: await this.terminalTracker.getTerminalHistory(5),
            lastGenerated: this.context.globalState.get<string>('standup.lastGenerated', '')
        };
    }

    /**
     * Set initial HTML (async wrapper)
     */
    private async setInitialHtml(webview: vscode.Webview) {
        try {
            console.log('SidePanel: Setting initial HTML...');
            webview.html = await this.getHtmlForWebview(webview);
            console.log('SidePanel: Initial HTML set successfully');
        } catch (error) {
            console.error('SidePanel: Failed to set initial HTML:', error);
            // Set a simple error message in the webview
            webview.html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body {
                            font-family: var(--vscode-font-family);
                            padding: 20px;
                            color: var(--vscode-foreground);
                        }
                        .error {
                            color: var(--vscode-errorForeground);
                        }
                    </style>
                </head>
                <body>
                    <h2>Standup Dashboard</h2>
                    <p class="error">Failed to load dashboard. Please try again.</p>
                    <p><small>Check the developer console for details.</small></p>
                </body>
                </html>
            `;
        }
    }

    /**
     * Refresh the webview content
     */
    private async refresh() {
        if (this._view) {
            const activityData = await this.getActivityData();
            // Send message to update data without re-mounting React
            this._view.webview.postMessage({
                command: 'updateData',
                data: activityData
            });
        }
    }

    /**
     * Start auto-refresh timer
     */
    private startAutoRefresh() {
        // Clear existing timer if any
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Start new timer
        const refreshInterval = ConfigurationService.getInstance().getConfig().dashboardRefreshInterval;
        this.updateInterval = setInterval(() => {
            this.refresh();
        }, refreshInterval);
    }

    /**
     * Generate HTML for webview
     */
    private async getHtmlForWebview(webview: vscode.Webview, activityData?: ActivityData): Promise<string> {
        const nonce = getNonce();
        const themeCSS = this.themeManager.getThemeCSS();
        const focusCSS = this.accessibilityManager.getFocusVisibleCSS();
        const locale = this.i18nService.getLocale();
        const direction = this.i18nService.getTextDirection();

        // Fetch activity data if not provided
        if (!activityData) {
            activityData = await this.getActivityData();
        }

        const isPaused = activityData.trackingStatus === 'paused';

        const cdnUrls = ConfigurationService.getInstance().getCdnUrls();
        return `<!DOCTYPE html>
<html lang="${locale}" dir="${direction}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}' 'unsafe-inline' https://unpkg.com;">

    <!-- React & ReactDOM -->
    <script crossorigin src="${cdnUrls.react}" nonce="${nonce}"></script>
    <script crossorigin src="${cdnUrls.reactDOM}" nonce="${nonce}"></script>

    <!-- Babel for JSX -->
    <script src="${cdnUrls.babel}" nonce="${nonce}"></script>

    <style>
        ${themeCSS}
        ${focusCSS}

        body {
            padding: 0;
            margin: 0;
            font-family: var(--font-body);
            background-color: var(--background-color);
            color: var(--text-color);
            overflow-x: hidden;
        }

        .dashboard-container {
            padding: var(--spacing-md);
            max-width: 100%;
        }

        .status-card {
            background-color: var(--card-color);
            border: 1px solid var(--border-color);
            border-radius: var(--border-radius-md);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-md);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .status-indicator {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .status-dot.active {
            background-color: var(--success-color);
            animation: pulse 2s infinite;
        }

        .status-dot.paused {
            background-color: var(--warning-color);
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }

        .status-text {
            font-size: 0.875rem;
            font-weight: 500;
        }

        .status-meta {
            font-size: 0.75rem;
            color: var(--text-secondary-color);
        }

        .quick-actions {
            margin-bottom: var(--spacing-md);
        }

        .quick-actions-title {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: var(--text-secondary-color);
            margin-bottom: var(--spacing-sm);
            font-weight: 600;
        }

        .action-button {
            width: 100%;
            padding: var(--spacing-sm) var(--spacing-md);
            margin-bottom: var(--spacing-sm);
            border: none;
            border-radius: var(--border-radius-sm);
            font-size: 0.875rem;
            cursor: pointer;
            transition: all 0.2s;
            text-align: left;
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .action-button:focus {
            outline: 2px solid var(--primary-color);
            outline-offset: 2px;
        }

        .action-button.primary {
            background-color: var(--primary-color);
            color: white;
            font-weight: 600;
            padding: var(--spacing-md);
        }

        .action-button.primary:hover {
            background-color: var(--accent-color);
        }

        .action-button.secondary {
            background-color: var(--secondary-color);
            color: var(--text-color);
        }

        .action-button.secondary:hover {
            background-color: var(--border-color);
        }

        .activity-section {
            margin-bottom: var(--spacing-md);
        }

        .activity-title {
            font-size: 0.875rem;
            font-weight: 600;
            margin-bottom: var(--spacing-sm);
            color: var(--foreground-color);
        }

        .activity-item {
            padding: var(--spacing-sm);
            border-bottom: 1px solid var(--border-color);
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .activity-item:last-child {
            border-bottom: none;
        }

        .activity-item-primary {
            font-size: 0.8rem;
            font-weight: 500;
            color: var(--text-color);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .activity-item-secondary {
            font-size: 0.7rem;
            color: var(--text-secondary-color);
        }

        .empty-state {
            padding: var(--spacing-md);
            text-align: center;
            color: var(--text-secondary-color);
            font-size: 0.8rem;
            font-style: italic;
        }

        .divider {
            border-top: 1px solid var(--border-color);
            margin: var(--spacing-md) 0;
        }

        /* Icon styling */
        .icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }

        /* Scrollbar styling */
        .activity-list {
            max-height: 200px;
            overflow-y: auto;
        }

        .activity-list::-webkit-scrollbar {
            width: 4px;
        }

        .activity-list::-webkit-scrollbar-track {
            background: transparent;
        }

        .activity-list::-webkit-scrollbar-thumb {
            background: var(--border-color);
            border-radius: 2px;
        }
    </style>
</head>
<body>
    <div id="root"></div>

    <script type="text/babel" nonce="${nonce}">
        const { useState, useEffect } = React;

        // Acquire VSCode API
        const vscode = acquireVsCodeApi();

        // Icons as SVG components
        const Icons = {
            pulse: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 6v6l4 2"/>
            </svg>,
            pause: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>,
            file: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/>
                <polyline points="13 2 13 9 20 9"/>
            </svg>,
            git: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <line x1="12" y1="9" x2="12" y2="3"/>
                <line x1="12" y1="15" x2="12" y2="21"/>
                <circle cx="12" cy="3" r="1"/>
                <circle cx="12" cy="21" r="1"/>
            </svg>,
            terminal: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 17 10 11 4 5"/>
                <line x1="12" y1="19" x2="20" y2="19"/>
            </svg>,
            chart: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10"/>
                <line x1="12" y1="20" x2="12" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="14"/>
            </svg>,
            history: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
            </svg>,
            copy: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>,
            settings: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3"/>
                <path d="M12 1v6m0 6v6"/>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0 2 2 0 0 1 2.83-.06l.06-.06a1.65 1.65 0 0 0 1.82-.33H9a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83 2 2 0 0 1 .06.06a1.65 1.65 0 0 0 .33 1.82V9a1.65 1.65 0 0 0-.33 1.82l-.06.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0 2 2 0 0 1-.06.06a1.65 1.65 0 0 0-1.82.33H15a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83 2 2 0 0 1-.06.06a1.65 1.65 0 0 0-.33-1.82V15z"/>
            </svg>,
            export: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>,
            bell: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 2c0 6-6 12-6 12 0 0 0-6 6 6 6 0 0 0 6-6c0-6 6-12 6-12 0 0 0-6 6 6 6 0 0 0 6 6z"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                <path d="M18.63 13A17.89 17.89 0 0 1 18 8"/>
            </svg>,
            key: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="7" y="7" width="3" height="3" rx="1"/>
                <rect x="14" y="7" width="3" height="3" rx="1"/>
                <rect x="7" y="14" width="3" height="3" rx="1"/>
                <rect x="14" y="14" width="3" height="3" rx="1"/>
            </svg>,
            chevronDown: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 12 15 18 9"/>
            </svg>,
            chevronUp: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="18 15 12 9 6 15"/>
            </svg>,
            cloud: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 10h-1.26A8 8 0 0 0 9 20h9a5 5 0 0 0 5-5v-5a8 8 0 0 0-5-5"/>
                <line x1="12" y1="13" x2="12" y2="11"/>
            </svg>,
            database: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <ellipse cx="12" cy="5" rx="9" ry="3"/>
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3"/>
            </svg>,
            check: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
            </svg>,
            refresh: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 1 20"/>
                <path d="M23 20v-7"/>
                <path d="M16.2 15.6a2 2 0 0 1 .58 1.42l5 5a2 2 0 0 1 2.82 0l.76-.71"/>
            </svg>,
            shield: () => <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V3l-10-10v9c0 6 8 10 8 10z"/>
            </svg>
        };

        const Dashboard = () => {
            const [trackingStatus, setTrackingStatus] = useState(${JSON.stringify(isPaused ? 'paused' : 'active')});
            const [fileCount, setFileCount] = useState(${activityData.fileCount});
            const [topFiles, setTopFiles] = useState(${JSON.stringify(activityData.topFiles)});
            const [commits, setCommits] = useState(${JSON.stringify(activityData.commits)});
            const [commands, setCommands] = useState(${JSON.stringify(activityData.commands)});
            const [expandedSection, setExpandedSection] = React.useState(null);

            useEffect(() => {
                const handleMessage = (event) => {
                    const message = event.data;
                    if (message.command === 'updateData') {
                        setTrackingStatus(message.data.trackingStatus);
                        setFileCount(message.data.fileCount);
                        setTopFiles(message.data.topFiles);
                        setCommits(message.data.commits);
                        setCommands(message.data.commands);
                    }
                };
                window.addEventListener('message', handleMessage);
                return () => window.removeEventListener('message', handleMessage);
            }, []);

            const handleGenerateStandup = () => {
                vscode.postMessage({ command: 'generateStandup' });
            };

            const handleToggleTracking = () => {
                vscode.postMessage({ command: 'toggleTracking' });
            };

            const handleCopyToClipboard = () => {
                vscode.postMessage({ command: 'copyToClipboard' });
            };

            const handleViewHistory = () => {
                vscode.postMessage({ command: 'viewHistory' });
            };

            const handleViewAnalytics = () => {
                vscode.postMessage({ command: 'viewAnalytics' });
            };

            const formatRelativeTime = (timestamp) => {
                const now = Date.now();
                const diff = now - (typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime());
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(minutes / 60);
                const days = Math.floor(hours / 24);

                if (days > 0) return \`\${days}d ago\`;
                if (hours > 0) return \`\${hours}h ago\`;
                if (minutes > 0) return \`\${minutes}m ago\`;
                return 'just now';
            };

            const truncatePath = (path) => {
                if (path.length > 30) {
                    return '...' + path.slice(-27);
                }
                return path;
            };

            return (
                <div className="dashboard-container">
                    {/* Status Card */}
                    <div className="status-card">
                        <div>
                            <div className="status-indicator">
                                <div className={\`status-dot \${trackingStatus}\`} aria-hidden="true"></div>
                                <span className="status-text">
                                    {trackingStatus === 'active' ? 'Tracking Active' : 'Tracking Paused'}
                                </span>
                            </div>
                            <div className="status-meta">
                                {fileCount} {fileCount === 1 ? 'file' : 'files'} tracked today
                            </div>
                        </div>
                        <button
                            onClick={handleToggleTracking}
                            className="action-button secondary"
                            style={{ marginBottom: 0, padding: '6px 12px', fontSize: '0.75rem' }}
                            aria-label={trackingStatus === 'active' ? 'Pause tracking' : 'Resume tracking'}
                        >
                            {trackingStatus === 'active' ? 'Pause' : 'Resume'}
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="quick-actions">
                        <div className="quick-actions-title">Commands</div>

                        {/* Generate Standup - Always visible */}
                        <button
                            onClick={handleGenerateStandup}
                            className="action-button primary"
                            aria-label="Generate standup summary"
                        >
                            <Icons.pulse />
                            Generate Standup
                        </button>

                        {/* Collapsible Command Sections */}
                        {(() => {
                            const toggleSection = (section) => {
                                setExpandedSection(expandedSection === section ? null : section);
                            };

                            const CommandButton = ({ label, command, icon: Icon, primary = false }) => (
                                <button
                                    onClick={() => vscode.postMessage({ command })}
                                    className={primary ? 'primary' : 'secondary'}
                                    aria-label={label}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--spacing-sm)',
                                        width: '100%',
                                        marginBottom: 'var(--spacing-xs)'
                                    }}
                                >
                                    <Icon />
                                    <span style={{ fontSize: '0.75rem' }}>{label}</span>
                                </button>
                            );

                            const Section = ({ title, icon: Icon, children, id }) => (
                                <div style={{ marginBottom: 'var(--spacing-md)' }}>
                                    <div
                                        onClick={() => toggleSection(id)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            cursor: 'pointer',
                                            padding: 'var(--spacing-sm)',
                                            backgroundColor: 'var(--card-color)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: 'var(--border-radius-sm)',
                                            userSelect: 'none'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                                            <Icon />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary-color)' }}>
                                                {title}
                                            </span>
                                        </div>
                                        {expandedSection === id ? <Icons.chevronUp /> : <Icons.chevronDown />}
                                    </div>
                                    {expandedSection === id && (
                                        <div style={{ marginTop: 'var(--spacing-xs)' }}>
                                            {children}
                                        </div>
                                    )}
                                </div>
                            );

                            return (
                                <>
                                    <Section title="Views & Analytics" icon={Icons.chart} id="views">
                                        <CommandButton label="View History" command="viewHistory" icon={Icons.history} />
                                        <CommandButton label="View Analytics" command="viewAnalytics" icon={Icons.chart} />
                                        <CommandButton label="Preview Data" command="previewData" icon={Icons.database} />
                                    </Section>

                                    <Section title="Export" icon={Icons.export} id="export">
                                        <CommandButton label="Copy to Clipboard" command="copyToClipboard" icon={Icons.copy} />
                                        <CommandButton label="Export to Notion" command="exportToNotion" icon={Icons.cloud} />
                                        <CommandButton label="Export to Jira" command="exportToJira" icon={Icons.shield} />
                                        <CommandButton label="Generate Weekly Digest" command="generateWeeklyDigest" icon={Icons.file} />
                                    </Section>

                                    <Section title="Configuration" icon={Icons.settings} id="config">
                                        <CommandButton label="Configure Settings" command="configureSettings" icon={Icons.settings} />
                                        <CommandButton label="Set Gemini API Key" command="setApiKey" icon={Icons.key} />
                                        <CommandButton label="Set OpenAI API Key" command="setOpenaiApiKey" icon={Icons.key} />
                                        <CommandButton label="Set Claude API Key" command="setClaudeApiKey" icon={Icons.key} />
                                        <CommandButton label="Set Notion Token" command="setNotionToken" icon={Icons.key} />
                                        <CommandButton label="Set Jira Token" command="setJiraToken" icon={Icons.key} />
                                    </Section>

                                    <Section title="Integrations" icon={Icons.cloud} id="integrations">
                                        <CommandButton label="Test Jira Connection" command="testJiraConnection" icon={Icons.check} />
                                        <CommandButton label="Test GitHub Connection" command="testGitHubConnection" icon={Icons.check} />
                                        <CommandButton label="Test Slack Connection" command="testSlackConnection" icon={Icons.check} />
                                    </Section>

                                    <Section title="Notifications" icon={Icons.bell} id="notifications">
                                        <CommandButton label="Show Notifications" command="showNotifications" icon={Icons.bell} />
                                        <CommandButton label="Mark All Read" command="markNotificationsRead" icon={Icons.check} />
                                    </Section>
                                </>
                            );
                        })()}
                    </div>

                    {/* Today's Activity */}
                    <div className="activity-section">
                        <div className="activity-title">Today's Activity</div>

                        {/* Top Files */}
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <div className="quick-actions-title">Top Files</div>
                            {topFiles.length > 0 ? (
                                <div className="activity-list">
                                    {topFiles.map((file, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-item-primary" title={file.file}>
                                                <Icons.file />
                                                {truncatePath(file.file)}
                                            </div>
                                            <div className="activity-item-secondary">
                                                {file.timeSpent} • {file.linesChanged} lines changed
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">No files tracked yet</div>
                            )}
                        </div>

                        {/* Recent Commits */}
                        <div style={{ marginBottom: 'var(--spacing-md)' }}>
                            <div className="quick-actions-title">Recent Commits</div>
                            {commits.length > 0 ? (
                                <div className="activity-list">
                                    {commits.slice(0, 3).map((commit, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-item-primary" title={commit.message}>
                                                <Icons.git />
                                                {commit.message.length > 40
                                                    ? commit.message.substring(0, 40) + '...'
                                                    : commit.message}
                                            </div>
                                            <div className="activity-item-secondary">
                                                {formatRelativeTime(commit.timestamp)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">No commits yet</div>
                            )}
                        </div>

                        {/* Recent Commands */}
                        <div>
                            <div className="quick-actions-title">Recent Commands</div>
                            {commands.length > 0 ? (
                                <div className="activity-list">
                                    {commands.slice(0, 3).map((cmd, index) => (
                                        <div key={index} className="activity-item">
                                            <div className="activity-item-primary" title={cmd}>
                                                <Icons.terminal />
                                                {cmd.length > 35
                                                    ? cmd.substring(0, 35) + '...'
                                                    : cmd}
                                            </div>
                                            <div className="activity-item-secondary">
                                                recent
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="empty-state">No commands yet</div>
                            )}
                        </div>
                    </div>
                </div>
            );
        };

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(<Dashboard />);
    </script>

    <!-- Injection of initial data -->
    <script nonce="${nonce}">
        window.initialData = ${JSON.stringify(activityData)};
    </script>
</body>
</html>`;
    }

    /**
     * Dispose of resources
     */
    public dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.themeManager.dispose();
        this.accessibilityManager.dispose();
        this.i18nService.dispose();
    }

    /**
     * Get current view instance (for debugging)
     */
    public getView(): vscode.WebviewView | undefined {
        return this._view;
    }
}
