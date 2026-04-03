/**
 * Interfaces for the input JSON data
 */
export interface FileActivity {
  file: string;
  timeSpent: string;
  linesChanged: number;
}

export interface GitCommit {
  hash: string;
  message: string;
  timestamp: string;
  files: string[];
}

export interface TerminalCommand {
  command: string;
  timestamp?: string;
}

export interface DeveloperActivityData {
  topFiles: FileActivity[];
  commits: GitCommit[];
  commands: string[]; // Adjusting to match terminalTracker's output
}

/**
 * Project-based activity grouping
 */
export interface ProjectActivity {
  projectName: string;
  files: FileActivity[];
  commits: GitCommit[];
  commands: string[];
  fileCount: number;
  totalLinesChanged: number;
}

/**
 * Configuration for the StandupGenerator
 */
export interface StandupGeneratorConfig {
  baseUrl?: string;
  model?: string;
}

/**
 * Settings for the standup generation (from VS Code configuration)
 */
export interface StandupSettings {
  customPrompt?: string;
  tone: 'brief' | 'detailed' | 'casual' | 'formal';
  outputLanguage: string;
}

import { ActivityAnalyzer, ActivityAnalysis } from '../utils/ActivityAnalyzer';
import { geminiAPICache, generateStandupCacheKey, hashActivityData } from '../utils/apiCache';
import { globalPerformanceMonitor } from '../utils/performanceMonitor';
import { Icons } from '../utils/iconUtils';

/**
 * Service class to generate daily standups using Gemini AI
 */
export class StandupGenerator {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly isExplicitEndpoint: boolean;

  constructor(config: StandupGeneratorConfig = {}) {
    // v1beta is required for Gemini 2.5+ models; v1 does not expose them
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.model = config.model || 'gemini-2.5-flash';
    this.isExplicitEndpoint = typeof config.baseUrl === 'string' && config.baseUrl.trim().length > 0;
}

  /**
   * Generates the standup summary based on developer activity.
   * @param data The JSON data gathered from VS Code.
   * @param apiKey The Google Gemini API key.
   * 
   * @param settings The standup generation settings (tone, language, custom prompt).
   * @param durationHours The lookback duration in hours.
   * @returns A Markdown string containing the standup.
   */
  async generateStandup(
    data: DeveloperActivityData, 
    apiKey?: string, 
    settings: StandupSettings = { tone: 'casual', outputLanguage: 'English' },
    durationHours: number = 24
  ): Promise<string> {
    // 1. Analyze the activity data
    const analysis = ActivityAnalyzer.analyze(data);

    // 2. Build the prompt with analysis and settings
    const prompt = this.buildPrompt(data, analysis, settings, durationHours);

    if (!apiKey) {
      throw new Error('Google Gemini API Key is required.');
    }

    return await this.generateContent(prompt, apiKey);
  }

  /**
   * Call Gemini API to generate content from prompt
   * Uses caching to avoid redundant API calls for identical prompts
   */
  public async generateContent(prompt: string, apiKey: string): Promise<string> {
    const stop = globalPerformanceMonitor.start('standupGenerator.generateContent');

    try {
      // Create a simple hash of the prompt for caching
      const promptHash = hashActivityData({ prompt });
      const cacheKey = `gemini:${promptHash}`;

      // Try to get from cache first
      const cachedResponse = geminiAPICache.get(cacheKey);
      if (cachedResponse) {
        stop();
        console.log('Using cached Gemini API response');
        return cachedResponse;
      }

      const makeGenerateRequest = async (modelName: string) => {
        const url = this.isExplicitEndpoint
          ? this.baseUrl
          : `${this.baseUrl.replace(/\/$/, '')}/models/${encodeURIComponent(modelName)}:generateContent`;

        return await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            }
          }),
        });
      };

      // Make the API call
      const response = await makeGenerateRequest(this.model);

      if (!response.ok) {
        const errorJson: any = await response.json().catch(() => ({}));
        const message = errorJson.error?.message || response.statusText;
        throw new Error(`Gemini API error (${response.status}): ${message}`);
      }

      const json: any = await response.json();

      // Gemini returns text in candidates[0].content.parts[0].text
      if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
        const result = json.candidates[0].content.parts[0].text;

        // Cache the result for 5 minutes (300000 ms)
        geminiAPICache.set(cacheKey, result, 300000);

        stop();
        return result;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error: any) {
      stop();
      console.error('Failed to generate content:', error);
      throw new Error(`Failed to connect to Gemini API: ${error.message}`);
    }
  }

  /**
   * Extract project name from file path
   * Uses the top-level folder name as project identifier
   */
  private extractProjectName(filePath: string): string {
    const parts = filePath.split(/[/\\]/);

    // Filter out Windows drive letters and common system/root directories
    const ignorePatterns = [
      /^[a-z]:$/i,                    // Windows drive letters (c:, d:, etc.)
      /^Users$/i,                     // Windows/Mac Users folder
      /^home$/i,                      // Linux home folder
      /^var$/i,                       // Linux var folder
      /^tmp$/i,                       // Temp folders
      /^\./i,                         // Hidden folders
      /^Desktop$/i,                   // Desktop folder
      /^Documents$/i,                 // Documents folder
      /^Downloads$/i,                 // Downloads folder
      /^OneDrive$/i,                  // OneDrive folder
    ];

    // Special handling for Windows paths: skip the username after Users/
    let skipNextFolder = false;
    const processedParts = parts.filter((part, index) => {
      // Skip drive letters
      if (/^[a-z]:$/i.test(part)) return false;

      // Skip Users folder and the next folder (username)
      if (/^Users$/i.test(part) || /^home$/i.test(part)) {
        skipNextFolder = true;
        return false;
      }

      // Skip the folder after Users/home (this is the username)
      if (skipNextFolder) {
        skipNextFolder = false;
        return false;
      }

      // Skip other common system folders
      if (ignorePatterns.some(pattern => pattern.test(part))) return false;

      return true;
    });

    // Remove common root folders (src, lib, app, etc.) and get actual project name
    const commonRoots = ['src', 'lib', 'app', 'dist', 'build', 'out', 'components', 'utils', 'services', 'test', 'tests', '__tests__'];
    const startIndex = processedParts.findIndex(part => commonRoots.includes(part));

    if (startIndex > 0) {
      return processedParts[startIndex - 1];
    }

    // If no common roots found, use the first meaningful folder
    if (processedParts.length > 0) {
      return processedParts[0];
    }

    return 'Unknown Project';
  }

  /**
   * Group activity data by project
   */
  private groupByProject(data: DeveloperActivityData): ProjectActivity[] {
    const projectMap = new Map<string, ProjectActivity>();

    // Group files by project
    data.topFiles.forEach(file => {
      const projectName = this.extractProjectName(file.file);

      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, {
          projectName,
          files: [],
          commits: [],
          commands: [],
          fileCount: 0,
          totalLinesChanged: 0
        });
      }

      const project = projectMap.get(projectName)!;
      project.files.push(file);
      project.fileCount++;
      project.totalLinesChanged += file.linesChanged;
    });

    // Group commits by project (based on files they modified)
    data.commits.forEach(commit => {
      if (commit.files.length === 0) {
        // Commits with no files - add to all projects or create general section
        const projectName = 'General/Other';
        if (!projectMap.has(projectName)) {
          projectMap.set(projectName, {
            projectName,
            files: [],
            commits: [],
            commands: [],
            fileCount: 0,
            totalLinesChanged: 0
          });
        }
        projectMap.get(projectName)!.commits.push(commit);
      } else {
        // Add commit to the project of the first file
        const firstProjectName = this.extractProjectName(commit.files[0]);
        if (!projectMap.has(firstProjectName)) {
          projectMap.set(firstProjectName, {
            projectName: firstProjectName,
            files: [],
            commits: [],
            commands: [],
            fileCount: 0,
            totalLinesChanged: 0
          });
        }
        projectMap.get(firstProjectName)!.commits.push(commit);
      }
    });

    // For commands, distribute them based on project context
    data.commands.forEach(command => {
      let projectName = 'General/Other';

      // Try to detect project context from command
      if (command.includes('git')) {
        // Git operations - check if we can infer project from existing projects
        if (projectMap.size > 0) {
          // Find the most active project (by lines changed)
          const mostActiveProject = Array.from(projectMap.values())
            .sort((a, b) => b.totalLinesChanged - a.totalLinesChanged)[0];

          if (mostActiveProject && mostActiveProject.totalLinesChanged > 0) {
            projectName = mostActiveProject.projectName;
          } else {
            // If no file activity, put git commands in separate Git section
            projectName = 'Git Operations';
          }
        } else {
          // No projects detected, put git commands in separate section
          projectName = 'Git Operations';
        }
      } else {
        // Non-git commands - try to detect project from command content
        for (const [existingProjectName, projectData] of projectMap.entries()) {
          // Check if command mentions any file from this project
          const commandMentionsProject = projectData.files.some(file =>
            command.includes(file.file.split('/').pop()!.split('\\').pop()!)
          );

          if (commandMentionsProject) {
            projectName = existingProjectName;
            break;
          }
        }
      }

      // Create project section if it doesn't exist
      if (!projectMap.has(projectName)) {
        projectMap.set(projectName, {
          projectName,
          files: [],
          commits: [],
          commands: [],
          fileCount: 0,
          totalLinesChanged: 0
        });
      }

      projectMap.get(projectName)!.commands.push(command);
    });

    // Convert to array and sort by activity level (most active first)
    return Array.from(projectMap.values())
      .sort((a, b) => b.totalLinesChanged - a.totalLinesChanged);
  }

  /**
   * Formats the raw data and analysis into a structured prompt for the LLM.
   */
  private buildPrompt(
    data: DeveloperActivityData,
    analysis: ActivityAnalysis,
    settings: StandupSettings,
    durationHours: number
  ): string {
    const toneInstructions: Record<string, string> = {
      brief: "Keep it extremely short. Use bullet points only. No fluff.",
      detailed: "Provide a comprehensive report. Explain the 'why' behind the changes.",
      casual: "Use a friendly, conversational tone (like a Slack message to a teammate).",
      formal: "Use professional language suitable for email reports or stakeholder updates."
    };

    // Group activity by project
    const projects = this.groupByProject(data);

    // Build project sections
    const projectSections = projects.map(project => {
      // Special handling for non-project categories
      const isGitOps = project.projectName === 'Git Operations';
      const isGeneral = project.projectName === 'General/Other';
      const isNoProject = project.fileCount === 0 && project.commits.length === 0;

      let sectionHeader = '';
      let sectionMetadata = '';

      if (isGitOps) {
        sectionHeader = '### 🔧 Git Operations';
        sectionMetadata = `*${project.commands.length} git commands executed*`;
      } else if (isGeneral) {
        sectionHeader = '### 💻 General Commands';
        sectionMetadata = `*${project.commands.length} terminal commands*`;
      } else if (isNoProject) {
        sectionHeader = `### 📦 ${project.projectName}`;
        sectionMetadata = '*No file activity detected*';
      } else {
        sectionHeader = `### 📁 Project: ${project.projectName}`;
        sectionMetadata = `*${project.fileCount} files edited, ${project.totalLinesChanged} total lines changed*`;
      }

      const filesList = project.files
        .map((f) => `- ${f.file} (Time spent: ${f.timeSpent}, Lines changed: ${f.linesChanged})`)
        .join('\n');

      const commitsList = project.commits
        .map((c) => `- ${c.message} (${c.hash})\n  Files: ${c.files.join(', ')}`)
        .join('\n');

      const commandsList = project.commands
        .map((c) => `- ${c}`)
        .join('\n');

      // Build section content based on type
      let sectionContent = '';

      if (isGitOps || isGeneral || isNoProject) {
        // For non-project sections, only show commands
        sectionContent = `
${sectionHeader}
${sectionMetadata}

**Commands run:**
${commandsList || 'No commands'}
`;
      } else {
        // For actual projects, show full details
        sectionContent = `
${sectionHeader}
${sectionMetadata}

**Files worked on:**
${filesList || 'No files edited'}

**Commits made:**
${commitsList || 'No commits for this project'}

**Commands run:**
${commandsList || 'No commands for this project'}
`;
      }

      return sectionContent;
    }).join('\n---\n');

    const tagsStr = analysis.tags.length > 0 ? `Detected Activity Types: ${analysis.tags.join(', ')}.` : '';

    let blockersStr = 'None detected.';
    if (analysis.blockers.length > 0) {
      blockersStr = analysis.blockers.map(b => `- ${b}`).join('\n');
    }

    const confidenceNote = analysis.isLowConfidence
      ? `\n${Icons.warning()} NOTE: This summary has low confidence because: ${analysis.confidenceReason}\n`
      : '';

    return `
You are a senior developer's productivity assistant. Synthesize the following raw VS Code activity logs into a Daily Standup update for Slack.

### Instructions:
1. **Be strictly factual and grounded in the data below.**
   - Do NOT guess intent.
   - Do NOT say "it looks like", "likely", "suggests", "primarily focused", etc.
   - If the data is insufficient to infer something, say "Insufficient data to determine."
2. **CRITICAL: Organize by PROJECT** - Create separate sections for each project listed below
   - Each project should have its own [Completed], [In Progress], and [Notes/Blockers] subsections
   - Use clear project headers (e.g., "## Project: [Project Name]")
   - Do NOT mix activities from different projects together
   - For "Git Operations" section: Create a single section listing git activity across all projects
   - For "General Commands" section: List general terminal commands that don't belong to specific projects
3. **Use ONLY the provided data** for each project section (files, commits, commands).
4. **Format exactly as:** Separate [Completed], [In Progress], and [Notes/Blockers] for EACH project.
5. **If there are no commits for a project, say so plainly.** Do not imply completions.
6. **Terminal commands:** list them under their respective project sections unless they're in "Git Operations" or "General Commands"
7. **CRITICAL: Do not use any emojis in the output.**
8. **Tone:** ${toneInstructions[settings.tone] || toneInstructions.casual}
9. **Output Language:** ${settings.outputLanguage}
${settings.customPrompt ? `10. **Custom Instruction:** ${settings.customPrompt}` : ''}

### Analysis Context:
${tagsStr}
${confidenceNote}

### Data Input (Last ${durationHours} Hours):
${projectSections}

### Blockers Section:
${blockersStr}

**Generate the project-organized standup summary now in ${settings.outputLanguage}:**
`;
  }
}
