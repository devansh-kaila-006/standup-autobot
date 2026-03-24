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
export interface NotificationPreference {
    enabled: boolean;
    type: NotificationType;
    schedule?: NotificationSchedule;
    conditions?: NotificationCondition[];
    channels: NotificationChannel[];
}
export interface NotificationSchedule {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    days?: number[];
    timezone?: string;
}
export interface NotificationCondition {
    type: 'time' | 'activity' | 'project' | 'integration';
    operator?: '>' | '<' | '=' | '!=' | 'contains';
    value?: any;
}
export type NotificationType = 'standup.reminder' | 'activity.summary' | 'goal.progress' | 'blocker.alert' | 'productivity.insight' | 'integration.update' | 'milestone.achievement';
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
export declare class SmartNotificationsService {
    private context;
    private rules;
    private notifications;
    private statusBarItem;
    private disposables;
    constructor(context: vscode.ExtensionContext);
    /**
     * Register notification commands
     */
    private registerCommands;
    /**
     * Show notifications panel
     */
    private showNotificationsPanel;
    /**
     * Configure notifications
     */
    private configureNotifications;
    /**
     * Add a notification rule
     */
    private addNotificationRule;
    /**
     * View notification rules
     */
    private viewNotificationRules;
    /**
     * Toggle rule enabled state
     */
    private toggleRule;
    /**
     * Delete a rule
     */
    private deleteRule;
    /**
     * Send a notification
     */
    sendNotification(type: NotificationType, title: string, message: string, data?: any): Promise<void>;
    /**
     * Get notification priority based on type
     */
    private getNotificationPriority;
    /**
     * Send notification to specific channel
     */
    private sendToChannel;
    /**
     * Update status bar
     */
    private updateStatusBar;
    /**
     * Mark all notifications as read
     */
    private markAllAsRead;
    /**
     * Get unread notifications
     */
    getUnreadNotifications(): NotificationMessage[];
    /**
     * Get all notifications
     */
    getAllNotifications(): NotificationMessage[];
    /**
     * Clear old notifications
     */
    clearOldNotifications(olderThanDays?: number): Promise<void>;
    /**
     * Send contextual reminders based on time and activity
     */
    sendContextualReminder(context: {
        timeOfDay: 'morning' | 'afternoon' | 'evening';
        dayOfWeek: string;
        recentActivity: boolean;
        pendingBlockers: number;
    }): Promise<void>;
    /**
     * Send activity summary
     */
    sendActivitySummary(summary: {
        today: string[];
        yesterday: string[];
        totalActivities: number;
    }): Promise<void>;
    /**
     * Send goal progress alert
     */
    sendGoalProgress(progress: {
        goal: string;
        completed: number;
        total: number;
        percentage: number;
    }): Promise<void>;
    /**
     * Send blocker alert
     */
    sendBlockerAlert(blocker: {
        description: string;
        duration: number;
        severity: 'low' | 'medium' | 'high';
    }): Promise<void>;
    /**
     * Send productivity insight
     */
    sendProductivityInsight(insight: {
        summary: string;
        recommendations: string[];
    }): Promise<void>;
    /**
     * Send test notification
     */
    private sendTestNotification;
    /**
     * Load rules from storage
     */
    private loadRules;
    /**
     * Save a rule to storage
     */
    private saveRule;
    /**
     * Load notifications from storage
     */
    private loadNotifications;
    /**
     * Save notifications to storage
     */
    private saveNotifications;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Get notification statistics
     */
    getStatistics(): {
        totalRules: number;
        enabledRules: number;
        totalNotifications: number;
        unreadNotifications: number;
        notificationsByType: Record<string, number>;
    };
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=SmartNotificationsService.d.ts.map