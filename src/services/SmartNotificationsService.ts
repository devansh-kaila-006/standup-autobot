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

import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

const logger = new Logger('SmartNotificationsService');

export interface NotificationPreference {
    enabled: boolean;
    type: NotificationType;
    schedule?: NotificationSchedule;
    conditions?: NotificationCondition[];
    channels: NotificationChannel[];
}

export interface NotificationSchedule {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    time?: string; // HH:MM format
    days?: number[]; // 0-6 (Sunday-Saturday)
    timezone?: string;
}

export interface NotificationCondition {
    type: 'time' | 'activity' | 'project' | 'integration';
    operator?: '>' | '<' | '=' | '!=' | 'contains';
    value?: any;
}

export type NotificationType =
    | 'standup.reminder'
    | 'activity.summary'
    | 'goal.progress'
    | 'blocker.alert'
    | 'productivity.insight'
    | 'integration.update'
    | 'milestone.achievement';

export type NotificationChannel = 'notification' | 'statusbar' | 'sound' | 'slack' | 'teams';

export interface NotificationMessage {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    timestamp: number;
    data?: any;
    read: boolean;
}

export interface NotificationRule {
    id: string;
    name: string;
    preference: NotificationPreference;
    lastTriggered?: number;
    triggerCount: number;
}

export class SmartNotificationsService {
    private rules: Map<string, NotificationRule> = new Map();
    private notifications: NotificationMessage[] = [];
    private statusBarItem: vscode.StatusBarItem;
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);

        this.loadRules();
        this.loadNotifications();
        this.registerCommands();
        this.updateStatusBar();
    }

    /**
     * Register notification commands
     */
    private registerCommands(): void {
        // Show notifications panel
        const showNotificationsDisposable = vscode.commands.registerCommand(
            'standup.showNotifications',
            () => this.showNotificationsPanel()
        );
        this.disposables.push(showNotificationsDisposable);

        // Mark all as read
        const markReadDisposable = vscode.commands.registerCommand(
            'standup.markNotificationsRead',
            () => this.markAllAsRead()
        );
        this.disposables.push(markReadDisposable);

        // Configure notifications
        const configureDisposable = vscode.commands.registerCommand(
            'standup.configureNotifications',
            () => this.configureNotifications()
        );
        this.disposables.push(configureDisposable);
    }

    /**
     * Show notifications panel
     */
    private async showNotificationsPanel(): Promise<void> {
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
    private async configureNotifications(): Promise<void> {
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
    private async addNotificationRule(): Promise<void> {
        const name = await vscode.window.showInputBox({
            placeHolder: 'Rule name',
            prompt: 'Enter a name for this notification rule',
        });

        if (!name) {
            return;
        }

        const types: NotificationType[] = [
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

        const typedFrequency = frequency as 'immediate' | 'daily' | 'weekly';

        const id = this.generateId();
        const rule: NotificationRule = {
            id,
            name,
            preference: {
                enabled: true,
                type: type as NotificationType,
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
    private async viewNotificationRules(): Promise<void> {
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
            } else if (action === 'Delete') {
                await this.deleteRule(selected.rule.id);
            }
        }
    }

    /**
     * Toggle rule enabled state
     */
    private async toggleRule(id: string): Promise<void> {
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
    private async deleteRule(id: string): Promise<void> {
        this.rules.delete(id);
        await this.context.globalState.update(`notification.rule.${id}`, undefined);
    }

    /**
     * Send a notification
     */
    public async sendNotification(type: NotificationType, title: string, message: string, data?: any): Promise<void> {
        const notification: NotificationMessage = {
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
    private getNotificationPriority(type: NotificationType): 'low' | 'medium' | 'high' {
        if (type === 'blocker.alert') {
            return 'high';
        } else if (type === 'standup.reminder' || type === 'goal.progress') {
            return 'medium';
        }
        return 'low';
    }

    /**
     * Send notification to specific channel
     */
    private async sendToChannel(channel: NotificationChannel, notification: NotificationMessage): Promise<void> {
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
    private updateStatusBar(): void {
        const unreadCount = this.notifications.filter(n => !n.read).length;

        if (unreadCount > 0) {
            this.statusBarItem.text = `$(bell) ${unreadCount}`;
            this.statusBarItem.tooltip = 'You have unread notifications';
            this.statusBarItem.command = 'standup.showNotifications';
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    /**
     * Mark all notifications as read
     */
    private async markAllAsRead(): Promise<void> {
        for (const notification of this.notifications) {
            notification.read = true;
        }

        await this.saveNotifications();
        this.updateStatusBar();
    }

    /**
     * Get unread notifications
     */
    public getUnreadNotifications(): NotificationMessage[] {
        return this.notifications.filter(n => !n.read);
    }

    /**
     * Get all notifications
     */
    public getAllNotifications(): NotificationMessage[] {
        return [...this.notifications];
    }

    /**
     * Clear old notifications
     */
    public async clearOldNotifications(olderThanDays: number = 30): Promise<void> {
        const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
        this.notifications = this.notifications.filter(n => n.timestamp > cutoff);
        await this.saveNotifications();
        this.updateStatusBar();
    }

    /**
     * Send contextual reminders based on time and activity
     */
    public async sendContextualReminder(context: {
        timeOfDay: 'morning' | 'afternoon' | 'evening';
        dayOfWeek: string;
        recentActivity: boolean;
        pendingBlockers: number;
    }): Promise<void> {
        let message = '';

        if (context.timeOfDay === 'morning' && context.dayOfWeek === 'Monday') {
            message = 'Good morning! Time to plan your weekly goals and priorities.';
        } else if (context.timeOfDay === 'morning') {
            message = 'Good morning! Ready to start your day? Consider setting your top 3 priorities.';
        } else if (context.timeOfDay === 'afternoon' && !context.recentActivity) {
            message = 'Afternoon check-in: How\'s your progress going? Consider taking a short break.';
        } else if (context.timeOfDay === 'evening') {
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
    public async sendActivitySummary(summary: {
        today: string[];
        yesterday: string[];
        totalActivities: number;
    }): Promise<void> {
        const message = `You tracked ${summary.totalActivities} activities today. Great progress!`;

        await this.sendNotification('activity.summary', 'Activity Summary', message, summary);
    }

    /**
     * Send goal progress alert
     */
    public async sendGoalProgress(progress: {
        goal: string;
        completed: number;
        total: number;
        percentage: number;
    }): Promise<void> {
        const message = `Goal "${progress.goal}": ${progress.completed}/${progress.total} tasks completed (${progress.percentage}%)`;

        await this.sendNotification('goal.progress', 'Goal Progress', message, progress);
    }

    /**
     * Send blocker alert
     */
    public async sendBlockerAlert(blocker: {
        description: string;
        duration: number;
        severity: 'low' | 'medium' | 'high';
    }): Promise<void> {
        const message = `Blocker detected: ${blocker.description} (${blocker.duration}h)`;

        await this.sendNotification('blocker.alert', 'Blocker Alert', message, blocker);
    }

    /**
     * Send productivity insight
     */
    public async sendProductivityInsight(insight: {
        summary: string;
        recommendations: string[];
    }): Promise<void> {
        const message = `${insight.summary}\n\nRecommendations:\n${insight.recommendations.map(r => `• ${r}`).join('\n')}`;

        await this.sendNotification('productivity.insight', 'Productivity Insight', message, insight);
    }

    /**
     * Send test notification
     */
    private sendTestNotification(): void {
        vscode.window.showInformationMessage('Test notification from Standup Autobot!');
    }

    /**
     * Load rules from storage
     */
    private async loadRules(): Promise<void> {
        const keys = this.context.globalState.keys();
        const ruleKeys = keys.filter(key => key.startsWith('notification.rule.'));

        for (const key of ruleKeys) {
            const rule = await this.context.globalState.get<NotificationRule>(key);
            if (rule) {
                this.rules.set(rule.id, rule);
            }
        }
    }

    /**
     * Save a rule to storage
     */
    private async saveRule(rule: NotificationRule): Promise<void> {
        await this.context.globalState.update(`notification.rule.${rule.id}`, rule);
    }

    /**
     * Load notifications from storage
     */
    private async loadNotifications(): Promise<void> {
        const stored = await this.context.globalState.get<NotificationMessage[]>('notifications', []);
        this.notifications = stored;
    }

    /**
     * Save notifications to storage
     */
    private async saveNotifications(): Promise<void> {
        // Keep only last 100 notifications
        if (this.notifications.length > 100) {
            this.notifications = this.notifications.slice(0, 100);
        }

        await this.context.globalState.update('notifications', this.notifications);
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get notification statistics
     */
    public getStatistics(): {
        totalRules: number;
        enabledRules: number;
        totalNotifications: number;
        unreadNotifications: number;
        notificationsByType: Record<string, number>;
    } {
        const rules = Array.from(this.rules.values());
        const enabledRules = rules.filter(r => r.preference.enabled);
        const unreadNotifications = this.notifications.filter(n => !n.read);

        const notificationsByType: Record<string, number> = {};
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
    public dispose(): void {
        this.statusBarItem.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
