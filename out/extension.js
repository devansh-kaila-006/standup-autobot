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
const HistoryPanel_1 = require("./webviews/HistoryPanel");
const DataAuditPanel_1 = require("./webviews/DataAuditPanel");
const AnalyticsPanel_1 = require("./webviews/AnalyticsPanel");
const KeyboardShortcutManager_1 = require("./utils/KeyboardShortcutManager");
const I18nService_1 = require("./i18n/I18nService");
const UnifiedAIService_1 = require("./services/UnifiedAIService");
const JiraService_1 = require("./services/JiraService");
const SlackService_1 = require("./services/SlackService");
const TeamsService_1 = require("./services/TeamsService");
function activate(context) {
    console.log('Standup Autobot is now active!');
    // --- 1. Dependencies ---
    const activityTracker = new activityTracker_1.ActivityTracker(context);
    const gitTracker = new gitTracker_1.GitTracker();
    const terminalTracker = new terminalTracker_1.TerminalTracker();
    const standupGenerator = new standupGenerator_1.StandupGenerator();
    const unifiedAIService = new UnifiedAIService_1.UnifiedAIService(context);
    const exporterService = new ExporterService_1.ExporterService();
    const historyService = new HistoryService_1.HistoryService(context);
    // --- Phase 5: Initialize integration services ---
    const jiraService = new JiraService_1.JiraService(context);
    const slackService = new SlackService_1.SlackService(context);
    const teamsService = new TeamsService_1.TeamsService(context);
    // --- Phase 7: Initialize UX services ---
    const i18nService = new I18nService_1.I18nService(context);
    const keyboardShortcutManager = new KeyboardShortcutManager_1.KeyboardShortcutManager();
    // --- 2. Register Commands ---
    // Helper function to auto-post standup to integrations
    const autoPostStandup = async (markdown) => {
        const config = vscode.workspace.getConfiguration('standup');
        const autoPostToSlack = config.get('autoPostToSlack', false);
        const autoPostToTeams = config.get('autoPostToTeams', false);
        if (autoPostToSlack) {
            try {
                const webhookUrl = await context.secrets.get('standup.slackWebhookUrl');
                if (webhookUrl) {
                    await slackService.postWebhook(markdown);
                    vscode.window.showInformationMessage('Standup posted to Slack!');
                }
            }
            catch (error) {
                vscode.window.showWarningMessage(`Failed to post to Slack: ${error.message}`);
            }
        }
        if (autoPostToTeams) {
            try {
                const webhookUrl = await context.secrets.get('standup.teamsWebhookUrl');
                if (webhookUrl) {
                    await teamsService.sendMessage(markdown);
                    vscode.window.showInformationMessage('Standup posted to Teams!');
                }
            }
            catch (error) {
                vscode.window.showWarningMessage(`Failed to post to Teams: ${error.message}`);
            }
        }
    };
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
                standupCard_1.StandupCardProvider.createOrShow(context.extensionUri, markdown, context);
                await historyService.saveStandup(markdown);
                await historyService.logActivity(activityTracker.getFileCount());
                // Auto-post to integrations if configured
                await autoPostStandup(markdown);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
            }
        });
    });
    // Generate Standup (new command name for keyboard shortcuts)
    const generateDisposable2 = vscode.commands.registerCommand('standup.generateStandup', async () => {
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
                standupCard_1.StandupCardProvider.createOrShow(context.extensionUri, markdown, context);
                await historyService.saveStandup(markdown);
                await historyService.logActivity(activityTracker.getFileCount());
                // Auto-post to integrations if configured
                await autoPostStandup(markdown);
            }
            catch (error) {
                vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
            }
        });
    });
    // View History (alias for backwards compatibility)
    const historyDisposable = vscode.commands.registerCommand('standup.viewHistory', () => {
        HistoryPanel_1.HistoryPanel.createOrShow(context.extensionUri, context);
    });
    const historyDisposable2 = vscode.commands.registerCommand('standup.showHistory', () => {
        HistoryPanel_1.HistoryPanel.createOrShow(context.extensionUri, context);
    });
    // View Analytics Dashboard (alias for backwards compatibility)
    const analyticsDisposable = vscode.commands.registerCommand('standup.viewAnalytics', () => {
        AnalyticsPanel_1.AnalyticsPanel.createOrShow(context.extensionUri, context);
    });
    const analyticsDisposable2 = vscode.commands.registerCommand('standup.showAnalytics', () => {
        AnalyticsPanel_1.AnalyticsPanel.createOrShow(context.extensionUri, context);
    });
    // Toggle Tracking
    const toggleTrackingDisposable = vscode.commands.registerCommand('standup.toggleTracking', async () => {
        const isPaused = context.globalState.get('standup.paused', false);
        await context.globalState.update('standup.paused', !isPaused);
        updateStatusBar();
        vscode.window.showInformationMessage(`Standup tracking ${!isPaused ? 'paused' : 'resumed'}.`);
    });
    // Data Audit
    const previewDataDisposable = vscode.commands.registerCommand('standup.previewData', async () => {
        const data = {
            topFiles: activityTracker.getTopFiles(10),
            commits: await gitTracker.getRecentCommits(24),
            commands: await terminalTracker.getTerminalHistory(20)
        };
        DataAuditPanel_1.DataAuditPanel.createOrShow(context.extensionUri, data, () => {
            vscode.commands.executeCommand('standup.generate');
        }, context);
    });
    const dataAuditDisposable2 = vscode.commands.registerCommand('standup.dataAudit', async () => {
        const data = {
            topFiles: activityTracker.getTopFiles(10),
            commits: await gitTracker.getRecentCommits(24),
            commands: await terminalTracker.getTerminalHistory(20)
        };
        DataAuditPanel_1.DataAuditPanel.createOrShow(context.extensionUri, data, () => {
            vscode.commands.executeCommand('standup.generate');
        }, context);
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
    // API Keys
    const setApiKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', () => (0, auth_1.setApiKeyCommand)(context));
    const setOpenaiApiKeyDisposable = vscode.commands.registerCommand('standup.setOpenaiApiKey', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter OpenAI API Key', password: true });
        if (token)
            await context.secrets.store('standup.openaiApiKey', token);
    });
    const setClaudeApiKeyDisposable = vscode.commands.registerCommand('standup.setClaudeApiKey', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Claude API Key', password: true });
        if (token)
            await context.secrets.store('standup.claudeApiKey', token);
    });
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
    // Exports
    const exportToNotionDisposable = vscode.commands.registerCommand('standup.exportToNotion', async () => {
        const token = await context.secrets.get('standup.notionToken');
        const config = vscode.workspace.getConfiguration('standup');
        const pageId = config.get('notionPageId');
        const lastMarkdown = context.globalState.get('standup.lastGenerated');
        if (!token || !pageId || !lastMarkdown) {
            vscode.window.showErrorMessage('Config missing.');
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
    // Copy to Clipboard
    const copyToClipboardDisposable = vscode.commands.registerCommand('standup.copyToClipboard', async () => {
        const lastMarkdown = context.globalState.get('standup.lastGenerated');
        if (lastMarkdown) {
            await vscode.env.clipboard.writeText(lastMarkdown);
            vscode.window.showInformationMessage('Copied to clipboard!');
        }
    });
    // Export (opens export menu)
    const exportDisposable = vscode.commands.registerCommand('standup.export', async () => {
        // Quick export to clipboard for now, can be expanded to show menu
        const lastMarkdown = context.globalState.get('standup.lastGenerated');
        if (lastMarkdown) {
            await vscode.env.clipboard.writeText(lastMarkdown);
            vscode.window.showInformationMessage('Exported to clipboard!');
        }
    });
    // Configure Settings
    const configureSettingsDisposable = vscode.commands.registerCommand('standup.configureSettings', async () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:standup-autobot.standup-autobot');
    });
    const copyTeamsDisposable = vscode.commands.registerCommand('standup.copyForTeams', async (text) => {
        await vscode.env.clipboard.writeText(exporterService.formatForTeams(text));
        vscode.window.showInformationMessage('Copied!');
    });
    const sendEmailDisposable = vscode.commands.registerCommand('standup.sendEmail', (text) => exporterService.exportToEmail(text));
    // Connection Test Commands
    const testJiraConnectionDisposable = vscode.commands.registerCommand('standup.testJiraConnection', async () => {
        try {
            const result = await jiraService.testConnection();
            if (result) {
                vscode.window.showInformationMessage('Jira connection successful!');
            }
            else {
                vscode.window.showErrorMessage('Jira connection failed. Please check your settings.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Jira connection error: ${error.message}`);
        }
    });
    const testGitHubConnectionDisposable = vscode.commands.registerCommand('standup.testGitHubConnection', async () => {
        const token = await context.secrets.get('standup.githubToken');
        if (!token) {
            vscode.window.showWarningMessage('GitHub token not set. Please set it first.');
            return;
        }
        vscode.window.showInformationMessage('GitHub connection test not yet implemented.');
    });
    const testSlackConnectionDisposable = vscode.commands.registerCommand('standup.testSlackConnection', async () => {
        try {
            const result = await slackService.testConnection();
            if (result) {
                vscode.window.showInformationMessage('Slack connection successful!');
            }
            else {
                vscode.window.showErrorMessage('Slack connection failed. Please check your settings.');
            }
        }
        catch (error) {
            vscode.window.showErrorMessage(`Slack connection error: ${error.message}`);
        }
    });
    // Register all to subscriptions
    context.subscriptions.push(activityTracker, generateDisposable, generateDisposable2, historyDisposable, historyDisposable2, analyticsDisposable, analyticsDisposable2, toggleTrackingDisposable, previewDataDisposable, dataAuditDisposable2, weeklyDigestDisposable, setApiKeyDisposable, setOpenaiApiKeyDisposable, setClaudeApiKeyDisposable, setNotionTokenDisposable, setJiraTokenDisposable, exportToNotionDisposable, exportToJiraDisposable, copyTeamsDisposable, sendEmailDisposable, copyToClipboardDisposable, exportDisposable, configureSettingsDisposable, testJiraConnectionDisposable, testGitHubConnectionDisposable, testSlackConnectionDisposable, i18nService, keyboardShortcutManager, unifiedAIService, jiraService, slackService, teamsService);
    // --- 3. Status Bar ---
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'standup.toggleTracking';
    context.subscriptions.push(statusBarItem);
    function updateStatusBar() {
        const isPaused = context.globalState.get('standup.paused', false);
        statusBarItem.text = isPaused ? `$(debug-pause) Standup: Paused` : `$(pulse) Standup: Tracking`;
        statusBarItem.tooltip = isPaused ? 'Tracking is paused. Click to resume.' : 'Tracking activity... Click to pause.';
        statusBarItem.color = isPaused ? new vscode.ThemeColor('errorForeground') : undefined;
    }
    updateStatusBar();
    statusBarItem.show();
    // --- 4. Scheduler & Notifications ---
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
    setupScheduler();
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('standup.triggerTime'))
            setupScheduler();
    }));
}
function deactivate() { }
//# sourceMappingURL=extension.js.map