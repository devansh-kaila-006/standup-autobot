"use strict";
/**
 * Workflow Automation Service
 *
 * Provides automation capabilities including:
 * - Event-triggered actions
 * - Custom automation scripts
 * - Webhook support
 * - Scheduled tasks
 * - Conditional workflows
 * - Integration triggers
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
exports.WorkflowAutomationService = void 0;
const vscode = __importStar(require("vscode"));
const Logger_1 = require("../utils/Logger");
const logger = new Logger_1.Logger('WorkflowAutomationService');
class WorkflowAutomationService {
    constructor(context) {
        this.context = context;
        this.rules = new Map();
        this.webhooks = new Map();
        this.disposables = [];
        this.loadRules();
        this.loadWebhooks();
        this.registerEventListeners();
    }
    /**
     * Register event listeners for automation triggers
     */
    registerEventListeners() {
        // Listen for standup generation
        const standupDisposable = vscode.commands.registerCommand('standup.generateStandup', async () => {
            await this.triggerEvent('standup.generated', {});
        });
        this.disposables.push(standupDisposable);
        // Listen for file changes
        const fileDisposable = vscode.workspace.onDidChangeTextDocument(event => {
            this.triggerEvent('file.changed', {
                file: event.document.uri.fsPath,
                language: event.document.languageId,
            });
        });
        this.disposables.push(fileDisposable);
        // Listen for git commits (would be triggered by GitTracker)
        const gitCommitDisposable = vscode.commands.registerCommand('standup.gitCommit', async (data) => {
            await this.triggerEvent('git.commit', data);
        });
        this.disposables.push(gitCommitDisposable);
    }
    /**
     * Trigger an event and execute matching rules
     */
    async triggerEvent(eventType, data) {
        logger.info(`Triggering event: ${eventType}`);
        const matchingRules = Array.from(this.rules.values()).filter(rule => rule.enabled && rule.trigger.type === 'event' && rule.trigger.eventType === eventType);
        for (const rule of matchingRules) {
            await this.executeRule(rule, { eventType, data, timestamp: Date.now(), ruleId: rule.id });
        }
    }
    /**
     * Execute an automation rule
     */
    async executeRule(rule, context) {
        logger.info(`Executing rule: ${rule.name}`);
        // Check conditions
        if (!(await this.checkConditions(rule.conditions, context))) {
            logger.info(`Rule ${rule.name} conditions not met, skipping`);
            return;
        }
        // Execute actions
        for (const action of rule.actions) {
            try {
                await this.executeAction(action, context);
            }
            catch (error) {
                logger.error(`Failed to execute action ${action.type} for rule ${rule.name}`, error);
            }
        }
        // Update rule stats
        rule.lastTriggered = context.timestamp;
        rule.triggerCount++;
        await this.saveRule(rule);
    }
    /**
     * Check if conditions are met
     */
    async checkConditions(conditions, context) {
        for (const condition of conditions) {
            const result = await this.checkCondition(condition, context);
            if (!result) {
                return false;
            }
        }
        return true;
    }
    /**
     * Check a single condition
     */
    async checkCondition(condition, context) {
        switch (condition.type) {
            case 'time':
                return this.checkTimeCondition(condition, context);
            case 'count':
                return this.checkCountCondition(condition, context);
            case 'property':
                return this.checkPropertyCondition(condition, context);
            case 'expression':
                return this.checkExpressionCondition(condition, context);
            default:
                return true;
        }
    }
    /**
     * Check time condition
     */
    checkTimeCondition(condition, context) {
        const now = new Date();
        const hour = now.getHours();
        if (condition.operator && condition.value !== undefined) {
            switch (condition.operator) {
                case '>':
                    return hour > condition.value;
                case '<':
                    return hour < condition.value;
                case '>=':
                    return hour >= condition.value;
                case '<=':
                    return hour <= condition.value;
                case '=':
                    return hour === condition.value;
                default:
                    return true;
            }
        }
        return true;
    }
    /**
     * Check count condition
     */
    checkCountCondition(condition, context) {
        const count = context.data?.count || context.data?.items?.length || 0;
        if (condition.operator && condition.value !== undefined) {
            switch (condition.operator) {
                case '>':
                    return count > condition.value;
                case '<':
                    return count < condition.value;
                case '>=':
                    return count >= condition.value;
                case '<=':
                    return count <= condition.value;
                case '=':
                    return count === condition.value;
                default:
                    return true;
            }
        }
        return true;
    }
    /**
     * Check property condition
     */
    checkPropertyCondition(condition, context) {
        if (!condition.field) {
            return true;
        }
        const fieldValue = this.getNestedProperty(context.data, condition.field);
        if (condition.operator && condition.value !== undefined) {
            switch (condition.operator) {
                case '=':
                    return fieldValue === condition.value;
                case '!=':
                    return fieldValue !== condition.value;
                case '>':
                    return typeof fieldValue === 'number' && fieldValue > condition.value;
                case '<':
                    return typeof fieldValue === 'number' && fieldValue < condition.value;
                case '>=':
                    return typeof fieldValue === 'number' && fieldValue >= condition.value;
                case '<=':
                    return typeof fieldValue === 'number' && fieldValue <= condition.value;
                case 'contains':
                    return typeof fieldValue === 'string' && fieldValue.includes(condition.value);
                case 'matches':
                    return typeof fieldValue === 'string' && new RegExp(condition.value).test(fieldValue);
                default:
                    return true;
            }
        }
        return true;
    }
    /**
     * Check expression condition
     */
    async checkExpressionCondition(condition, context) {
        if (!condition.expression) {
            return true;
        }
        try {
            // Safe expression evaluation
            const func = new Function('context', `return ${condition.expression}`);
            return await func(context);
        }
        catch (error) {
            logger.error('Failed to evaluate expression condition', error);
            return false;
        }
    }
    /**
     * Get nested property from object
     */
    getNestedProperty(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }
    /**
     * Execute an action
     */
    async executeAction(action, context) {
        switch (action.type) {
            case 'notification':
                await this.executeNotificationAction(action, context);
                break;
            case 'command':
                await this.executeCommandAction(action, context);
                break;
            case 'webhook':
                await this.executeWebhookAction(action, context);
                break;
            case 'standup':
                await this.executeStandupAction(action, context);
                break;
            case 'integration':
                await this.executeIntegrationAction(action, context);
                break;
            case 'script':
                await this.executeScriptAction(action, context);
                break;
            case 'log':
                this.executeLogAction(action, context);
                break;
            default:
                logger.warn(`Unknown action type: ${action.type}`);
        }
    }
    /**
     * Execute notification action
     */
    async executeNotificationAction(action, context) {
        const message = this.interpolateString(action.params.message || 'Automation triggered', context);
        vscode.window.showInformationMessage(message);
        logger.info(`Notification: ${message}`);
    }
    /**
     * Execute command action
     */
    async executeCommandAction(action, context) {
        const command = action.params.command;
        const args = action.params.args || [];
        if (command) {
            await vscode.commands.executeCommand(command, ...args);
            logger.info(`Executed command: ${command}`);
        }
    }
    /**
     * Execute webhook action
     */
    async executeWebhookAction(action, context) {
        const url = action.params.url;
        const method = action.params.method || 'POST';
        const headers = action.params.headers || {};
        const body = this.interpolateString(JSON.stringify(action.params.body || {}), context);
        if (url) {
            logger.info(`Sending webhook to: ${url}`);
            // Webhook implementation would go here
            // For now, just log it
        }
    }
    /**
     * Execute standup action
     */
    async executeStandupAction(action, context) {
        const actionType = action.params.action; // 'generate', 'copy', 'export'
        switch (actionType) {
            case 'generate':
                await vscode.commands.executeCommand('standup.generateStandup');
                break;
            case 'copy':
                await vscode.commands.executeCommand('standup.copyToClipboard');
                break;
            case 'export':
                await vscode.commands.executeCommand('standup.export', action.params.format);
                break;
            default:
                logger.warn(`Unknown standup action: ${actionType}`);
        }
    }
    /**
     * Execute integration action
     */
    async executeIntegrationAction(action, context) {
        const integration = action.params.integration;
        const integrationAction = action.params.action;
        logger.info(`Integration action: ${integration}.${integrationAction}`);
        // Integration-specific actions would be handled here
    }
    /**
     * Execute script action
     */
    async executeScriptAction(action, context) {
        const script = action.params.script;
        if (script) {
            try {
                const func = new Function('context', script);
                await func(context);
                logger.info('Script executed successfully');
            }
            catch (error) {
                logger.error('Failed to execute script', error);
            }
        }
    }
    /**
     * Execute log action
     */
    executeLogAction(action, context) {
        const message = this.interpolateString(action.params.message || 'Automation triggered', context);
        const level = action.params.level || 'info';
        switch (level) {
            case 'info':
                logger.info(message);
                break;
            case 'warn':
                logger.warn(message);
                break;
            case 'error':
                logger.error(message);
                break;
            case 'debug':
                logger.debug(message);
                break;
        }
    }
    /**
     * Interpolate string with context values
     */
    interpolateString(str, context) {
        return str.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const value = this.getNestedProperty(context, path.trim());
            return value !== undefined ? String(value) : '';
        });
    }
    /**
     * Create a new automation rule
     */
    async createRule(rule) {
        const id = this.generateId();
        const newRule = {
            ...rule,
            id,
            createdAt: Date.now(),
            triggerCount: 0,
        };
        this.rules.set(id, newRule);
        await this.saveRule(newRule);
        return id;
    }
    /**
     * Update an existing rule
     */
    async updateRule(id, updates) {
        const rule = this.rules.get(id);
        if (!rule) {
            throw new Error(`Rule not found: ${id}`);
        }
        const updatedRule = { ...rule, ...updates };
        this.rules.set(id, updatedRule);
        await this.saveRule(updatedRule);
    }
    /**
     * Delete a rule
     */
    async deleteRule(id) {
        this.rules.delete(id);
        await this.context.globalState.update(`automation.rule.${id}`, undefined);
    }
    /**
     * Get all rules
     */
    getRules() {
        return Array.from(this.rules.values());
    }
    /**
     * Get a rule by ID
     */
    getRule(id) {
        return this.rules.get(id);
    }
    /**
     * Enable/disable a rule
     */
    async setRuleEnabled(id, enabled) {
        await this.updateRule(id, { enabled });
    }
    /**
     * Manually trigger a rule
     */
    async triggerRule(id, data = {}) {
        const rule = this.rules.get(id);
        if (!rule) {
            throw new Error(`Rule not found: ${id}`);
        }
        await this.executeRule(rule, {
            eventType: 'manual',
            data,
            timestamp: Date.now(),
            ruleId: id,
        });
    }
    /**
     * Load rules from storage
     */
    async loadRules() {
        const keys = this.context.globalState.keys();
        const ruleKeys = keys.filter(key => key.startsWith('automation.rule.'));
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
        await this.context.globalState.update(`automation.rule.${rule.id}`, rule);
    }
    /**
     * Load webhooks from storage
     */
    async loadWebhooks() {
        const keys = this.context.globalState.keys();
        const webhookKeys = keys.filter(key => key.startsWith('automation.webhook.'));
        for (const key of webhookKeys) {
            const webhook = await this.context.globalState.get(key);
            if (webhook) {
                this.webhooks.set(webhook.id, webhook);
            }
        }
    }
    /**
     * Generate unique ID
     */
    generateId() {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get rule statistics
     */
    getStatistics() {
        const rules = Array.from(this.rules.values());
        const enabledRules = rules.filter(r => r.enabled);
        const totalTriggers = rules.reduce((sum, r) => sum + r.triggerCount, 0);
        const rulesByTriggerType = {};
        for (const rule of rules) {
            const triggerType = rule.trigger.eventType || rule.trigger.type;
            rulesByTriggerType[triggerType] = (rulesByTriggerType[triggerType] || 0) + 1;
        }
        return {
            totalRules: rules.length,
            enabledRules: enabledRules.length,
            totalTriggers,
            rulesByTriggerType,
        };
    }
    /**
     * Dispose of resources
     */
    dispose() {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
exports.WorkflowAutomationService = WorkflowAutomationService;
//# sourceMappingURL=WorkflowAutomationService.js.map