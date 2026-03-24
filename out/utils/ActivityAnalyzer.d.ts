import { DeveloperActivityData } from '../services/standupGenerator';
export interface ActivityAnalysis {
    tags: string[];
    blockers: string[];
    isLowConfidence: boolean;
    confidenceReason: string;
}
/**
 * Utility class to analyze developer activity data for smarter summaries.
 */
export declare class ActivityAnalyzer {
    private static readonly TAG_PATTERNS;
    private static readonly BLOCKER_KEYWORDS;
    /**
     * Analyzes the raw developer activity data to extract high-level insights.
     * @param data The gathered developer activity data.
     * @returns An ActivityAnalysis object containing tags, blockers, and confidence information.
     */
    static analyze(data: DeveloperActivityData): ActivityAnalysis;
    /**
     * Helper to detect tags based on text content.
     */
    private static detectTags;
    /**
     * Logic to determine if the summary should be marked as low confidence.
     */
    private static calculateConfidence;
}
//# sourceMappingURL=ActivityAnalyzer.d.ts.map