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
export class ActivityAnalyzer {
  // Define keywords for auto-tagging
  private static readonly TAG_PATTERNS: Record<string, RegExp[]> = {
    bugfix: [/fix/i, /bug/i, /patch/i, /issue/i],
    feature: [/feat/i, /add/i, /new/i, /implement/i],
    refactor: [/refactor/i, /clean/i, /optim/i, /rework/i],
    review: [/pr/i, /review/i, /merge/i, /approve/i],
    docs: [/docs/i, /readme/i, /md$/i],
    config: [/config/i, /\.env/i, /settings/i, /webpack/i],
    test: [/test/i, /spec/i, /__tests__/i, /jest/i, /vitest/i]
  };

  // Define keywords for blockers
  private static readonly BLOCKER_KEYWORDS = [
    'error', 'failed', 'exception', 'ENOENT', 'cannot find', 'rejected', 'segfault', 'panic'
  ];

  /**
   * Analyzes the raw developer activity data to extract high-level insights.
   * @param data The gathered developer activity data.
   * @returns An ActivityAnalysis object containing tags, blockers, and confidence information.
   */
  public static analyze(data: DeveloperActivityData): ActivityAnalysis {
    const tags = new Set<string>();
    const blockers: string[] = [];

    // 1. Auto-tagging Logic
    // Check commits
    data.commits.forEach(commit => {
      this.detectTags(commit.message, tags);
      commit.files.forEach(file => this.detectTags(file, tags));
    });

    // Check top files
    data.topFiles.forEach(file => {
      this.detectTags(file.file, tags);
    });

    // 2. Blockers Detection
    data.commands.forEach(cmd => {
      const lowerCmd = cmd.toLowerCase();
      const foundBlocker = this.BLOCKER_KEYWORDS.find(keyword => lowerCmd.includes(keyword.toLowerCase()));
      if (foundBlocker) {
        // Store a snippet of the command for context
        blockers.push(`[${foundBlocker.toUpperCase()}] ${cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd}`);
      }
    });

    // 3. Confidence Scoring
    const { isLowConfidence, reason } = this.calculateConfidence(data);

    return {
      tags: Array.from(tags),
      blockers,
      isLowConfidence,
      confidenceReason: reason
    };
  }

  /**
   * Helper to detect tags based on text content.
   */
  private static detectTags(text: string, tagSet: Set<string>): void {
    for (const [tag, patterns] of Object.entries(this.TAG_PATTERNS)) {
      if (patterns.some(pattern => pattern.test(text))) {
        tagSet.add(tag);
      }
    }
  }

  /**
   * Logic to determine if the summary should be marked as low confidence.
   */
  private static calculateConfidence(data: DeveloperActivityData): { isLowConfidence: boolean; reason: string } {
    // Estimate total time (assuming timeSpent is a string like "10 mins")
    let totalMinutes = 0;
    data.topFiles.forEach(f => {
      const match = f.timeSpent.match(/(\d+)/);
      if (match) {
        const val = parseInt(match[0], 10);
        // Our ActivityTracker currently stores minutes
        totalMinutes += val;
      }
    });

    const isShortSession = totalMinutes < 10;
    const isSingleFile = data.topFiles.length === 1;

    if (isShortSession && totalMinutes > 0) {
      return { isLowConfidence: true, reason: `Total tracked time is only ${totalMinutes} minutes.` };
    }

    if (isSingleFile && data.topFiles.length > 0) {
      // If only one file was touched, it might be low confidence unless significant work was done
      // For simplicity, we follow the requirement: "only 1 file was touched"
      return { isLowConfidence: true, reason: 'Only one file was touched during this period.' };
    }

    // Default to high confidence if we have multiple files and > 10 mins
    return { isLowConfidence: false, reason: '' };
  }
}
