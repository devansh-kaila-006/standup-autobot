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
import * as https from 'https';
import { Logger } from '../utils/Logger';
import { Icons } from '../utils/iconUtils';

const logger = new Logger('TeamsService');

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

export class TeamsService {
    private config: TeamsConfig | null = null;
    private accessToken: string | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Teams configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            webhookUrl: config.get<string>('teamsWebhookUrl', ''),
            tenantId: config.get<string>('teamsTenantId', ''),
            clientId: config.get<string>('teamsClientId', ''),
            clientSecret: '', // Loaded from secrets
        };

        this.loadSecrets();
    }

    /**
     * Load secrets from storage
     */
    private async loadSecrets(): Promise<void> {
        try {
            this.config!.clientSecret = await this.context.secrets.get('standup.teamsClientSecret') || '';
        } catch (error) {
            logger.error('Failed to load Teams client secret', error);
        }
    }

    /**
     * Post message to Teams channel
     */
    public async postMessage(webhookUrl: string, message: TeamsMessage): Promise<boolean> {
        try {
            const urlObj = new URL(webhookUrl);

            return new Promise((resolve, reject) => {
                const payload = JSON.stringify({
                    type: 'message',
                    attachments: [
                        {
                            contentType: 'application/vnd.microsoft.card.attach',
                            contentUrl: null,
                            content: {
                                $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
                                type: 'AdaptiveCard',
                                ...this.convertToAdaptiveCard(message),
                            },
                        },
                    ],
                });

                const options = {
                    hostname: urlObj.hostname,
                    port: 443,
                    path: urlObj.pathname,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        resolve(res.statusCode === 200);
                    });
                });

                req.on('error', reject);
                req.write(payload);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to post Teams message', error);
            return false;
        }
    }

    /**
     * Convert TeamsMessage to Adaptive Card format
     */
    private convertToAdaptiveCard(message: TeamsMessage): any {
        const body: any[] = [];

        if (message.title) {
            body.push({
                type: 'TextBlock',
                text: message.title,
                weight: 'bolder',
                size: 'large',
            });
        }

        if (message.text) {
            body.push({
                type: 'TextBlock',
                text: message.text,
                wrap: true,
            });
        }

        if (message.sections) {
            for (const section of message.sections) {
                if (section.activity) {
                    body.push({
                        type: 'Container',
                        items: [
                            {
                                type: 'ColumnSet',
                                columns: [
                                    {
                                        type: 'Column',
                                        width: 'auto',
                                        items: [
                                            {
                                                type: 'Image',
                                                url: section.activity.image || 'https://adaptivecards.io/content/cats/1.png',
                                                size: 'small',
                                            },
                                        ],
                                    },
                                    {
                                        type: 'Column',
                                        width: 'stretch',
                                        items: [
                                            {
                                                type: 'TextBlock',
                                                text: section.activity.title,
                                                weight: 'bolder',
                                            },
                                            {
                                                type: 'TextBlock',
                                                text: section.activity.subtitle || '',
                                                isSubtle: true,
                                                spacing: 'none',
                                            },
                                        ],
                                    },
                                ],
                            },
                        ],
                    });
                }

                if (section.title) {
                    body.push({
                        type: 'TextBlock',
                        text: section.title,
                        weight: 'bolder',
                        spacing: 'medium',
                    });
                }

                if (section.text) {
                    body.push({
                        type: 'TextBlock',
                        text: section.text,
                        wrap: true,
                    });
                }

                if (section.facts && section.facts.length > 0) {
                    const facts = section.facts.map(fact => ({
                        title: fact.title,
                        value: fact.value,
                    }));

                    body.push({
                        type: 'FactSet',
                        facts,
                    });
                }

                if (section.images && section.images.length > 0) {
                    body.push({
                        type: 'Image',
                        url: section.images[0].image,
                        altText: section.images[0].title,
                    });
                }
            }
        }

        const card: any = {
            body,
        };

        if (message.potentialAction && message.potentialAction.length > 0) {
            card.actions = message.potentialAction.map(action => ({
                type: 'Action.OpenUrl',
                title: action.name,
                url: action.target ? action.target[0] : '',
            }));
        }

        return card;
    }

    /**
     * Post standup update to Teams
     */
    public async postStandup(
        webhookUrl: string,
        standupData: {
            today: string[];
            yesterday: string[];
            blockers: string[];
            goals?: string[];
        }
    ): Promise<boolean> {
        const sections: TeamsSection[] = [
            {
                title: '📋 Daily Standup Update',
                text: `**Date:** ${new Date().toLocaleDateString()}`,
            },
            {
                title: 'Completed Yesterday',
                facts: standupData.yesterday.map(item => ({
                    title: '•',
                    value: item,
                })),
            },
            {
                title: 'Working on Today',
                facts: standupData.today.map(item => ({
                    title: '•',
                    value: item,
                })),
            },
        ];

        // Add blockers if any
        if (standupData.blockers.length > 0) {
            sections.push({
                title: '🚫 Blockers',
                facts: standupData.blockers.map(blocker => ({
                    title: '•',
                    value: blocker,
                })),
            });
        }

        // Add goals if any
        if (standupData.goals && standupData.goals.length > 0) {
            sections.push({
                title: 'Goals',
                facts: standupData.goals.map(goal => ({
                    title: '•',
                    value: goal,
                })),
            });
        }

        const message: TeamsMessage = {
            title: 'Standup Update',
            summary: 'Daily standup update',
            sections,
            themeColor: '0078D4',
        };

        return await this.postMessage(webhookUrl, message);
    }

    /**
     * Post simple message to Teams
     */
    public async postSimpleMessage(webhookUrl: string, text: string, title?: string): Promise<boolean> {
        const message: TeamsMessage = {
            title,
            text,
            summary: title || text,
        };

        return await this.postMessage(webhookUrl, message);
    }

    /**
     * Get access token for Microsoft Graph API
     */
    private async getAccessToken(): Promise<string | null> {
        if (!this.config || !this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
            logger.warn('Teams not configured for Graph API');
            return null;
        }

        try {
            const url = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;

            return new Promise((resolve, reject) => {
                const params = new URLSearchParams();
                params.append('grant_type', 'client_credentials');
                params.append('client_id', this.config!.clientId);
                params.append('client_secret', this.config!.clientSecret);
                params.append('scope', 'https://graph.microsoft.com/.default');

                const options = {
                    hostname: 'login.microsoftonline.com',
                    port: 443,
                    path: `/${this.config!.tenantId}/oauth2/v2.0/token`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            if (response.access_token) {
                                this.accessToken = response.access_token;
                                resolve(response.access_token);
                            } else {
                                reject(new Error('No access token in response'));
                            }
                        } catch {
                            reject(new Error('Failed to parse token response'));
                        }
                    });
                });

                req.on('error', reject);
                req.write(params.toString());
                req.end();
            });
        } catch (error) {
            logger.error('Failed to get Teams access token', error);
            return null;
        }
    }

    /**
     * Get channel list using Microsoft Graph API
     */
    public async getChannels(teamId: string): Promise<TeamsChannel[]> {
        const token = await this.getAccessToken();
        if (!token) return [];

        try {
            const url = `https://graph.microsoft.com/v1.0/teams/${teamId}/channels`;

            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'graph.microsoft.com',
                    port: 443,
                    path: `/v1.0/teams/${teamId}/channels`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            if (response.value) {
                                resolve(
                                    response.value.map((ch: any) => ({
                                        id: ch.id,
                                        displayName: ch.displayName,
                                        description: ch.description,
                                        email: ch.email,
                                        webUrl: ch.webUrl,
                                    }))
                                );
                            } else {
                                resolve([]);
                            }
                        } catch {
                            resolve([]);
                        }
                    });
                });

                req.on('error', reject);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to get Teams channels', error);
            return [];
        }
    }

    /**
     * Get user info using Microsoft Graph API
     */
    public async getUser(userId: string): Promise<TeamsUser | null> {
        const token = await this.getAccessToken();
        if (!token) return null;

        try {
            const url = `https://graph.microsoft.com/v1.0/users/${userId}`;

            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'graph.microsoft.com',
                    port: 443,
                    path: `/v1.0/users/${userId}`,
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const user = JSON.parse(data);
                            resolve({
                                id: user.id,
                                displayName: user.displayName,
                                givenName: user.givenName,
                                surname: user.surname,
                                email: user.mail,
                                userPrincipalName: user.userPrincipalName,
                            });
                        } catch {
                            resolve(null);
                        }
                    });
                });

                req.on('error', reject);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to get Teams user', error);
            return null;
        }
    }

    /**
     * Send message using Microsoft Graph API
     */
    public async sendMessageGraph(channelId: string, message: TeamsMessage): Promise<boolean> {
        const token = await this.getAccessToken();
        if (!token) return false;

        try {
            const url = `https://graph.microsoft.com/v1.0/channels/${channelId}/messages`;

            return new Promise((resolve, reject) => {
                const payload = JSON.stringify({
                    body: {
                        contentType: 'html',
                        content: message.text || '',
                    },
                });

                const options = {
                    hostname: 'graph.microsoft.com',
                    port: 443,
                    path: `/v1.0/channels/${channelId}/messages`,
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                };

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        resolve(res.statusCode === 201);
                    });
                });

                req.on('error', reject);
                req.write(payload);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to send Teams message via Graph API', error);
            return false;
        }
    }

    /**
     * Test Teams connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.webhookUrl) {
            throw new Error('Teams not configured. Please set webhook URL.');
        }

        try {
            const message: TeamsMessage = {
                title: 'Connection Test',
                text: 'Standup Autobot successfully connected to Teams!',
                summary: 'Connection test',
            };

            return await this.postMessage(this.config.webhookUrl, message);
        } catch (error) {
            logger.error('Teams connection test failed', error);
            return false;
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
