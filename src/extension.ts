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
import { HistoryPanel } from './webviews/HistoryPanel';
import { ConfigManager } from './utils/ConfigManager';
import { DataAuditPanel } from './webviews/DataAuditPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Standup Autobot is now active!');

    // --- 1. Dependencies ---
    const activityTracker = new ActivityTracker(context);
    const gitTracker = new GitTracker();
    const terminalTracker = new TerminalTracker();
    const standupGenerator = new StandupGenerator();
    const exporterService = new ExporterService();
    const historyService = new HistoryService(context);
    
    // --- 2. Register ALL Commands EARLY ---

    // Generate Daily
    const generateDisposable = vscode.commands.registerCommand('standup.generate', async () => {
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
                StandupCardProvider.createOrShow(context.extensionUri, markdown);
                await historyService.saveStandup(markdown);
                await historyService.logActivity(activityTracker.getFileCount());
            } catch (error: any) {
                vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
            }
        });
    });

    // View History & Trends
    const historyDisposable = vscode.commands.registerCommand('standup.viewHistory', () => {
        HistoryPanel.createOrShow(context.extensionUri, context);
    });

    // Privacy & Control
    const toggleTrackingDisposable = vscode.commands.registerCommand('standup.toggleTracking', async () => {
        const isPaused = context.globalState.get<boolean>('standup.paused', false);
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
        DataAuditPanel.createOrShow(context.extensionUri, data, () => {
            vscode.commands.executeCommand('standup.generate');
        });
    });

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

    // Export & Keys
    const setApiKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', () => setApiKeyCommand(context));
    const setNotionTokenDisposable = vscode.commands.registerCommand('standup.setNotionToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Notion Token', password: true });
        if (token) await context.secrets.store('standup.notionToken', token);
    });
    const setJiraTokenDisposable = vscode.commands.registerCommand('standup.setJiraToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter Jira API Token', password: true });
        if (token) await context.secrets.store('standup.jiraToken', token);
    });

    const exportToNotionDisposable = vscode.commands.registerCommand('standup.exportToNotion', async () => {
        const token = await context.secrets.get('standup.notionToken');
        const pageId = vscode.workspace.getConfiguration('standup').get<string>('notionPageId');
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (!token || !pageId || !lastMarkdown) { vscode.window.showErrorMessage('Config or standup missing.'); return; }
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

    // Webview internal bridge
    const copyTeamsDisposable = vscode.commands.registerCommand('standup.copyForTeams', async (text: string) => {
        await vscode.env.clipboard.writeText(exporterService.formatForTeams(text));
        vscode.window.showInformationMessage('Copied!');
    });
    const sendEmailDisposable = vscode.commands.registerCommand('standup.sendEmail', (text: string) => exporterService.exportToEmail(text));

    // Register all to subscriptions
    context.subscriptions.push(
        activityTracker, generateDisposable, historyDisposable, toggleTrackingDisposable, 
        previewDataDisposable, weeklyDigestDisposable, setApiKeyDisposable, setNotionTokenDisposable, 
        setJiraTokenDisposable, exportToNotionDisposable, exportToJiraDisposable, copyTeamsDisposable, sendEmailDisposable
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

    // --- 4. Initialization & Scheduler ---
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
