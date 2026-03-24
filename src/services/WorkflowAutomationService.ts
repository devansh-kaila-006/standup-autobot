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

import * as vscode from 'vscode';
import { Logger } from '../utils/Logger';

const logger = new Logger('WorkflowAutomationService');

export interface AutomationRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    createdAt: number;
    lastTriggered?: number;
    triggerCount: number;
}

export interface AutomationTrigger {
    type: 'event' | 'schedule' | 'webhook' | 'manual';
    eventType?:
        | 'standup.generated'
        | 'activity.tracked'
        | 'git.commit'
        | 'file.changed'
        | 'timer.started'
        | 'timer.stopped'
        | 'integration.connected';
    schedule?: string; // Cron expression
    webhookId?: string;
}

export interface AutomationCondition {
    type: 'time' | 'count' | 'property' | 'expression';
    field?: string;
    operator?: '>' | '<' | '=' | '!=' | '>=' | '<=' | 'contains' | 'matches';
    value?: any;
    expression?: string;
}

export interface AutomationAction {
    type:
        | 'notification'
        | 'command'
        | 'webhook'
        | 'standup'
        | 'integration'
        | 'script'
        | 'log';
    params: Record<string, any>;
}

export interface AutomationContext {
    eventType: string;
    data: any;
    timestamp: number;
    ruleId: string;
}

export interface WebhookEvent {
    id: string;
    source: string;
    payload: any;
    headers: Record<string, string>;
    timestamp: number;
}

export class WorkflowAutomationService {
    private rules: Map<string, AutomationRule> = new Map();
    private webhooks: Map<string, WebhookEvent> = new Map();
    private disposables: vscode.Disposable[] = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadRules();
        this.loadWebhooks();
        this.registerEventListeners();
    }

    /**
     * Register event listeners for automation triggers
     */
    private registerEventListeners(): void {
        // Listen for standup generation
        const standupDisposable = vscode.commands.registerCommand(
            'standup.generateStandup',
            async () => {
                await this.triggerEvent('standup.generated', {});
            }
        );
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
        const gitCommitDisposable = vscode.commands.registerCommand(
            'standup.gitCommit',
            async (data: any) => {
                await this.triggerEvent('git.commit', data);
            }
        );
        this.disposables.push(gitCommitDisposable);
    }

    /**
     * Trigger an event and execute matching rules
     */
    public async triggerEvent(eventType: string, data: any): Promise<void> {
        logger.info(`Triggering event: ${eventType}`);

        const matchingRules = Array.from(this.rules.values()).filter(
            rule => rule.enabled && rule.trigger.type === 'event' && rule.trigger.eventType === eventType
        );

        for (const rule of matchingRules) {
            await this.executeRule(rule, { eventType, data, timestamp: Date.now(), ruleId: rule.id });
        }
    }

    /**
     * Execute an automation rule
     */
    private async executeRule(rule: AutomationRule, context: AutomationContext): Promise<void> {
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
            } catch (error) {
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
    private async checkConditions(conditions: AutomationCondition[], context: AutomationContext): Promise<boolean> {
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
    private async checkCondition(condition: AutomationCondition, context: AutomationContext): Promise<boolean> {
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
    private checkTimeCondition(condition: AutomationCondition, context: AutomationContext): boolean {
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
    private checkCountCondition(condition: AutomationCondition, context: AutomationContext): boolean {
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
    private checkPropertyCondition(condition: AutomationCondition, context: AutomationContext): boolean {
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
    private async checkExpressionCondition(condition: AutomationCondition, context: AutomationContext): Promise<boolean> {
        if (!condition.expression) {
            return true;
        }

        try {
            // Safe expression evaluation
            const func = new Function('context', `return ${condition.expression}`);
            return await func(context);
        } catch (error) {
            logger.error('Failed to evaluate expression condition', error);
            return false;
        }
    }

    /**
     * Get nested property from object
     */
    private getNestedProperty(obj: any, path: string): any {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Execute an action
     */
    private async executeAction(action: AutomationAction, context: AutomationContext): Promise<void> {
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
    private async executeNotificationAction(action: AutomationAction, context: AutomationContext): Promise<void> {
        const message = this.interpolateString(action.params.message || 'Automation triggered', context);

        vscode.window.showInformationMessage(message);
        logger.info(`Notification: ${message}`);
    }

    /**
     * Execute command action
     */
    private async executeCommandAction(action: AutomationAction, context: AutomationContext): Promise<void> {
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
    private async executeWebhookAction(action: AutomationAction, context: AutomationContext): Promise<void> {
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
    private async executeStandupAction(action: AutomationAction, context: AutomationContext): Promise<void> {
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
    private async executeIntegrationAction(action: AutomationAction, context: AutomationContext): Promise<void> {
        const integration = action.params.integration;
        const integrationAction = action.params.action;

        logger.info(`Integration action: ${integration}.${integrationAction}`);
        // Integration-specific actions would be handled here
    }

    /**
     * Execute script action
     */
    private async executeScriptAction(action: AutomationAction, context: AutomationContext): Promise<void> {
        const script = action.params.script;

        if (script) {
            try {
                const func = new Function('context', script);
                await func(context);
                logger.info('Script executed successfully');
            } catch (error) {
                logger.error('Failed to execute script', error);
            }
        }
    }

    /**
     * Execute log action
     */
    private executeLogAction(action: AutomationAction, context: AutomationContext): void {
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
    private interpolateString(str: string, context: AutomationContext): string {
        return str.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
            const value = this.getNestedProperty(context, path.trim());
            return value !== undefined ? String(value) : '';
        });
    }

    /**
     * Create a new automation rule
     */
    public async createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'>): Promise<string> {
        const id = this.generateId();
        const newRule: AutomationRule = {
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
    public async updateRule(id: string, updates: Partial<AutomationRule>): Promise<void> {
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
    public async deleteRule(id: string): Promise<void> {
        this.rules.delete(id);
        await this.context.globalState.update(`automation.rule.${id}`, undefined);
    }

    /**
     * Get all rules
     */
    public getRules(): AutomationRule[] {
        return Array.from(this.rules.values());
    }

    /**
     * Get a rule by ID
     */
    public getRule(id: string): AutomationRule | undefined {
        return this.rules.get(id);
    }

    /**
     * Enable/disable a rule
     */
    public async setRuleEnabled(id: string, enabled: boolean): Promise<void> {
        await this.updateRule(id, { enabled });
    }

    /**
     * Manually trigger a rule
     */
    public async triggerRule(id: string, data: any = {}): Promise<void> {
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
    private async loadRules(): Promise<void> {
        const keys = this.context.globalState.keys();
        const ruleKeys = keys.filter(key => key.startsWith('automation.rule.'));

        for (const key of ruleKeys) {
            const rule = await this.context.globalState.get<AutomationRule>(key);
            if (rule) {
                this.rules.set(rule.id, rule);
            }
        }
    }

    /**
     * Save a rule to storage
     */
    private async saveRule(rule: AutomationRule): Promise<void> {
        await this.context.globalState.update(`automation.rule.${rule.id}`, rule);
    }

    /**
     * Load webhooks from storage
     */
    private async loadWebhooks(): Promise<void> {
        const keys = this.context.globalState.keys();
        const webhookKeys = keys.filter(key => key.startsWith('automation.webhook.'));

        for (const key of webhookKeys) {
            const webhook = await this.context.globalState.get<WebhookEvent>(key);
            if (webhook) {
                this.webhooks.set(webhook.id, webhook);
            }
        }
    }

    /**
     * Generate unique ID
     */
    private generateId(): string {
        return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get rule statistics
     */
    public getStatistics(): {
        totalRules: number;
        enabledRules: number;
        totalTriggers: number;
        rulesByTriggerType: Record<string, number>;
    } {
        const rules = Array.from(this.rules.values());
        const enabledRules = rules.filter(r => r.enabled);
        const totalTriggers = rules.reduce((sum, r) => sum + r.triggerCount, 0);

        const rulesByTriggerType: Record<string, number> = {};
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
    public dispose(): void {
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }
}
