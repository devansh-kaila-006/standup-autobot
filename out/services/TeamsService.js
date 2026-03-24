"use strict";
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
exports.TeamsService = void 0;
const vscode = __importStar(require("vscode"));
const https = __importStar(require("https"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger();
class TeamsService {
    constructor(context) {
        this.context = context;
        this.config = null;
        this.accessToken = null;
        this.loadConfig();
    }
    /**
     * Load Teams configuration
     */
    loadConfig() {
        const config = vscode.workspace.getConfiguration('standup');
        this.config = {
            webhookUrl: config.get('teamsWebhookUrl', ''),
            tenantId: config.get('teamsTenantId', ''),
            clientId: config.get('teamsClientId', ''),
            clientSecret: '', // Loaded from secrets
        };
        this.loadSecrets();
    }
    /**
     * Load secrets from storage
     */
    async loadSecrets() {
        try {
            this.config.clientSecret = await this.context.secrets.get('standup.teamsClientSecret') || '';
        }
        catch (error) {
            logger.error('Failed to load Teams client secret', error);
        }
    }
    /**
     * Post message to Teams channel
     */
    async postMessage(webhookUrl, message) {
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
        }
        catch (error) {
            logger.error('Failed to post Teams message', error);
            return false;
        }
    }
    /**
     * Convert TeamsMessage to Adaptive Card format
     */
    convertToAdaptiveCard(message) {
        const body = [];
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
        const card = {
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
    async postStandup(webhookUrl, standupData) {
        const sections = [
            {
                title: '📋 Daily Standup Update',
                text: `**Date:** ${new Date().toLocaleDateString()}`,
            },
            {
                title: '✅ Completed Yesterday',
                facts: standupData.yesterday.map(item => ({
                    title: '•',
                    value: item,
                })),
            },
            {
                title: '🎯 Working on Today',
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
                title: '🎯 Goals',
                facts: standupData.goals.map(goal => ({
                    title: '•',
                    value: goal,
                })),
            });
        }
        const message = {
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
    async postSimpleMessage(webhookUrl, text, title) {
        const message = {
            title,
            text,
            summary: title || text,
        };
        return await this.postMessage(webhookUrl, message);
    }
    /**
     * Get access token for Microsoft Graph API
     */
    async getAccessToken() {
        if (!this.config || !this.config.tenantId || !this.config.clientId || !this.config.clientSecret) {
            logger.warn('Teams not configured for Graph API');
            return null;
        }
        try {
            const url = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
            return new Promise((resolve, reject) => {
                const params = new URLSearchParams();
                params.append('grant_type', 'client_credentials');
                params.append('client_id', this.config.clientId);
                params.append('client_secret', this.config.clientSecret);
                params.append('scope', 'https://graph.microsoft.com/.default');
                const options = {
                    hostname: 'login.microsoftonline.com',
                    port: 443,
                    path: `/${this.config.tenantId}/oauth2/v2.0/token`,
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
                            }
                            else {
                                reject(new Error('No access token in response'));
                            }
                        }
                        catch {
                            reject(new Error('Failed to parse token response'));
                        }
                    });
                });
                req.on('error', reject);
                req.write(params.toString());
                req.end();
            });
        }
        catch (error) {
            logger.error('Failed to get Teams access token', error);
            return null;
        }
    }
    /**
     * Get channel list using Microsoft Graph API
     */
    async getChannels(teamId) {
        const token = await this.getAccessToken();
        if (!token)
            return [];
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
                                resolve(response.value.map((ch) => ({
                                    id: ch.id,
                                    displayName: ch.displayName,
                                    description: ch.description,
                                    email: ch.email,
                                    webUrl: ch.webUrl,
                                })));
                            }
                            else {
                                resolve([]);
                            }
                        }
                        catch {
                            resolve([]);
                        }
                    });
                });
                req.on('error', reject);
                req.end();
            });
        }
        catch (error) {
            logger.error('Failed to get Teams channels', error);
            return [];
        }
    }
    /**
     * Get user info using Microsoft Graph API
     */
    async getUser(userId) {
        const token = await this.getAccessToken();
        if (!token)
            return null;
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
                        }
                        catch {
                            resolve(null);
                        }
                    });
                });
                req.on('error', reject);
                req.end();
            });
        }
        catch (error) {
            logger.error('Failed to get Teams user', error);
            return null;
        }
    }
    /**
     * Send message using Microsoft Graph API
     */
    async sendMessageGraph(channelId, message) {
        const token = await this.getAccessToken();
        if (!token)
            return false;
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
        }
        catch (error) {
            logger.error('Failed to send Teams message via Graph API', error);
            return false;
        }
    }
    /**
     * Test Teams connection
     */
    async testConnection() {
        if (!this.config || !this.config.webhookUrl) {
            throw new Error('Teams not configured. Please set webhook URL.');
        }
        try {
            const message = {
                title: 'Connection Test',
                text: 'Standup Autobot successfully connected to Teams!',
                summary: 'Connection test',
            };
            return await this.postMessage(this.config.webhookUrl, message);
        }
        catch (error) {
            logger.error('Teams connection test failed', error);
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
exports.TeamsService = TeamsService;
//# sourceMappingURL=TeamsService.js.map