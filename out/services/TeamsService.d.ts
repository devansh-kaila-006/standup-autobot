/**
 * Microsoft Teams Integration Service
 *
 * Provides Teams integration including:
 * - Post standup updates to channels
 * - Adaptive Cards support
 * - Message formatting
 * - Channel and user management
 * - File attachments
 * - Threaded conversations
 */
import * as vscode from 'vscode';
export interface TeamsConfig {
    webhookUrl: string;
    tenantId: string;
    clientId: string;
    clientSecret: string;
}
export interface TeamsMessage {
    title?: string;
    text?: string;
    summary?: string;
    sections?: TeamsSection[];
    potentialAction?: TeamsAction[];
    themeColor?: string;
}
export interface TeamsSection {
    title?: string;
    text?: string;
    facts?: TeamsFact[];
    images?: TeamsImage[];
    activity?: TeamsActivity;
}
export interface TeamsFact {
    title: string;
    value: string;
}
export interface TeamsImage {
    image: string;
    title: string;
}
export interface TeamsActivity {
    title: string;
    subtitle?: string;
    text?: string;
    image?: string;
}
export interface TeamsAction {
    '@context': string;
    '@type': string;
    name: string;
    target?: string[];
}
export interface TeamsChannel {
    id: string;
    displayName: string;
    description?: string;
    email?: string;
    webUrl: string;
}
export interface TeamsUser {
    id: string;
    displayName: string;
    givenName?: string;
    surname?: string;
    email?: string;
    userPrincipalName: string;
}
export declare class TeamsService {
    private context;
    private config;
    private accessToken;
    constructor(context: vscode.ExtensionContext);
    /**
     * Load Teams configuration
     */
    private loadConfig;
    /**
     * Load secrets from storage
     */
    private loadSecrets;
    /**
     * Post message to Teams channel
     */
    postMessage(webhookUrl: string, message: TeamsMessage): Promise<boolean>;
    /**
     * Convert TeamsMessage to Adaptive Card format
     */
    private convertToAdaptiveCard;
    /**
     * Post standup update to Teams
     */
    postStandup(webhookUrl: string, standupData: {
        today: string[];
        yesterday: string[];
        blockers: string[];
        goals?: string[];
    }): Promise<boolean>;
    /**
     * Post simple message to Teams
     */
    postSimpleMessage(webhookUrl: string, text: string, title?: string): Promise<boolean>;
    /**
     * Get access token for Microsoft Graph API
     */
    private getAccessToken;
    /**
     * Get channel list using Microsoft Graph API
     */
    getChannels(teamId: string): Promise<TeamsChannel[]>;
    /**
     * Get user info using Microsoft Graph API
     */
    getUser(userId: string): Promise<TeamsUser | null>;
    /**
     * Send message using Microsoft Graph API
     */
    sendMessageGraph(channelId: string, message: TeamsMessage): Promise<boolean>;
    /**
     * Test Teams connection
     */
    testConnection(): Promise<boolean>;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=TeamsService.d.ts.map