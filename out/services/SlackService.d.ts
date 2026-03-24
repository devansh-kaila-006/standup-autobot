/**
 * Slack Integration Service
 *
 * Provides Slack integration including:
 * - Post standup updates to channels
 * - Slash command support
 * - Interactive message buttons
 * - Channel and user management
 * - File uploads
 * - Threaded conversations
 */
import * as vscode from 'vscode';
export interface SlackConfig {
    botToken: string;
    signingSecret: string;
    webhookUrl: string;
    appLevelToken: string;
}
export interface SlackMessage {
    channel: string;
    text?: string;
    blocks?: SlackBlock[];
    attachments?: SlackAttachment[];
    threadTs?: string;
    username?: string;
    iconEmoji?: string;
    iconUrl?: string;
}
export interface SlackBlock {
    type: string;
    text?: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    fields?: SlackField[];
    accessory?: SlackAccessory;
}
export interface SlackField {
    type: string;
    text: string;
    emoji?: boolean;
}
export interface SlackAccessory {
    type: string;
    text?: {
        type: string;
        text: string;
        emoji?: boolean;
    };
    url?: string;
    value?: string;
    action_id?: string;
    style?: string;
}
export interface SlackAttachment {
    color?: string;
    text?: string;
    blocks?: SlackBlock[];
}
export interface SlackChannel {
    id: string;
    name: string;
    isChannel: boolean;
    isPrivate: boolean;
    isMember: boolean;
    topic?: {
        value: string;
    };
}
export interface SlackUser {
    id: string;
    name: string;
    displayName: string;
    realName: string;
    email: string;
    tz: string;
}
export declare class SlackService {
    private context;
    private config;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Slack configuration
     */
    private loadConfig;
    /**
     * Load tokens from secrets
     */
    private loadTokens;
    /**
     * Post message to Slack channel
     */
    postMessage(message: SlackMessage): Promise<string | null>;
    /**
     * Post standup update to Slack
     */
    postStandup(channel: string, standupData: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }, threadTs?: string): Promise<string | null>;
    /**
     * Post simple message using webhook
     */
    postWebhook(text: string, blocks?: SlackBlock[]): Promise<boolean>;
    /**
     * Get channel list
     */
    getChannels(): Promise<SlackChannel[]>;
    /**
     * Get user info
     */
    getUser(userId: string): Promise<SlackUser | null>;
    /**
     * Upload file to Slack
     */
    uploadFile(channel: string, fileContent: string, filename: string, filetype: string): Promise<boolean>;
    /**
     * Update existing message
     */
    updateMessage(channel: string, ts: string, message: SlackMessage): Promise<boolean>;
    /**
     * Add reaction to message
     */
    addReaction(channel: string, ts: string, reaction: string): Promise<boolean>;
    /**
     * Make authenticated request to Slack API
     */
    private makeSlackRequest;
    /**
     * Test Slack connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=SlackService.d.ts.map