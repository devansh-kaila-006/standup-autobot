import * as vscode from 'vscode';
import { ActivityTracker } from './trackers/activityTracker';
import { GitTracker } from './trackers/gitTracker';
import { TerminalTracker } from './trackers/terminalTracker';
import { StandupGenerator } from './services/standupGenerator';
import { StandupCardProvider } from './webviews/standupCard';
import { setApiKeyCommand, ensureApiKey } from './utils/auth';

export function activate(context: vscode.ExtensionContext) {
    console.log('Standup Autobot is now active!');

    const storageKey = 'standup.activityLog';

    // Initialize trackers
    const activityTracker = new ActivityTracker(context);
    const gitTracker = new GitTracker();
    const terminalTracker = new TerminalTracker();
    const standupGenerator = new StandupGenerator();

    context.subscriptions.push(activityTracker);

    // 1. Initialize a generic JSON object structure in globalState
    const existingData = context.globalState.get(storageKey);

    if (!existingData) {
        const initialStructure = {
            lastUpdated: null,
            dailyLogs: []
        };
        context.globalState.update(storageKey, initialStructure);
    }

    // 2. Register "standup.generate" command
    let generateDisposable = vscode.commands.registerCommand('standup.generate', async () => {
        const config = vscode.workspace.getConfiguration('standup');
        const durationHours = config.get<number>('activityDuration') || 24;

        // Ensure API Key is present
        const apiKey = await ensureApiKey(context);
        if (!apiKey) {
            return; // User cancelled or missing key
        }

        vscode.window.showInformationMessage(`Standup Autobot: Gathering data for last ${durationHours} hours...`);

        // Collect all data
        const topFiles = activityTracker.getTopFiles(5);
        const recentCommits = await gitTracker.getRecentCommits(durationHours);
        const terminalCommands = await terminalTracker.getTerminalHistory(10);

        const dailyData = {
            topFiles: topFiles,
            commits: recentCommits,
            commands: terminalCommands
        };

        console.log('Gathered Standup Data:', JSON.stringify(dailyData, null, 2));
        
        try {
            vscode.window.showInformationMessage('Standup Autobot: Generating summary using LLM...');
            const markdown = await standupGenerator.generateStandup(dailyData, apiKey, durationHours);
            
            console.log('Generated Standup Markdown:\n', markdown);
            
            // Show in Webview
            StandupCardProvider.createOrShow(context.extensionUri, markdown);
            
        } catch (error: any) {
            vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
        }
    });

    // 3. Scheduler for Trigger Time
    let schedulerTimer: NodeJS.Timeout | undefined;

    function setupScheduler() {
        if (schedulerTimer) {
            clearTimeout(schedulerTimer);
        }

        const config = vscode.workspace.getConfiguration('standup');
        const triggerTime = config.get<string>('triggerTime') || '09:00';
        
        const [hours, minutes] = triggerTime.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            console.error('Invalid trigger time format:', triggerTime);
            return;
        }

        const now = new Date();
        const scheduledTime = new Date();
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= now) {
            scheduledTime.setDate(scheduledTime.getDate() + 1);
        }

        const delay = scheduledTime.getTime() - now.getTime();
        console.log(`Standup Autobot: Scheduled next generation in ${Math.round(delay / 1000 / 60)} minutes at ${scheduledTime.toLocaleTimeString()}`);

        schedulerTimer = setTimeout(() => {
            vscode.commands.executeCommand('standup.generate');
            setupScheduler(); // Re-schedule for next day
        }, delay);
    }

    setupScheduler();

    // Re-schedule if settings change
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('standup.triggerTime')) {
            setupScheduler();
        }
    }));

    // 3. Register "standup.setApiKey" command
    let setKeyDisposable = vscode.commands.registerCommand('standup.setApiKey', async () => {
        await setApiKeyCommand(context);
    });

    context.subscriptions.push(generateDisposable, setKeyDisposable);
}

export function deactivate() {}
