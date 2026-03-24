"use strict";
/**
 * Smart Notifications Service
 *
 * Provides intelligent notification capabilities including:
 * - Contextual reminders
 * - Activity summaries
 * - Goal progress alerts
 * - Smart scheduling
 * - Notification preferences
 * - Do not disturb support
 */
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
exports.SmartNotificationsService = void 0;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('SmartNotificationsService');
class SmartNotificationsService {
    constructor(context) {
        this.context = context;
        this.rules = new Map();
        this.notifications = [];
        this.disposables = [];
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.loadRules();
        this.loadNotifications();
        this.registerCommands();
        this.updateStatusBar();
    }
    /**
     * Register notification commands
     */
    registerCommands() {
        // Show notifications panel
        const showNotificationsDisposable = vscode.commands.registerCommand('standup.showNotifications', () => this.showNotificationsPanel());
        this.disposables.push(showNotificationsDisposable);
        // Mark all as read
        const markReadDisposable = vscode.commands.registerCommand('standup.markNotificationsRead', () => this.markAllAsRead());
        this.disposables.push(markReadDisposable);
        // Configure notifications
        const configureDisposable = vscode.commands.registerCommand('standup.configureNotifications', () => this.configureNotifications());
        this.disposables.push(configureDisposable);
    }
    /**
     * Show notifications panel
     */
    async showNotificationsPanel() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        if (unreadCount === 0) {
            vscode.window.showInformationMessage('No new notifications');
            return;
        }
        const items = this.notifications
            .filter(n => !n.read)
            .map(notification => ({
            label: notification.title,
            detail: notification.message,
            notification,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: `You have ${unreadCount} unread notification(s)`,
        });
        if (selected) {
            selected.notification.read = true;
            await this.saveNotifications();
            this.updateStatusBar();
            // Show full message
            vscode.window.showInformationMessage(selected.notification.message, 'OK');
        }
    }
    /**
     * Configure notifications
     */
    async configureNotifications() {
        const actions = ['Add Rule', 'View Rules', 'Test Notification'];
        const selected = await vscode.window.showQuickPick(actions, {
            placeHolder: 'Select an action',
        });
        switch (selected) {
            case 'Add Rule':
                await this.addNotificationRule();
                break;
            case 'View Rules':
                await this.viewNotificationRules();
                break;
            case 'Test Notification':
                this.sendTestNotification();
                break;
        }
    }
    /**
     * Add a notification rule
     */
    async addNotificationRule() {
        const name = await vscode.window.showInputBox({
            placeHolder: 'Rule name',
            prompt: 'Enter a name for this notification rule',
        });
        if (!name) {
            return;
        }
        const types = [
            'standup.reminder',
            'activity.summary',
            'goal.progress',
            'blocker.alert',
            'productivity.insight',
        ];
        const type = await vscode.window.showQuickPick(types, {
            placeHolder: 'Select notification type',
        });
        if (!type) {
            return;
        }
        const frequencies = ['immediate', 'daily', 'weekly'];
        const frequency = await vscode.window.showQuickPick(frequencies, {
            placeHolder: 'Select frequency',
        });
        if (!frequency) {
            return;
        }
        const typedFrequency = frequency;
        const id = this.generateId();
        const rule = {
            id,
            name,
            preference: {
                enabled: true,
                type: type,
                schedule: {
                    frequency: typedFrequency,
                },
                channels: ['notification'],
            },
            triggerCount: 0,
        };
        this.rules.set(id, rule);
        await this.saveRule(rule);
        vscode.window.showInformationMessage(`Notification rule "${name}" created successfully`);
    }
    /**
     * View notification rules
     */
    async viewNotificationRules() {
        const rules = Array.from(this.rules.values());
        if (rules.length === 0) {
            vscode.window.showInformationMessage('No notification rules configured');
            return;
        }
        const items = rules.map(rule => ({
            label: rule.preference.enabled ? '$(bell) ' + rule.name : '$(circle-outline) ' + rule.name,
            description: `Type: ${rule.preference.type}, Frequency: ${rule.preference.schedule?.frequency}`,
            rule,
        }));
        const selected = await vscode.window.showQuickPick(items, {
            placeHolder: 'Select a rule to manage',
        });
        if (selected) {
            const actions = ['Toggle', 'Delete'];
            const action = await vscode.window.showQuickPick(actions, {
                placeHolder: 'Select an action',
            });
            if (action === 'Toggle') {
                await this.toggleRule(selected.rule.id);
            }
            else if (action === 'Delete') {
                await this.deleteRule(selected.rule.id);
            }
        }
    }
    /**
     * Toggle rule enabled state
     */
    async toggleRule(id) {
        const rule = this.rules.get(id);
        if (!rule) {
            return;
        }
        rule.preference.enabled = !rule.preference.enabled;
        await this.saveRule(rule);
    }
    /**
     * Delete a rule
     */
    async deleteRule(id) {
        this.rules.delete(id);
        await this.context.globalState.update(`notification.rule.${id}`, undefined);
    }
    /**
     * Send a notification
     */
    async sendNotification(type, title, message, data) {
        const notification = {
            id: this.generateId(),
            type,
            title,
            message,
            priority: this.getNotificationPriority(type),
            timestamp: Date.now(),
            data,
            read: false,
        };
        this.notifications.unshift(notification);
        await this.saveNotifications();
        this.updateStatusBar();
        // Send to enabled channels
        const rules = Array.from(this.rules.values()).filter(r => r.preference.enabled && r.preference.type === type);
        for (const rule of rules) {
            for (const channel of rule.preference.channels) {
                await this.sendToChannel(channel, notification);
            }
            rule.lastTriggered = Date.now();
            rule.triggerCount++;
            await this.saveRule(rule);
        }
    }
    /**
     * Get notification priority based on type
     */
    getNotificationPriority(type) {
        if (type === 'blocker.alert') {
            return 'high';
        }
        else if (type === 'standup.reminder' || type === 'goal.progress') {
            return 'medium';
        }
        return 'low';
    }
    /**
     * Send notification to specific channel
     */
    async sendToChannel(channel, notification) {
        switch (channel) {
            case 'notification':
                vscode.window.showInformationMessage(notification.message);
                break;
            case 'statusbar':
                this.updateStatusBar();
                break;
            case 'sound':
                // Play notification sound
                break;
            case 'slack':
                // Send to Slack integration
                break;
            case 'teams':
                // Send to Teams integration
                break;
        }
    }
    /**
     * Update status bar
     */
    updateStatusBar() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        if (unreadCount > 0) {
            this.statusBarItem.text = `$(bell) ${unreadCount}`;
            this.statusBarItem.tooltip = 'You have unread notifications';
            this.statusBarItem.command = 'standup.showNotifications';
            this.statusBarItem.show();
        }
        else {
            this.statusBarItem.hide();
        }
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead() {
        for (const notification of this.notifications) {
            notification.read = true;
        }
        await this.saveNotifications();
        this.updateStatusBar();
    }
    /**
     * Get unread notifications
     */
    getUnreadNotifications() {
        return this.notifications.filter(n => !n.read);
    }
    /**
     * Get all notifications
     */
    getAllNotifications() {
        return [...this.notifications];
    }
    /**
     * Clear old notifications
     */
    async clearOldNotifications(olderThanDays = 30) {
        const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        this.notifications = this.notifications.filter(n => n.timestamp > cutoff);
        await this.saveNotifications();
        this.updateStatusBar();
    }
    /**
     * Send contextual reminders based on time and activity
     */
    async sendContextualReminder(context) {
        let message = '';
        if (context.timeOfDay === 'morning' && context.dayOfWeek === 'Monday') {
            message = 'Good morning! Time to plan your weekly goals and priorities.';
        }
        else if (context.timeOfDay === 'morning') {
            message = 'Good morning! Ready to start your day? Consider setting your top 3 priorities.';
        }
        else if (context.timeOfDay === 'afternoon' && !context.recentActivity) {
            message = 'Afternoon check-in: How\'s your progress going? Consider taking a short break.';
        }
        else if (context.timeOfDay === 'evening') {
            message = 'End of day reminder: Document your progress and prepare for tomorrow.';
        }
        if (context.pendingBlockers > 0) {
            message += ` You have ${context.pendingBlockers} blocker(s) that need attention.`;
        }
        if (message) {
            await this.sendNotification('standup.reminder', 'Reminder', message);
        }
    }
    /**
     * Send activity summary
     */
    async sendActivitySummary(summary) {
        const message = `You tracked ${summary.totalActivities} activities today. Great progress!`;
        await this.sendNotification('activity.summary', 'Activity Summary', message, summary);
    }
    /**
     * Send goal progress alert
     */
    async sendGoalProgress(progress) {
        const message = `Goal "${progress.goal}": ${progress.completed}/${progress.total} tasks completed (${progress.percentage}%)`;
        await this.sendNotification('goal.progress', 'Goal Progress', message, progress);
    }
    /**
     * Send blocker alert
     */
    async sendBlockerAlert(blocker) {
        const message = `Blocker detected: ${blocker.description} (${blocker.duration}h)`;
        await this.sendNotification('blocker.alert', 'Blocker Alert', message, blocker);
    }
    /**
     * Send productivity insight
     */
    async sendProductivityInsight(insight) {
        const message = `${insight.summary}\n\nRecommendations:\n${insight.recommendations.map(r => `• ${r}`).join('\n')}`;
        await this.sendNotification('productivity.insight', 'Productivity Insight', message, insight);
    }
    /**
     * Send test notification
     */
    sendTestNotification() {
        vscode.window.showInformationMessage('Test notification from Standup Autobot!');
    }
    /**
     * Load rules from storage
     */
    async loadRules() {
        const keys = this.context.globalState.keys();
        const ruleKeys = keys.filter(key => key.startsWith('notification.rule.'));
        for (const key of ruleKeys) {
            const rule = await this.context.globalState.get(key);
            if (rule) {
                this.rules.set(rule.id, rule);
            }
        }
    }
    /**
     * Save a rule to storage
     */
    async saveRule(rule) {
        await this.context.globalState.update(`notification.rule.${rule.id}`, rule);
    }
    /**
     * Load notifications from storage
     */
    async loadNotifications() {
        const stored = await this.context.globalState.get('notifications', []);
        this.notifications = stored;
    }
    /**
     * Save notifications to storage
     */
    async saveNotifications() {
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }
        await this.context.globalState.update('notifications', this.notifications);
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get notification statistics
     */
    getStatistics() {
        const rules = Array.from(this.rules.values());
        const enabledRules = rules.filter(r => r.preference.enabled);
        const unreadNotifications = this.notifications.filter(n => !n.read);
        const notificationsByType = {};
        for (const notification of this.notifications) {
            notificationsByType[notification.type] = (notificationsByType[notification.type] || 0) + 1;
        }
        return {
            totalRules: rules.length,
            enabledRules: enabledRules.length,
            totalNotifications: this.notifications.length,
            unreadNotifications: unreadNotifications.length,
            notificationsByType,
        };
    }
    /**
     * Dispose of resources
     */
    dispose() {
        this.statusBarItem.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
exports.SmartNotificationsService = SmartNotificationsService;
//# sourceMappingURL=SmartNotificationsService.js.map