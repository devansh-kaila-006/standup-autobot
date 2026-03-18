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
 * Configuration for the StandupGenerator
 */
export interface StandupGeneratorConfig {
  baseUrl?: string;
  model?: string;
}

/**
 * Service class to generate daily standups using local LLM (Ollama)
 */
export class StandupGenerator {
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(config: StandupGeneratorConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
    this.model = config.model || 'gemini-3-flash-preview';
  }

  /**
   * Generates the standup summary based on developer activity.
   * @param data The JSON data gathered from VS Code.
   * @param apiKey The Google Gemini API key.
   * @param durationHours The lookback duration in hours.
   * @returns A Markdown string containing the standup.
   */
  async generateStandup(data: DeveloperActivityData, apiKey?: string, durationHours: number = 24): Promise<string> {
    const prompt = this.buildPrompt(data, durationHours);

    if (!apiKey) {
      throw new Error('Google Gemini API Key is required.');
    }

    try {
      const response = await fetch(this.baseUrl, {
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

      if (!response.ok) {
        const errorJson: any = await response.json().catch(() => ({}));
        const message = errorJson.error?.message || response.statusText;
        throw new Error(`Gemini API error (${response.status}): ${message}`);
      }

      const json: any = await response.json();
      
      // Gemini returns text in candidates[0].content.parts[0].text
      if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
        return json.candidates[0].content.parts[0].text;
      } else {
        throw new Error('Invalid response format from Gemini API');
      }
    } catch (error: any) {
      console.error('Failed to generate standup:', error);
      throw new Error(`Failed to connect to Gemini API: ${error.message}`);
    }
  }

  /**
   * Formats the raw data into a structured prompt for the LLM.
   */
  private buildPrompt(data: DeveloperActivityData, durationHours: number): string {
    const filesList = data.topFiles
      .map((f) => `- ${f.file} (Time spent: ${f.timeSpent}, Lines changed: ${f.linesChanged})`)
      .join('\n');

    const commitsList = data.commits
      .map((c) => `- ${c.message} (${c.hash})\n  Files: ${c.files.join(', ')}`)
      .join('\n');

    const commandsList = data.commands
      .map((c) => `- ${c}`)
      .join('\n');

    return `
You are a senior developer's productivity assistant. Synthesize the following raw VS Code activity logs into a 3-bullet-point Daily Standup update for Slack.

### Instructions:
1. **Focus strongly on the 'Active Files'** data to deduce what feature was being built (e.g., if they spent 3 hours in StripePayment.tsx, they were building the Stripe integration).
2. **Correlate Git commits with the Active Files** to show what was finished vs what is currently in progress.
3. **List any heavy terminal commands** (like npm install <weird-package>) as research or environment setup.
4. **Format as:** [Completed], [In Progress], and [Notes/Blockers]. 
5. **CRITICAL: Do not use any emojis in the output.**

### Data Input (Last ${durationHours} Hours):
1. **Top Edited Files (Activity Log):**
${filesList}

2. **Recent Git Commits:**
${commitsList}

3. **Terminal Commands:**
${commandsList}

### Blockers
[Mention any inferred blockers. If nothing suggests a blocker, output "None"]

**Tone:** Concise and professional.
`;
  }
}
