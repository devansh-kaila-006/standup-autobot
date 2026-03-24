/**
 * Smart Features Service
 *
 * Provides AI-powered intelligent features including:
 * - Automatic activity categorization
 * - Predictive standup generation
 * - Smart scheduling recommendations
 */

import * as vscode from 'vscode';
import { StandupGenerator, DeveloperActivityData } from './standupGenerator';

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

export class SmartFeaturesService {
    private activityPatterns: Map<string, any> = new Map();
    private userCorrections: Array<{ original: string; corrected: string }> = [];

    constructor(private context: vscode.ExtensionContext) {
        this.loadPatterns();
    }

    /**
     * Intelligently categorize an activity based on context
     */
    public categorizeActivity(activity: any): ActivityCategory {
        const { type, filePath, command, message } = activity;

        // File-based activities
        if (type === 'file' && filePath) {
            return this.categorizeFileActivity(filePath);
        }

        // Git-based activities
        if (type === 'git' && message) {
            return this.categorizeGitActivity(message);
        }

        // Terminal-based activities
        if (type === 'terminal' && command) {
            return this.categorizeTerminalActivity(command);
        }

        // Default categorization
        return {
            category: 'general',
            confidence: 0.5,
            tags: ['other'],
            priority: 'low',
        };
    }

    /**
     * Categorize file-based activities
     */
    private categorizeFileActivity(filePath: string): ActivityCategory {
        const fileName = filePath.split('/').pop() || filePath;
        const extension = fileName.split('.').pop() || '';
        const path = filePath.toLowerCase();

        // Configuration files
        if (path.includes('config') || path.includes('.env') || extension === 'json' || extension === 'yaml') {
            return {
                category: 'configuration',
                confidence: 0.9,
                tags: ['setup', 'infrastructure'],
                priority: 'medium',
            };
        }

        // Test files
        if (path.includes('test') || path.includes('spec') || fileName.includes('.test.') || fileName.includes('.spec.')) {
            return {
                category: 'testing',
                confidence: 0.95,
                tags: ['quality', 'validation'],
                priority: 'high',
            };
        }

        // Documentation
        if (path.includes('docs') || path.includes('readme') || extension === 'md') {
            return {
                category: 'documentation',
                confidence: 0.9,
                tags: ['communication', 'knowledge'],
                priority: 'low',
            };
        }

        // UI/Frontend
        if (path.includes('component') || path.includes('view') || extension === 'tsx' || extension === 'vue') {
            return {
                category: 'frontend',
                confidence: 0.85,
                tags: ['ui', 'user-experience'],
                priority: 'medium',
            };
        }

        // Backend/API
        if (path.includes('api') || path.includes('controller') || path.includes('service')) {
            return {
                category: 'backend',
                confidence: 0.85,
                tags: ['server', 'logic'],
                priority: 'high',
            };
        }

        // Database
        if (path.includes('model') || path.includes('schema') || path.includes('migration')) {
            return {
                category: 'database',
                confidence: 0.8,
                tags: ['data', 'storage'],
                priority: 'high',
            };
        }

        // Styles
        if (extension === 'css' || extension === 'scss' || extension === 'less') {
            return {
                category: 'styling',
                confidence: 0.9,
                tags: ['ui', 'design'],
                priority: 'low',
            };
        }

        // Scripts/Build
        if (fileName.includes('package') || fileName.includes('webpack') || fileName.includes('vite')) {
            return {
                category: 'build',
                confidence: 0.85,
                tags: ['tooling', 'infrastructure'],
                priority: 'medium',
            };
        }

        // Default
        return {
            category: 'development',
            confidence: 0.6,
            tags: ['coding'],
            priority: 'medium',
        };
    }

    /**
     * Categorize git activities
     */
    private categorizeGitActivity(message: string): ActivityCategory {
        const lowerMessage = message.toLowerCase();

        // Feature work
        if (lowerMessage.includes('feature') || lowerMessage.includes('add') || lowerMessage.includes('implement')) {
            return {
                category: 'feature-development',
                confidence: 0.85,
                tags: ['new-feature', 'development'],
                priority: 'high',
            };
        }

        // Bug fixes
        if (lowerMessage.includes('fix') || lowerMessage.includes('bug') || lowerMessage.includes('issue')) {
            return {
                category: 'bug-fix',
                confidence: 0.9,
                tags: ['maintenance', 'quality'],
                priority: 'high',
            };
        }

        // Refactoring
        if (lowerMessage.includes('refactor') || lowerMessage.includes('clean') || lowerMessage.includes('optimize')) {
            return {
                category: 'refactoring',
                confidence: 0.85,
                tags: ['quality', 'maintenance'],
                priority: 'medium',
            };
        }

        // Documentation
        if (lowerMessage.includes('doc') || lowerMessage.includes('readme')) {
            return {
                category: 'documentation',
                confidence: 0.9,
                tags: ['communication'],
                priority: 'low',
            };
        }

        // Tests
        if (lowerMessage.includes('test') || lowerMessage.includes('spec')) {
            return {
                category: 'testing',
                confidence: 0.9,
                tags: ['quality'],
                priority: 'high',
            };
        }

        // Deployment/CI
        if (lowerMessage.includes('deploy') || lowerMessage.includes('release') || lowerMessage.includes('ci')) {
            return {
                category: 'deployment',
                confidence: 0.85,
                tags: ['operations'],
                priority: 'high',
            };
        }

        // Default
        return {
            category: 'version-control',
            confidence: 0.6,
            tags: ['git'],
            priority: 'medium',
        };
    }

    /**
     * Categorize terminal activities
     */
    private categorizeTerminalActivity(command: string): ActivityCategory {
        const lowerCommand = command.toLowerCase();

        // Package management
        if (lowerCommand.includes('npm') || lowerCommand.includes('yarn') || lowerCommand.includes('pip')) {
            return {
                category: 'package-management',
                confidence: 0.9,
                tags: ['dependencies', 'setup'],
                priority: 'medium',
            };
        }

        // Git operations
        if (lowerCommand.startsWith('git ')) {
            return {
                category: 'version-control',
                confidence: 0.95,
                tags: ['git', 'collaboration'],
                priority: 'high',
            };
        }

        // Build/Run
        if (lowerCommand.includes('build') || lowerCommand.includes('start') || lowerCommand.includes('run')) {
            return {
                category: 'build-run',
                confidence: 0.85,
                tags: ['development', 'testing'],
                priority: 'medium',
            };
        }

        // Testing
        if (lowerCommand.includes('test') || lowerCommand.includes('spec')) {
            return {
                category: 'testing',
                confidence: 0.9,
                tags: ['quality', 'validation'],
                priority: 'high',
            };
        }

        // Database
        if (lowerCommand.includes('migrate') || lowerCommand.includes('seed') || lowerCommand.includes('db')) {
            return {
                category: 'database',
                confidence: 0.85,
                tags: ['data', 'infrastructure'],
                priority: 'high',
            };
        }

        // Deployment
        if (lowerCommand.includes('deploy') || lowerCommand.includes('publish')) {
            return {
                category: 'deployment',
                confidence: 0.9,
                tags: ['operations'],
                priority: 'high',
            };
        }

        // Default
        return {
            category: 'terminal-operation',
            confidence: 0.5,
            tags: ['command-line'],
            priority: 'low',
        };
    }

    /**
     * Predict likely activities based on patterns
     */
    public predictActivities(hours: number = 24): PredictedActivity[] {
        const predictions: PredictedActivity[] = [];
        const activityLog = this.context.globalState.get<any>('standup.activityLog');

        if (!activityLog || !activityLog.dailyLogs) {
            return predictions;
        }

        // Analyze recent patterns
        const recentLogs = activityLog.dailyLogs.slice(-7); // Last 7 days
        const patternFrequency = new Map<string, number>();

        recentLogs.forEach((log: any) => {
            if (log.activities) {
                log.activities.forEach((activity: any) => {
                    const category = this.categorizeActivity(activity);
                    patternFrequency.set(
                        category.category,
                        (patternFrequency.get(category.category) || 0) + 1
                    );
                });
            }
        });

        // Generate predictions based on frequency
        const sortedPatterns = Array.from(patternFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        sortedPatterns.forEach(([category, frequency]) => {
            const likelihood = Math.min(95, (frequency / 7) * 100);
            predictions.push({
                description: this.getActivityDescription(category),
                likelihood: Math.round(likelihood),
                basedOnPattern: `Seen ${frequency} times in last 7 days`,
            });
        });

        return predictions;
    }

    /**
     * Get human-readable activity description
     */
    private getActivityDescription(category: string): string {
        const descriptions: Record<string, string> = {
            'feature-development': 'New feature development work',
            'bug-fix': 'Bug fixes and issue resolution',
            'testing': 'Testing and quality assurance',
            'refactoring': 'Code refactoring and optimization',
            'documentation': 'Documentation updates',
            'frontend': 'Frontend/UI development',
            'backend': 'Backend/API development',
            'database': 'Database work',
            'deployment': 'Deployment and operations',
            'configuration': 'Configuration and setup',
        };

        return descriptions[category] || `${category} activities`;
    }

    /**
     * Detect potential blockers or impediments
     */
    public detectBlockers(): string[] {
        const blockers: string[] = [];
        const activityLog = this.context.globalState.get<any>('standup.activityLog');

        if (!activityLog || !activityLog.dailyLogs) {
            return blockers;
        }

        const recentLogs = activityLog.dailyLogs.slice(-3); // Last 3 days
        let totalActivity = 0;
        let bugFixCount = 0;

        recentLogs.forEach((log: any) => {
            if (log.activities) {
                log.activities.forEach((activity: any) => {
                    totalActivity++;
                    const category = this.categorizeActivity(activity);
                    if (category.category === 'bug-fix') {
                        bugFixCount++;
                    }
                });
            }
        });

        // Low activity might indicate blocker
        if (totalActivity < 10) {
            blockers.push('Low activity level - possible blocker or waiting on dependencies');
        }

        // High bug fix count might indicate technical debt
        if (bugFixCount > 5) {
            blockers.push('High number of bug fixes - possible technical debt or quality issues');
        }

        return blockers;
    }

    /**
     * Generate smart scheduling recommendation
     */
    public getSmartSchedulingRecommendation(): SmartScheduling {
        const activityLog = this.context.globalState.get<any>('standup.activityLog');

        if (!activityLog || !activityLog.dailyLogs) {
            return {
                recommendedTime: '09:00',
                reason: 'Default time (no activity data yet)',
                expectedActivityLevel: 'medium',
            };
        }

        // Find most productive hour
        const hourlyActivity = new Array(24).fill(0);

        activityLog.dailyLogs.forEach((log: any) => {
            if (log.activities) {
                const hour = new Date(log.timestamp).getHours();
                hourlyActivity[hour] += log.activities.length;
            }
        });

        const peakHour = hourlyActivity.indexOf(Math.max(...hourlyActivity));

        // Recommend time around peak hour
        const recommendedHour = Math.max(8, Math.min(17, peakHour));
        const recommendedTime = `${recommendedHour.toString().padStart(2, '0')}:00`;

        // Calculate expected activity level
        const avgActivity = hourlyActivity.reduce((a, b) => a + b, 0) / 24;
        const expectedActivityLevel = avgActivity > 10 ? 'high' : avgActivity > 5 ? 'medium' : 'low';

        return {
            recommendedTime,
            reason: `Based on your most productive hour (${peakHour}:00)`,
            expectedActivityLevel,
        };
    }

    /**
     * Learn from user corrections
     */
    public recordCorrection(originalCategory: string, correctedCategory: string): void {
        this.userCorrections.push({
            original: originalCategory,
            corrected: correctedCategory,
        });

        // Update patterns based on corrections
        this.savePatterns();
    }

    /**
     * Get AI-enhanced standup suggestions
     */
    public async getEnhancedStandupSuggestions(data: DeveloperActivityData): Promise<{
        highlights: string[];
        blockers: string[];
        nextSteps: string[];
    }> {
        const predictions = this.predictActivities();
        const blockers = this.detectBlockers();
        const scheduling = this.getSmartSchedulingRecommendation();

        // Generate highlights from predictions
        const highlights = predictions
            .filter(p => p.likelihood > 60)
            .map(p => `Likely working on: ${p.description} (${p.likelihood}% confidence)`);

        // Generate next steps based on recent activity
        const nextSteps: string[] = [];

        if (data.commits.length > 0) {
            const lastCommit = data.commits[0];
            if (lastCommit.message.toLowerCase().includes('wip') || lastCommit.message.toLowerCase().includes('todo')) {
                nextSteps.push(`Continue work on: ${lastCommit.message}`);
            }
        }

        // Add scheduling recommendation
        if (scheduling.expectedActivityLevel === 'high') {
            nextSteps.push(`High activity expected - consider scheduling important meetings for ${scheduling.recommendedTime}`);
        }

        return {
            highlights,
            blockers,
            nextSteps,
        };
    }

    /**
     * Save learned patterns
     */
    private savePatterns(): void {
        this.context.globalState.update('standup.activityPatterns', {
            patterns: Array.from(this.activityPatterns.entries()),
            corrections: this.userCorrections,
        });
    }

    /**
     * Load learned patterns
     */
    private loadPatterns(): void {
        const stored = this.context.globalState.get<any>('standup.activityPatterns');
        if (stored) {
            this.activityPatterns = new Map(stored.patterns || []);
            this.userCorrections = stored.corrections || [];
        }
    }

    /**
     * Dispose of resources
     */
    public dispose(): void {
        // Clean up if needed
    }
}
