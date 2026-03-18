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
function activate(context) {
    console.log('Standup Autobot is now active!');
    const storageKey = 'standup.activityLog';
    // Initialize trackers
    const activityTracker = new activityTracker_1.ActivityTracker(context);
    const gitTracker = new gitTracker_1.GitTracker();
    const terminalTracker = new terminalTracker_1.TerminalTracker();
    const standupGenerator = new standupGenerator_1.StandupGenerator();
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
        const durationHours = config.get('activityDuration') || 24;
        // Ensure API Key is present
        const apiKey = await (0, auth_1.ensureApiKey)(context);
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
            standupCard_1.StandupCardProvider.createOrShow(context.extensionUri, markdown);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Failed to generate standup: ${error.message}`);
        }
    });
    // 3. Scheduler for Trigger Time
    let schedulerTimer;
    function setupScheduler() {
        if (schedulerTimer) {
            clearTimeout(schedulerTimer);
        }
        const config = vscode.workspace.getConfiguration('standup');
        const triggerTime = config.get('triggerTime') || '09:00';
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
        await (0, auth_1.setApiKeyCommand)(context);
    });
    context.subscriptions.push(generateDisposable, setKeyDisposable);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map