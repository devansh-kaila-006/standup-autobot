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
    eventType?: 'standup.generated' | 'activity.tracked' | 'git.commit' | 'file.changed' | 'timer.started' | 'timer.stopped' | 'integration.connected';
    schedule?: string;
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
    type: 'notification' | 'command' | 'webhook' | 'standup' | 'integration' | 'script' | 'log';
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
export declare class WorkflowAutomationService {
    private context;
    private rules;
    private webhooks;
    private disposables;
    constructor(context: vscode.ExtensionContext);
    /**
     * Register event listeners for automation triggers
     */
    private registerEventListeners;
    /**
     * Trigger an event and execute matching rules
     */
    triggerEvent(eventType: string, data: any): Promise<void>;
    /**
     * Execute an automation rule
     */
    private executeRule;
    /**
     * Check if conditions are met
     */
    private checkConditions;
    /**
     * Check a single condition
     */
    private checkCondition;
    /**
     * Check time condition
     */
    private checkTimeCondition;
    /**
     * Check count condition
     */
    private checkCountCondition;
    /**
     * Check property condition
     */
    private checkPropertyCondition;
    /**
     * Check expression condition
     */
    private checkExpressionCondition;
    /**
     * Get nested property from object
     */
    private getNestedProperty;
    /**
     * Execute an action
     */
    private executeAction;
    /**
     * Execute notification action
     */
    private executeNotificationAction;
    /**
     * Execute command action
     */
    private executeCommandAction;
    /**
     * Execute webhook action
     */
    private executeWebhookAction;
    /**
     * Execute standup action
     */
    private executeStandupAction;
    /**
     * Execute integration action
     */
    private executeIntegrationAction;
    /**
     * Execute script action
     */
    private executeScriptAction;
    /**
     * Execute log action
     */
    private executeLogAction;
    /**
     * Interpolate string with context values
     */
    private interpolateString;
    /**
     * Create a new automation rule
     */
    createRule(rule: Omit<AutomationRule, 'id' | 'createdAt' | 'triggerCount'>): Promise<string>;
    /**
     * Update an existing rule
     */
    updateRule(id: string, updates: Partial<AutomationRule>): Promise<void>;
    /**
     * Delete a rule
     */
    deleteRule(id: string): Promise<void>;
    /**
     * Get all rules
     */
    getRules(): AutomationRule[];
    /**
     * Get a rule by ID
     */
    getRule(id: string): AutomationRule | undefined;
    /**
     * Enable/disable a rule
     */
    setRuleEnabled(id: string, enabled: boolean): Promise<void>;
    /**
     * Manually trigger a rule
     */
    triggerRule(id: string, data?: any): Promise<void>;
    /**
     * Load rules from storage
     */
    private loadRules;
    /**
     * Save a rule to storage
     */
    private saveRule;
    /**
     * Load webhooks from storage
     */
    private loadWebhooks;
    /**
     * Generate unique ID
     */
    private generateId;
    /**
     * Get rule statistics
     */
    getStatistics(): {
        totalRules: number;
        enabledRules: number;
        totalTriggers: number;
        rulesByTriggerType: Record<string, number>;
    };
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=WorkflowAutomationService.d.ts.map