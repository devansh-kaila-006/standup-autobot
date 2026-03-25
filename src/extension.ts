import * as vscode from 'vscode';
import { ActivityTracker } from './trackers/activityTracker';
import { GitTracker } from './trackers/gitTracker';
import { TerminalTracker } from './trackers/terminalTracker';
import { StandupGenerator } from './services/standupGenerator';
import { StandupCardProvider } from './webviews/standupCard';
import { setApiKeyCommand, ensureApiKey } from './utils/auth';
import { ExporterService } from './services/ExporterService';
import { HistoryService } from './services/HistoryService';
import { DigestService } from './services/DigestService';
import { ConfigManager } from './utils/ConfigManager';
import { HistoryPanel } from './webviews/HistoryPanel';
import { DataAuditPanel } from './webviews/DataAuditPanel';
import { AnalyticsPanel } from './webviews/AnalyticsPanel';
import { KeyboardShortcutManager } from './utils/KeyboardShortcutManager';
import { I18nService } from './i18n/I18nService';
import { UnifiedAIService } from './services/UnifiedAIService';
import { JiraService } from './services/JiraService';
import { SlackService } from './services/SlackService';
import { TeamsService } from './services/TeamsService';

export function activate(context: vscode.ExtensionContext) {
    console.log('Standup Autobot is now active!');

    // --- 1. Dependencies ---
    const activityTracker = new ActivityTracker(context);
    const gitTracker = new GitTracker();
    const terminalTracker = new TerminalTracker();
    const standupGenerator = new StandupGenerator();
    const unifiedAIService = new UnifiedAIService(context);
    const exporterService = new ExporterService();
    const historyService = new HistoryService(context);

    // --- Phase 5: Initialize integration services ---
    const jiraService = new JiraService(context);
    const slackService = new SlackService(context);
    const teamsService = new TeamsService(context);

    // --- Phase 7: Initialize UX services ---
    const i18nService = new I18nService(context);
    const keyboardShortcutManager = new KeyboardShortcutManager();
    
    // --- 2. Register Commands ---

    // Helper function to auto-post standup to integrations
    const autoPostStandup = async (markdown: string): Promise<void> => {
        const config = vscode.workspace.getConfiguration('standup');
        const autoPostToSlack = config.get<boolean>('autoPostToSlack', false);
        const autoPostToTeams = config.get<boolean>('autoPostToTeams', false);

        if (autoPostToSlack) {
            try {
                const webhookUrl = await context.secrets.get('standup.slackWebhookUrl');
                if (webhookUrl) {
                    await slackService.postWebhook(markdown);
                    vscode.window.showInformationMessage('Standup posted to Slack!');
                }
            } catch (error: any) {
                vscode.window.showWarningMessage(`Failed to post to Slack: ${error.message}`);
            }
        }

        if (autoPostToTeams) {
            try {
                const webhookUrl = await context.secrets.get('standup.teamsWebhookUrl');
                if (webhookUrl) {
                    await teamsService.postSimpleMessage(webhookUrl, markdown, 'Daily Standup');
                    vscode.window.showInformationMessage('Standup posted to Teams!');
                }
            } catch (error: any) {
                vscode.window.showWarningMessage(`Failed to post to Teams: ${error.message}`);
            }
        }
    };

    // Generate Daily Standup
    const generateDaily = async () => {
        const config = ConfigManager.getConfig();
        const durationHours = config.activityDuration;
        const apiKey = await ensureApiKey(context);
        if (!apiKey) return;

        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Gathering activity..." }, async () => {
            try {
                const dailyData = {
                    topFiles: activityTracker.getTopFiles(5),
                    commits: await gitTracker.getRecentCommits(durationHours),
                    commands: await terminalTracker.getTerminalHistory(10)
                };
                const markdown = await standupGenerator.generateStandup(dailyData, apiKey, config, durationHours);
                context.globalState.update('standup.lastGenerated', markdown);
                StandupCardProvider.createOrShow(context.extensionUri, markdown, context);
                await historyService.saveStandup(markdown);
                await historyService.logActivity(activityTracker.getFileCount());

                // Auto-post to integrations if configured
                await autoPostStandup(markdown);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
            }
        });
    };

    // Register both command names for backward compatibility
    const generateDisposable = vscode.commands.registerCommand('standup.generate', generateDaily);
    const generateDisposable2 = vscode.commands.registerCommand('standup.generateStandup', generateDaily);

    // View History
    const showHistory = () => HistoryPanel.createOrShow(context.extensionUri, context);

    // Register both command names for backward compatibility
    const historyDisposable = vscode.commands.registerCommand('standup.viewHistory', showHistory);
    const historyDisposable2 = vscode.commands.registerCommand('standup.showHistory', showHistory);

    // View Analytics Dashboard
    const showAnalytics = () => AnalyticsPanel.createOrShow(context.extensionUri, context);

    // Register both command names for backward compatibility
    const analyticsDisposable = vscode.commands.registerCommand('standup.viewAnalytics', showAnalytics);
    const analyticsDisposable2 = vscode.commands.registerCommand('standup.showAnalytics', showAnalytics);

    // Toggle Tracking
    const toggleTrackingDisposable = vscode.commands.registerCommand('standup.toggleTracking', async () => {
        const isPaused = context.globalState.get<boolean>('standup.paused', false);
        await context.globalState.update('standup.paused', !isPaused);
        updateStatusBar();
        vscode.window.showInformationMessage(`Standup tracking ${!isPaused ? 'paused' : 'resumed'}.`);
    });

    // Data Audit / Preview Data
    const showDataAudit = async () => {
        const data = {
            topFiles: activityTracker.getTopFiles(10),
            commits: await gitTracker.getRecentCommits(24),
            commands: await terminalTracker.getTerminalHistory(20)
        };
        DataAuditPanel.createOrShow(context.extensionUri, data, () => {
            vscode.commands.executeCommand('standup.generate');
        }, context);
    };

    // Register both command names for backward compatibility
    const previewDataDisposable = vscode.commands.registerCommand('standup.previewData', showDataAudit);
    const dataAuditDisposable2 = vscode.commands.registerCommand('standup.dataAudit', showDataAudit);

    // Weekly Digest
    const weeklyDigestDisposable = vscode.commands.registerCommand('standup.generateWeeklyDigest', async () => {
        const apiKey = await ensureApiKey(context);
        if (!apiKey) return;
        const weeklyHistory = historyService.getWeeklySummaries();
        if (weeklyHistory.length < 3) {
            vscode.window.showInformationMessage('Need at least 3 standups in history for a weekly digest.');
            return;
        }
        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Generating Weekly Digest..." }, async () => {
            try {
                const digest = await DigestService.generateWeeklyDigest(weeklyHistory, standupGenerator, apiKey);
                StandupCardProvider.createOrShow(context.extensionUri, digest);
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed: ${error.message}`);
            }
        });
    });

    // API Keys
    const setApiKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', () => setApiKeyCommand(context));
    const setOpenaiApiKeyDisposable = vscode.commands.registerCommand('standup.setOpenaiApiKey', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter OpenAI API Key', password: true });
        if (token) await context.secrets.store('standup.openaiApiKey', token);
    });
    const setClaudeApiKeyDisposable = vscode.commands.registerCommand('standup.setClaudeApiKey', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Claude API Key', password: true });
        if (token) await context.secrets.store('standup.claudeApiKey', token);
    });
    const setNotionTokenDisposable = vscode.commands.registerCommand('standup.setNotionToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Notion Token', password: true });
        if (token) await context.secrets.store('standup.notionToken', token);
    });
    const setJiraTokenDisposable = vscode.commands.registerCommand('standup.setJiraToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Jira API Token', password: true });
        if (token) await context.secrets.store('standup.jiraToken', token);
    });

    // Exports
    const exportToNotionDisposable = vscode.commands.registerCommand('standup.exportToNotion', async () => {
        const token = await context.secrets.get('standup.notionToken');
        const config = vscode.workspace.getConfiguration('standup');
        const pageId = config.get<string>('notionPageId');
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (!token || !pageId || !lastMarkdown) { vscode.window.showErrorMessage('Config missing.'); return; }
        const msg = await exporterService.exportToNotion(lastMarkdown, { token, pageId });
        vscode.window.showInformationMessage(msg);
    });

    const exportToJiraDisposable = vscode.commands.registerCommand('standup.exportToJira', async () => {
        const token = await context.secrets.get('standup.jiraToken');
        const config = vscode.workspace.getConfiguration('standup');
        const domain = config.get<string>('jiraDomain');
        const email = config.get<string>('jiraEmail');
        const issueKey = config.get<string>('jiraIssueKey') || await vscode.window.showInputBox({ prompt: 'Issue Key' });
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (!token || !domain || !email || !issueKey || !lastMarkdown) { vscode.window.showErrorMessage('Config missing.'); return; }
        const msg = await exporterService.exportToJira(lastMarkdown, { domain, email, token, issueKey });
        vscode.window.showInformationMessage(msg);
    });

    // Copy to Clipboard
    const copyToClipboardDisposable = vscode.commands.registerCommand('standup.copyToClipboard', async () => {
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (lastMarkdown) {
            await vscode.env.clipboard.writeText(lastMarkdown);
            vscode.window.showInformationMessage('Copied to clipboard!');
        }
    });

    // Export (opens export menu)
    const exportDisposable = vscode.commands.registerCommand('standup.export', async () => {
        // Quick export to clipboard for now, can be expanded to show menu
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (lastMarkdown) {
            await vscode.env.clipboard.writeText(lastMarkdown);
            vscode.window.showInformationMessage('Exported to clipboard!');
        }
    });

    // Configure Settings
    const configureSettingsDisposable = vscode.commands.registerCommand('standup.configureSettings', async () => {
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:standup-autobot.standup-autobot');
    });

    const copyTeamsDisposable = vscode.commands.registerCommand('standup.copyForTeams', async (text: string) => {
        await vscode.env.clipboard.writeText(exporterService.formatForTeams(text));
        vscode.window.showInformationMessage('Copied!');
    });
    const sendEmailDisposable = vscode.commands.registerCommand('standup.sendEmail', (text: string) => exporterService.exportToEmail(text));

    // Connection Test Commands
    const testJiraConnectionDisposable = vscode.commands.registerCommand('standup.testJiraConnection', async () => {
        try {
            const result = await jiraService.testConnection();
            if (result) {
                vscode.window.showInformationMessage('Jira connection successful!');
            } else {
                vscode.window.showErrorMessage('Jira connection failed. Please check your settings.');
            }
        } catch (error: any) {
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
            } else {
                vscode.window.showErrorMessage('Slack connection failed. Please check your settings.');
            }
        } catch (error: any) {
            vscode.window.showErrorMessage(`Slack connection error: ${error.message}`);
        }
    });

    // Register all to subscriptions
    context.subscriptions.push(
        activityTracker, generateDisposable, generateDisposable2, historyDisposable, historyDisposable2,
        analyticsDisposable, analyticsDisposable2, toggleTrackingDisposable,
        previewDataDisposable, dataAuditDisposable2, weeklyDigestDisposable,
        setApiKeyDisposable, setOpenaiApiKeyDisposable, setClaudeApiKeyDisposable, setNotionTokenDisposable, setJiraTokenDisposable,
        exportToNotionDisposable, exportToJiraDisposable, copyTeamsDisposable, sendEmailDisposable,
        copyToClipboardDisposable, exportDisposable, configureSettingsDisposable,
        testJiraConnectionDisposable, testGitHubConnectionDisposable, testSlackConnectionDisposable,
        i18nService, keyboardShortcutManager, unifiedAIService, jiraService, slackService, teamsService
    );

    // --- 3. Status Bar ---
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'standup.toggleTracking';
    context.subscriptions.push(statusBarItem);
    
    function updateStatusBar() {
        const isPaused = context.globalState.get<boolean>('standup.paused', false);
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

    let schedulerTimer: NodeJS.Timeout | undefined;
    function setupScheduler() {
        if (schedulerTimer) clearTimeout(schedulerTimer);
        const config = ConfigManager.getConfig();
        const [hours, minutes] = config.triggerTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return;

        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        if (scheduledTime <= now) scheduledTime.setDate(scheduledTime.getDate() + 1);
        const delay = scheduledTime.getTime() - now.getTime();
        
        schedulerTimer = setTimeout(async () => {
            await vscode.commands.executeCommand('standup.generate');
            if (new Date().getDay() === 5) await vscode.commands.executeCommand('standup.generateWeeklyDigest');
            setupScheduler();
        }, delay);

        const previewDelay = delay - (2 * 60 * 1000);
        if (previewDelay > 0) {
            setTimeout(async () => {
                const choice = await vscode.window.showInformationMessage('Standup in 2 mins. Review data?', 'View Raw', 'Dismiss');
                if (choice === 'View Raw') await vscode.commands.executeCommand('standup.previewData');
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
        if (e.affectsConfiguration('standup.triggerTime')) setupScheduler();
    }));
}

export function deactivate() {}
