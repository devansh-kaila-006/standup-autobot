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
import * as https from 'https';
import { Logger } from '../utils/Logger';

const logger = new Logger('SlackService');

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
    elements?: SlackAccessory[];
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

export class SlackService {
    private config: SlackConfig | null = null;

    constructor(private context: vscode.ExtensionContext) {
        this.loadConfig();
    }

    /**
     * Load Slack configuration
     */
    private loadConfig(): void {
        const config = vscode.workspace.getConfiguration('standup');

        this.config = {
            botToken: '', // Loaded from secrets
            signingSecret: '', // Loaded from secrets
            webhookUrl: config.get<string>('slackWebhookUrl', ''),
            appLevelToken: '', // Loaded from secrets
        };

        this.loadTokens();
    }

    /**
     * Load tokens from secrets
     */
    private async loadTokens(): Promise<void> {
        try {
            this.config!.botToken = await this.context.secrets.get('standup.slackBotToken') || '';
            this.config!.signingSecret = await this.context.secrets.get('standup.slackSigningSecret') || '';
            this.config!.appLevelToken = await this.context.secrets.get('standup.slackAppLevelToken') || '';
        } catch (error) {
            logger.error('Failed to load Slack tokens', error);
        }
    }

    /**
     * Post message to Slack channel
     */
    public async postMessage(message: SlackMessage): Promise<string | null> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return null;
        }

        try {
            const url = 'https://slack.com/api/chat.postMessage';
            const response = await this.makeSlackRequest(url, 'POST', message);

            if (response.ok) {
                return response.ts;
            } else {
                logger.error('Slack API error', response.error);
                return null;
            }
        } catch (error) {
            logger.error('Failed to post Slack message', error);
            return null;
        }
    }

    /**
     * Post standup update to Slack
     */
    public async postStandup(
        channel: string,
        standupData: {
            today: string[];
            yesterday: string[];
            blockers: string[];
            goals?: string[];
        },
        threadTs?: string
    ): Promise<string | null> {
        const blocks: SlackBlock[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: '📋 Daily Standup Update',
                    emoji: true,
                },
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: `*Date:* ${new Date().toLocaleDateString()}`,
                },
            },
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*✅ Completed Yesterday*',
                },
            },
        ];

        // Add yesterday's items
        if (standupData.yesterday.length > 0) {
            blocks.push({
                type: 'section',
                fields: standupData.yesterday.map(item => ({
                    type: 'mrkdwn',
                    text: `• ${item}`,
                })),
            });
        } else {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '_No items completed_',
                },
            });
        }

        blocks.push(
            {
                type: 'divider',
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*🎯 Working on Today*',
                },
            }
        );

        // Add today's items
        if (standupData.today.length > 0) {
            blocks.push({
                type: 'section',
                fields: standupData.today.map(item => ({
                    type: 'mrkdwn',
                    text: `• ${item}`,
                })),
            });
        } else {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '_No items planned_',
                },
            });
        }

        // Add blockers if any
        if (standupData.blockers.length > 0) {
            blocks.push(
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*🚫 Blockers*',
                    },
                }
            );

            blocks.push({
                type: 'section',
                fields: standupData.blockers.map(blocker => ({
                    type: 'mrkdwn',
                    text: `• ${blocker}`,
                })),
            });
        }

        // Add goals if any
        if (standupData.goals && standupData.goals.length > 0) {
            blocks.push(
                {
                    type: 'divider',
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: '*🎯 Goals*',
                    },
                }
            );

            blocks.push({
                type: 'section',
                fields: standupData.goals.map(goal => ({
                    type: 'mrkdwn',
                    text: `• ${goal}`,
                })),
            });
        }

        // Add action buttons
        blocks.push(
            {
                type: 'divider',
            },
            {
                type: 'actions',
                elements: [
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '👍 Thumbs Up',
                            emoji: true,
                        },
                        value: 'thumbs_up',
                        action_id: 'standup_thumbs_up',
                    },
                    {
                        type: 'button',
                        text: {
                            type: 'plain_text',
                            text: '💬 Comment',
                            emoji: true,
                        },
                        value: 'comment',
                        action_id: 'standup_comment',
                    },
                ],
            }
        );

        const message: SlackMessage = {
            channel,
            blocks,
            threadTs,
            username: 'Standup Autobot',
            iconEmoji: ':robot_face:',
        };

        return await this.postMessage(message);
    }

    /**
     * Post simple message using webhook
     */
    public async postWebhook(text: string, blocks?: SlackBlock[]): Promise<boolean> {
        if (!this.config || !this.config.webhookUrl) {
            logger.warn('Slack webhook URL not configured');
            return false;
        }

        try {
            const urlObj = new URL(this.config.webhookUrl);

            return new Promise((resolve, reject) => {
                const payload = JSON.stringify({ text, blocks });

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
            logger.error('Failed to post to Slack webhook', error);
            return false;
        }
    }

    /**
     * Get channel list
     */
    public async getChannels(): Promise<SlackChannel[]> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return [];
        }

        try {
            const url = 'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100';
            const response = await this.makeSlackRequest(url, 'GET');

            if (response.ok) {
                return response.channels.map((ch: any) => ({
                    id: ch.id,
                    name: ch.name,
                    isChannel: ch.is_channel,
                    isPrivate: ch.is_private,
                    isMember: ch.is_member,
                    topic: ch.topic,
                }));
            }

            return [];
        } catch (error) {
            logger.error('Failed to get Slack channels', error);
            return [];
        }
    }

    /**
     * Get user info
     */
    public async getUser(userId: string): Promise<SlackUser | null> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return null;
        }

        try {
            const url = `https://slack.com/api/users.info?user=${userId}`;
            const response = await this.makeSlackRequest(url, 'GET');

            if (response.ok) {
                const user = response.user;
                return {
                    id: user.id,
                    name: user.name,
                    displayName: user.profile.display_name,
                    realName: user.profile.real_name,
                    email: user.profile.email,
                    tz: user.tz,
                };
            }

            return null;
        } catch (error) {
            logger.error('Failed to get Slack user', error);
            return null;
        }
    }

    /**
     * Upload file to Slack
     */
    public async uploadFile(
        channel: string,
        fileContent: string,
        filename: string,
        filetype: string
    ): Promise<boolean> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return false;
        }

        try {
            const url = 'https://slack.com/api/files.upload';
            const boundary = '----SlackFileBoundary' + Date.now();

            return new Promise((resolve, reject) => {
                const options = {
                    hostname: 'slack.com',
                    port: 443,
                    path: '/api/files.upload',
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.config!.botToken}`,
                        'Content-Type': `multipart/form-data; boundary=${boundary}`,
                    },
                };

                let payload = '';

                payload += `--${boundary}\r\n`;
                payload += 'Content-Disposition: form-data; name="channels"\r\n\r\n';
                payload += `${channel}\r\n`;

                payload += `--${boundary}\r\n`;
                payload += `Content-Disposition: form-data; name="filename"\r\n\r\n`;
                payload += `${filename}\r\n`;

                payload += `--${boundary}\r\n`;
                payload += `Content-Disposition: form-data; name="filetype"\r\n\r\n`;
                payload += `${filetype}\r\n`;

                payload += `--${boundary}\r\n`;
                payload += 'Content-Disposition: form-data; name="file"; filename="file"\r\n';
                payload += 'Content-Type: text/plain\r\n\r\n';
                payload += `${fileContent}\r\n`;

                payload += `--${boundary}--\r\n`;

                const req = https.request(options, (res) => {
                    let data = '';

                    res.on('data', (chunk) => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            resolve(response.ok);
                        } catch {
                            resolve(false);
                        }
                    });
                });

                req.on('error', reject);
                req.write(payload);
                req.end();
            });
        } catch (error) {
            logger.error('Failed to upload file to Slack', error);
            return false;
        }
    }

    /**
     * Update existing message
     */
    public async updateMessage(
        channel: string,
        ts: string,
        message: SlackMessage
    ): Promise<boolean> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return false;
        }

        try {
            const url = 'https://slack.com/api/chat.update';
            const response = await this.makeSlackRequest(url, 'POST', {
                channel,
                ts,
                ...message,
            });

            return response.ok;
        } catch (error) {
            logger.error('Failed to update Slack message', error);
            return false;
        }
    }

    /**
     * Add reaction to message
     */
    public async addReaction(channel: string, ts: string, reaction: string): Promise<boolean> {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return false;
        }

        try {
            const url = 'https://slack.com/api/reactions.add';
            const response = await this.makeSlackRequest(url, 'POST', {
                channel,
                timestamp: ts,
                name: reaction,
            });

            return response.ok;
        } catch (error) {
            logger.error('Failed to add reaction', error);
            return false;
        }
    }

    /**
     * Make authenticated request to Slack API
     */
    private async makeSlackRequest(
        url: string,
        method: 'GET' | 'POST' | 'PUT' | 'DELETE',
        data?: any
    ): Promise<any> {
        if (!this.config || !this.config.botToken) {
            throw new Error('Slack not configured');
        }

        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);

            const options = {
                hostname: urlObj.hostname,
                port: 443,
                path: urlObj.pathname + urlObj.search,
                method: method,
                headers: {
                    'Authorization': `Bearer ${this.config.botToken}`,
                    'Content-Type': 'application/json',
                },
            };

            const req = https.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        resolve(JSON.parse(responseData));
                    } catch {
                        resolve(responseData);
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }

            req.end();
        });
    }

    /**
     * Test Slack connection
     */
    public async testConnection(): Promise<boolean> {
        if (!this.config || !this.config.botToken) {
            throw new Error('Slack not configured. Please set bot token.');
        }

        try {
            const url = 'https://slack.com/api/auth.test';
            const response = await this.makeSlackRequest(url, 'GET');
            return response.ok;
        } catch (error) {
            logger.error('Slack connection test failed', error);
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
