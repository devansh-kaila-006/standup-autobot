"use strict";
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
exports.SlackService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('SlackService');
class SlackService {
    constructor(context) {
        this.context = context;
        this.config = null;
        this.loadConfig();
    }
    /**
     * Load Slack configuration
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('standup');
        this.config = {
            botToken: '', // Loaded from secrets
            signingSecret: '', // Loaded from secrets
            webhookUrl: config.get('slackWebhookUrl', ''),
            appLevelToken: '', // Loaded from secrets
        };
        this.loadTokens();
    }
    /**
     * Load tokens from secrets
     */
    async loadTokens() {
        try {
            this.config.botToken = await this.context.secrets.get('standup.slackBotToken') || '';
            this.config.signingSecret = await this.context.secrets.get('standup.slackSigningSecret') || '';
            this.config.appLevelToken = await this.context.secrets.get('standup.slackAppLevelToken') || '';
        }
        catch (error) {
            logger.error('Failed to load Slack tokens', error);
        }
    }
    /**
     * Post message to Slack channel
     */
    async postMessage(message) {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return null;
        }
        try {
            const url = 'https://slack.com/api/chat.postMessage';
            const response = await this.makeSlackRequest(url, 'POST', message);
            if (response.ok) {
                return response.ts;
            }
            else {
                logger.error('Slack API error', response.error);
                return null;
            }
        }
        catch (error) {
            logger.error('Failed to post Slack message', error);
            return null;
        }
    }
    /**
     * Post standup update to Slack
     */
    async postStandup(channel, standupData, threadTs) {
        const blocks = [
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
        }
        else {
            blocks.push({
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '_No items completed_',
                },
            });
        }
        blocks.push({
            type: 'divider',
        }, {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: '*🎯 Working on Today*',
            },
        });
        // Add today's items
        if (standupData.today.length > 0) {
            blocks.push({
                type: 'section',
                fields: standupData.today.map(item => ({
                    type: 'mrkdwn',
                    text: `• ${item}`,
                })),
            });
        }
        else {
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
            blocks.push({
                type: 'divider',
            }, {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*🚫 Blockers*',
                },
            });
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
            blocks.push({
                type: 'divider',
            }, {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: '*🎯 Goals*',
                },
            });
            blocks.push({
                type: 'section',
                fields: standupData.goals.map(goal => ({
                    type: 'mrkdwn',
                    text: `• ${goal}`,
                })),
            });
        }
        // Add action buttons
        blocks.push({
            type: 'divider',
        }, {
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
        });
        const message = {
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
    async postWebhook(text, blocks) {
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
        }
        catch (error) {
            logger.error('Failed to post to Slack webhook', error);
            return false;
        }
    }
    /**
     * Get channel list
     */
    async getChannels() {
        if (!this.config || !this.config.botToken) {
            logger.warn('Slack bot token not configured');
            return [];
        }
        try {
            const url = 'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100';
            const response = await this.makeSlackRequest(url, 'GET');
            if (response.ok) {
                return response.channels.map((ch) => ({
                    id: ch.id,
                    name: ch.name,
                    isChannel: ch.is_channel,
                    isPrivate: ch.is_private,
                    isMember: ch.is_member,
                    topic: ch.topic,
                }));
            }
            return [];
        }
        catch (error) {
            logger.error('Failed to get Slack channels', error);
            return [];
        }
    }
    /**
     * Get user info
     */
    async getUser(userId) {
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
        }
        catch (error) {
            logger.error('Failed to get Slack user', error);
            return null;
        }
    }
    /**
     * Upload file to Slack
     */
    async uploadFile(channel, fileContent, filename, filetype) {
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
                        'Authorization': `Bearer ${this.config.botToken}`,
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
                        }
                        catch {
                            resolve(false);
                        }
                    });
                });
                req.on('error', reject);
                req.write(payload);
                req.end();
            });
        }
        catch (error) {
            logger.error('Failed to upload file to Slack', error);
            return false;
        }
    }
    /**
     * Update existing message
     */
    async updateMessage(channel, ts, message) {
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
        }
        catch (error) {
            logger.error('Failed to update Slack message', error);
            return false;
        }
    }
    /**
     * Add reaction to message
     */
    async addReaction(channel, ts, reaction) {
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
        }
        catch (error) {
            logger.error('Failed to add reaction', error);
            return false;
        }
    }
    /**
     * Make authenticated request to Slack API
     */
    async makeSlackRequest(url, method, data) {
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
                    }
                    catch {
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
    async testConnection() {
        if (!this.config || !this.config.botToken) {
            throw new Error('Slack not configured. Please set bot token.');
        }
        try {
            const url = 'https://slack.com/api/auth.test';
            const response = await this.makeSlackRequest(url, 'GET');
            return response.ok;
        }
        catch (error) {
            logger.error('Slack connection test failed', error);
            return false;
        }
    }
    /**
     * Dispose of resources
     */
    dispose() {
        // Clean up if needed
    }
}
exports.SlackService = SlackService;
//# sourceMappingURL=SlackService.js.map