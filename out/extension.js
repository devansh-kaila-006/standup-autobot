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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const activityTracker_1 = require("./trackers/activityTracker");
const gitTracker_1 = require("./trackers/gitTracker");
const terminalTracker_1 = require("./trackers/terminalTracker");
const standupGenerator_1 = require("./services/standupGenerator");
const standupCard_1 = require("./webviews/standupCard");
const auth_1 = require("./utils/auth");
const ExporterService_1 = require("./services/ExporterService");
const HistoryService_1 = require("./services/HistoryService");
const DigestService_1 = require("./services/DigestService");
const ConfigManager_1 = require("./utils/ConfigManager");
const DataAuditPanel_1 = require("./webviews/DataAuditPanel");
const DashboardPanel_1 = require("./webviews/DashboardPanel");
async function activate(context) {
    console.log('Standup Autobot: Activating...');
    try {
        const historyService = new HistoryService_1.HistoryService(context);
        // --- 0. Webview Persistence (Must be early!) ---
        if (vscode.window.registerWebviewPanelSerializer) {
            vscode.window.registerWebviewPanelSerializer(DashboardPanel_1.DashboardPanel.viewType, {
                async deserializeWebviewPanel(webviewPanel, state) {
                    console.log('Standup Autobot: Reviving Dashboard...');
                    DashboardPanel_1.DashboardPanel.revive(webviewPanel, context.extensionUri, {
                        isPaused: context.globalState.get('standup.paused', false),
                        history: historyService.getHistory(),
                        heatmapData: historyService.getWeeklyActivityIntensity()
                    });
                }
            });
        }
        // --- 1. Dependencies ---
        const activityTracker = new activityTracker_1.ActivityTracker(context);
        const gitTracker = new gitTracker_1.GitTracker();
        const terminalTracker = new terminalTracker_1.TerminalTracker();
        const standupGenerator = new standupGenerator_1.StandupGenerator();
        const exporterService = new ExporterService_1.ExporterService();
        // --- 2. Register ALL Commands EARLY ---
        // Generate Daily
        const generateDisposable = vscode.commands.registerCommand('standup.generate', async () => {
            const config = ConfigManager_1.ConfigManager.getConfig();
            const durationHours = config.activityDuration;
            const apiKey = await (0, auth_1.ensureApiKey)(context);
            if (!apiKey)
                return;
            vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Gathering activity..." }, async () => {
                try {
                    const dailyData = {
                        topFiles: activityTracker.getTopFiles(5),
                        commits: await gitTracker.getRecentCommits(durationHours),
                        commands: await terminalTracker.getTerminalHistory(10)
                    };
                    const markdown = await standupGenerator.generateStandup(dailyData, apiKey, config, durationHours);
                    context.globalState.update('standup.lastGenerated', markdown);
                    standupCard_1.StandupCardProvider.createOrShow(context.extensionUri, markdown);
                    await historyService.saveStandup(markdown);
                    await historyService.logActivity(activityTracker.getFileCount());
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
                }
            });
        });
        // View History & Trends
        context.subscriptions.push(vscode.commands.registerCommand('standup.viewHistory', () => {
            DashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, {
                isPaused: context.globalState.get('standup.paused', false),
                history: historyService.getHistory(),
                heatmapData: historyService.getWeeklyActivityIntensity()
            });
        }));
        // Privacy & Control
        const toggleTrackingDisposable = vscode.commands.registerCommand('standup.toggleTracking', async () => {
            const isPaused = context.globalState.get('standup.paused', false);
            await context.globalState.update('standup.paused', !isPaused);
            updateStatusBar();
            vscode.window.showInformationMessage(`Standup tracking ${!isPaused ? 'paused' : 'resumed'}.`);
        });
        const previewDataDisposable = vscode.commands.registerCommand('standup.previewData', async () => {
            const data = {
                topFiles: activityTracker.getTopFiles(10),
                commits: await gitTracker.getRecentCommits(24),
                commands: await terminalTracker.getTerminalHistory(20)
            };
            DataAuditPanel_1.DataAuditPanel.createOrShow(context.extensionUri, data, () => {
                vscode.commands.executeCommand('standup.generate');
            });
        });
        // Weekly Digest
        const weeklyDigestDisposable = vscode.commands.registerCommand('standup.generateWeeklyDigest', async () => {
            const apiKey = await (0, auth_1.ensureApiKey)(context);
            if (!apiKey)
                return;
            const weeklyHistory = historyService.getWeeklySummaries();
            if (weeklyHistory.length < 3) {
                vscode.window.showInformationMessage('Need at least 3 standups in history for a weekly digest.');
                return;
            }
            vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Generating Weekly Digest..." }, async () => {
                try {
                    const digest = await DigestService_1.DigestService.generateWeeklyDigest(weeklyHistory, standupGenerator, apiKey);
                    standupCard_1.StandupCardProvider.createOrShow(context.extensionUri, digest);
                }
                catch (error) {
                    vscode.window.showErrorMessage(`Failed: ${error.message}`);
                }
            });
        });
        // Export & Keys
        const setApiKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', () => (0, auth_1.setApiKeyCommand)(context));
        const setNotionTokenDisposable = vscode.commands.registerCommand('standup.setNotionToken', async () => {
            const token = await vscode.window.showInputBox({ prompt: 'Enter Notion Token', password: true });
            if (token)
                await context.secrets.store('standup.notionToken', token);
        });
        const setJiraTokenDisposable = vscode.commands.registerCommand('standup.setJiraToken', async () => {
            const token = await vscode.window.showInputBox({ prompt: 'Enter Jira API Token', password: true });
            if (token)
                await context.secrets.store('standup.jiraToken', token);
        });
        const exportToNotionDisposable = vscode.commands.registerCommand('standup.exportToNotion', async () => {
            const token = await context.secrets.get('standup.notionToken');
            const pageId = vscode.workspace.getConfiguration('standup').get('notionPageId');
            const lastMarkdown = context.globalState.get('standup.lastGenerated');
            if (!token || !pageId || !lastMarkdown) {
                vscode.window.showErrorMessage('Config or standup missing.');
                return;
            }
            const msg = await exporterService.exportToNotion(lastMarkdown, { token, pageId });
            vscode.window.showInformationMessage(msg);
        });
        const exportToJiraDisposable = vscode.commands.registerCommand('standup.exportToJira', async () => {
            const token = await context.secrets.get('standup.jiraToken');
            const config = vscode.workspace.getConfiguration('standup');
            const domain = config.get('jiraDomain');
            const email = config.get('jiraEmail');
            const issueKey = config.get('jiraIssueKey') || await vscode.window.showInputBox({ prompt: 'Issue Key' });
            const lastMarkdown = context.globalState.get('standup.lastGenerated');
            if (!token || !domain || !email || !issueKey || !lastMarkdown) {
                vscode.window.showErrorMessage('Config missing.');
                return;
            }
            const msg = await exporterService.exportToJira(lastMarkdown, { domain, email, token, issueKey });
            vscode.window.showInformationMessage(msg);
        });
        // Webview internal bridge
        const copyTeamsDisposable = vscode.commands.registerCommand('standup.copyForTeams', async (text) => {
            await vscode.env.clipboard.writeText(exporterService.formatForTeams(text));
            vscode.window.showInformationMessage('Copied!');
        });
        const sendEmailDisposable = vscode.commands.registerCommand('standup.sendEmail', (text) => exporterService.exportToEmail(text));
        // Register all to subscriptions
        context.subscriptions.push(activityTracker, generateDisposable, toggleTrackingDisposable, previewDataDisposable, weeklyDigestDisposable, setApiKeyDisposable, setNotionTokenDisposable, setJiraTokenDisposable, exportToNotionDisposable, exportToJiraDisposable, copyTeamsDisposable, sendEmailDisposable);
        // --- 4. Status Bar ---
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        statusBarItem.command = 'standup.toggleTracking';
        context.subscriptions.push(statusBarItem);
        function updateStatusBar() {
            const isPaused = context.globalState.get('standup.paused', false);
            statusBarItem.text = isPaused ? `$(debug-pause) Standup: Paused` : `$(pulse) Standup: Tracking`;
            statusBarItem.tooltip = isPaused ? 'Tracking is paused. Click to resume.' : 'Tracking activity... Click to pause.';
            statusBarItem.color = isPaused ? new vscode.ThemeColor('errorForeground') : undefined;
            // Refresh dashboard if open
            DashboardPanel_1.DashboardPanel.update({
                isPaused,
                history: historyService.getHistory(),
                heatmapData: historyService.getWeeklyActivityIntensity()
            });
        }
        updateStatusBar();
        statusBarItem.show();
        // --- 4. Initialization & Scheduler ---
        const storageKey = 'standup.activityLog';
        if (!context.globalState.get(storageKey)) {
            context.globalState.update(storageKey, { lastUpdated: null, dailyLogs: [] });
        }
        let schedulerTimer;
        function setupScheduler() {
            if (schedulerTimer)
                clearTimeout(schedulerTimer);
            const config = ConfigManager_1.ConfigManager.getConfig();
            const [hours, minutes] = config.triggerTime.split(':').map(Number);
            if (isNaN(hours) || isNaN(minutes))
                return;
            const now = new Date();
            const scheduledTime = new Date();
            scheduledTime.setHours(hours, minutes, 0, 0);
            if (scheduledTime <= now)
                scheduledTime.setDate(scheduledTime.getDate() + 1);
            const delay = scheduledTime.getTime() - now.getTime();
            schedulerTimer = setTimeout(async () => {
                await vscode.commands.executeCommand('standup.generate');
                if (new Date().getDay() === 5)
                    await vscode.commands.executeCommand('standup.generateWeeklyDigest');
                setupScheduler();
            }, delay);
            const previewDelay = delay - (2 * 60 * 1000);
            if (previewDelay > 0) {
                setTimeout(async () => {
                    const choice = await vscode.window.showInformationMessage('Standup in 2 mins. Review data?', 'View Raw', 'Dismiss');
                    if (choice === 'View Raw')
                        await vscode.commands.executeCommand('standup.previewData');
                }, previewDelay);
            }
            const twoPM = new Date();
            twoPM.setHours(14, 0, 0, 0);
            if (twoPM > now && twoPM < scheduledTime) {
                setTimeout(() => {
                    if (activityTracker.getFileCount() === 0 && !context.globalState.get('standup.paused')) {
                        vscode.window.showWarningMessage('No activity tracked today. Did you forget to open VS Code?');
                    }
                }, twoPM.getTime() - now.getTime());
            }
        }
        context.subscriptions.push(vscode.commands.registerCommand('standup.showDashboard', () => {
            DashboardPanel_1.DashboardPanel.createOrShow(context.extensionUri, {
                isPaused: context.globalState.get('standup.paused', false),
                history: historyService.getHistory(),
                heatmapData: historyService.getWeeklyActivityIntensity()
            });
        }));
        setupScheduler();
        context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('standup.triggerTime'))
                setupScheduler();
        }));
    }
    catch (error) {
        console.error('Standup Autobot: Activation failed!', error);
        vscode.window.showErrorMessage(`Standup Autobot failed to start: ${error.message}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map