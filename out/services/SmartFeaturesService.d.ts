/**
 * Smart Features Service
 *
 * Provides AI-powered intelligent features including:
 * - Automatic activity categorization
 * - Predictive standup generation
 * - Smart scheduling recommendations
 */
import * as vscode from 'vscode';
import { DeveloperActivityData } from './standupGenerator';
export interface ActivityCategory {
    category: string;
    confidence: number;
    tags: string[];
    priority: 'high' | 'medium' | 'low';
}
export interface PredictedActivity {
    description: string;
    likelihood: number;
    basedOnPattern: string;
}
export interface SmartScheduling {
    recommendedTime: string;
    reason: string;
    expectedActivityLevel: 'high' | 'medium' | 'low';
}
export declare class SmartFeaturesService {
    private context;
    private activityPatterns;
    private userCorrections;
    constructor(context: vscode.ExtensionContext);
    /**
     * Intelligently categorize an activity based on context
     */
    categorizeActivity(activity: any): ActivityCategory;
    /**
     * Categorize file-based activities
     */
    private categorizeFileActivity;
    /**
     * Categorize git activities
     */
    private categorizeGitActivity;
    /**
     * Categorize terminal activities
     */
    private categorizeTerminalActivity;
    /**
     * Predict likely activities based on patterns
     */
    predictActivities(hours?: number): PredictedActivity[];
    /**
     * Get human-readable activity description
     */
    private getActivityDescription;
    /**
     * Detect potential blockers or impediments
     */
    detectBlockers(): string[];
    /**
     * Generate smart scheduling recommendation
     */
    getSmartSchedulingRecommendation(): SmartScheduling;
    /**
     * Learn from user corrections
     */
    recordCorrection(originalCategory: string, correctedCategory: string): void;
    /**
     * Get AI-enhanced standup suggestions
     */
    getEnhancedStandupSuggestions(data: DeveloperActivityData): Promise<{
        highlights: string[];
        blockers: string[];
        nextSteps: string[];
    }>;
    /**
     * Save learned patterns
     */
    private savePatterns;
    /**
     * Load learned patterns
     */
    private loadPatterns;
    /**
     * Dispose of resources
     */
    dispose(): void;
}
//# sourceMappingURL=SmartFeaturesService.d.ts.map