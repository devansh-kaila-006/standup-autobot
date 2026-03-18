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

    const storageKey = 'standup.activityLog';

    // Initialize trackers
    const activityTracker = new ActivityTracker(context);
    const gitTracker = new GitTracker();
    const terminalTracker = new TerminalTracker();
    const standupGenerator = new StandupGenerator();
    const exporterService = new ExporterService();
    const historyService = new HistoryService(context);
    
    // Status Bar Item
    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.command = 'standup.toggleTracking';
    context.subscriptions.push(statusBarItem);
    
    function updateStatusBar() {
        const isPaused = context.globalState.get<boolean>('standup.paused', false);
        if (isPaused) {
            statusBarItem.text = `$(debug-pause) Standup: Paused`;
            statusBarItem.tooltip = 'Tracking is paused. Click to resume.';
            statusBarItem.color = new vscode.ThemeColor('errorForeground');
        } else {
            statusBarItem.text = `$(pulse) Standup: Tracking`;
            statusBarItem.tooltip = 'Tracking activity... Click to pause.';
            statusBarItem.color = undefined;
        }
    }
    updateStatusBar();
    statusBarItem.show();

    context.subscriptions.push(activityTracker);

    // 1. Initialize a generic JSON object structure in globalState
    const existingData = context.globalState.get(storageKey);
    if (!existingData) {
        context.globalState.update(storageKey, { lastUpdated: null, dailyLogs: [] });
    }

    // 2. Register "standup.generate" command
    let generateDisposable = vscode.commands.registerCommand('standup.generate', async () => {
        const config = ConfigManager.getConfig();
        const durationHours = config.activityDuration;

        const apiKey = await ensureApiKey(context);
        if (!apiKey) { return; }

        vscode.window.showInformationMessage(`Standup Autobot: Gathering data for last ${durationHours} hours...`);

        const dailyData = {
            topFiles: activityTracker.getTopFiles(5),
            commits: await gitTracker.getRecentCommits(durationHours),
            commands: await terminalTracker.getTerminalHistory(10)
        };
        
        try {
            vscode.window.showInformationMessage('Standup Autobot: Generating summary using LLM...');
            const markdown = await standupGenerator.generateStandup(dailyData, apiKey, config, durationHours);
            
            context.globalState.update('standup.lastGenerated', markdown);
            StandupCardProvider.createOrShow(context.extensionUri, markdown);
            await historyService.saveStandup(markdown);
            await historyService.logActivity(activityTracker.getFileCount());
            
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
        }
    });

    // 3. Scheduler
    let schedulerTimer: NodeJS.Timeout | undefined;
    function setupScheduler() {
        if (schedulerTimer) { clearTimeout(schedulerTimer); }

        const config = ConfigManager.getConfig();
        const triggerTime = config.triggerTime;
        
        const [hours, minutes] = triggerTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) { return; }

        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);
        if (scheduledTime <= now) { scheduledTime.setDate(scheduledTime.getDate() + 1); }

        const delay = scheduledTime.getTime() - now.getTime();
        
        // Main Generation Timer
        schedulerTimer = setTimeout(async () => {
            await vscode.commands.executeCommand('standup.generate');
            if (new Date().getDay() === 5) { await vscode.commands.executeCommand('standup.generateWeeklyDigest'); }
            setupScheduler();
        }, delay);

        // Pre-standup Preview (2 minutes before)
        const previewDelay = delay - (2 * 60 * 1000);
        if (previewDelay > 0) {
            setTimeout(async () => {
                const choice = await vscode.window.showInformationMessage(
                    'Your standup is generating in 2 minutes. Review data?',
                    'View Raw', 'Dismiss'
                );
                if (choice === 'View Raw') { await vscode.commands.executeCommand('standup.previewData'); }
            }, previewDelay);
        }

        // Idle Reminder (at 2 PM if no activity)
        const twoPM = new Date();
        twoPM.setHours(14, 0, 0, 0);
        if (twoPM > now && twoPM < scheduledTime) {
            const idleDelay = twoPM.getTime() - now.getTime();
            setTimeout(async () => {
                if (activityTracker.getFileCount() === 0 && !context.globalState.get('standup.paused')) {
                    vscode.window.showWarningMessage('No activity tracked today. Did you forget to open VS Code?');
                }
            }, idleDelay);
        }
    }

    setupScheduler();

    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('standup.triggerTime')) { setupScheduler(); }
    }));

    // Other Disposables
    let setKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', async () => {
        await setApiKeyCommand(context);
    });

    // Export Commands
    context.subscriptions.push(vscode.commands.registerCommand('standup.copyForTeams', async (text: string) => {
        await vscode.env.clipboard.writeText(exporterService.formatForTeams(text));
        vscode.window.showInformationMessage('Standup copied for Microsoft Teams!');
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.sendEmail', async (text: string) => {
        await exporterService.exportToEmail(text);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.setNotionToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter your Notion Token', password: true });
        if (token) { await context.secrets.store('standup.notionToken', token); }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.setJiraToken', async () => {
        const token = await vscode.window.showInputBox({ prompt: 'Enter your Jira API Token', password: true });
        if (token) { await context.secrets.store('standup.jiraToken', token); }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.exportToNotion', async () => {
        const token = await context.secrets.get('standup.notionToken');
        const pageId = vscode.workspace.getConfiguration('standup').get<string>('notionPageId');
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (!token || !pageId || !lastMarkdown) { vscode.window.showErrorMessage('Token, Page ID or Standup missing.'); return; }
        const msg = await exporterService.exportToNotion(lastMarkdown, { token, pageId });
        vscode.window.showInformationMessage(msg);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.exportToJira', async () => {
        const token = await context.secrets.get('standup.jiraToken');
        const config = vscode.workspace.getConfiguration('standup');
        const domain = config.get<string>('jiraDomain');
        const email = config.get<string>('jiraEmail');
        const issueKey = config.get<string>('jiraIssueKey') || await vscode.window.showInputBox({ prompt: 'Jira Issue Key' });
        const lastMarkdown = context.globalState.get<string>('standup.lastGenerated');
        if (!token || !domain || !email || !issueKey || !lastMarkdown) { vscode.window.showErrorMessage('Jira config or Standup missing.'); return; }
        const msg = await exporterService.exportToJira(lastMarkdown, { domain, email, token, issueKey });
        vscode.window.showInformationMessage(msg);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.viewHistory', () => {
        HistoryPanel.createOrShow(context.extensionUri, context);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.toggleTracking', async () => {
        const isPaused = context.globalState.get<boolean>('standup.paused', false);
        await context.globalState.update('standup.paused', !isPaused);
        updateStatusBar();
        vscode.window.showInformationMessage(`Standup tracking ${!isPaused ? 'paused' : 'resumed'}.`);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('standup.previewData', async () => {
        const data = {
            topFiles: activityTracker.getTopFiles(10),
            commits: await gitTracker.getRecentCommits(24),
            commands: await terminalTracker.getTerminalHistory(20)
        };
        DataAuditPanel.createOrShow(context.extensionUri, data, () => {
            vscode.commands.executeCommand('standup.generate');
        });
    }));

    context.subscriptions.push(generateDisposable, setKeyDisposable);
}

export function deactivate() {}
