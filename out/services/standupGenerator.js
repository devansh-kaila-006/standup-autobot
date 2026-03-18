"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StandupGenerator = void 0;
const ActivityAnalyzer_1 = require("../utils/ActivityAnalyzer");
/**
 * Service class to generate daily standups using Gemini AI
 */
class StandupGenerator {
    constructor(config = {}) {
        this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent';
        this.model = config.model || 'gemini-3-flash-preview';
    }
    /**
     * Generates the standup summary based on developer activity.
     * @param data The JSON data gathered from VS Code.
     * @param apiKey The Google Gemini API key.
     * @param settings The standup generation settings (tone, language, custom prompt).
     * @param durationHours The lookback duration in hours.
     * @returns A Markdown string containing the standup.
     */
    async generateStandup(data, apiKey, settings = { tone: 'casual', outputLanguage: 'English' }, durationHours = 24) {
        // 1. Analyze the activity data
        const analysis = ActivityAnalyzer_1.ActivityAnalyzer.analyze(data);
        // 2. Build the prompt with analysis and settings
        const prompt = this.buildPrompt(data, analysis, settings, durationHours);
        if (!apiKey) {
            throw new Error('Google Gemini API Key is required.');
        }
        return await this.generateContent(prompt, apiKey);
    }
    /**
     * Call Gemini API to generate content from prompt
     */
    async generateContent(prompt, apiKey) {
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
                const errorJson = await response.json().catch(() => ({}));
                const message = errorJson.error?.message || response.statusText;
                throw new Error(`Gemini API error (${response.status}): ${message}`);
            }
            const json = await response.json();
            // Gemini returns text in candidates[0].content.parts[0].text
            if (json.candidates && json.candidates[0]?.content?.parts?.[0]?.text) {
                return json.candidates[0].content.parts[0].text;
            }
            else {
                throw new Error('Invalid response format from Gemini API');
            }
        }
        catch (error) {
            console.error('Failed to generate content:', error);
            throw new Error(`Failed to connect to Gemini API: ${error.message}`);
        }
    }
    /**
     * Formats the raw data and analysis into a structured prompt for the LLM.
     */
    buildPrompt(data, analysis, settings, durationHours) {
        const toneInstructions = {
            brief: "Keep it extremely short. Use bullet points only. No fluff.",
            detailed: "Provide a comprehensive report. Explain the 'why' behind the changes.",
            casual: "Use a friendly, conversational tone (like a Slack message to a teammate).",
            formal: "Use professional language suitable for email reports or stakeholder updates."
        };
        const filesList = data.topFiles
            .map((f) => `- ${f.file} (Time spent: ${f.timeSpent}, Lines changed: ${f.linesChanged})`)
            .join('\n');
        const commitsList = data.commits
            .map((c) => `- ${c.message} (${c.hash})\n  Files: ${c.files.join(', ')}`)
            .join('\n');
        const commandsList = data.commands
            .map((c) => `- ${c}`)
            .join('\n');
        const tagsStr = analysis.tags.length > 0 ? `Detected Activity Types: ${analysis.tags.join(', ')}.` : '';
        let blockersStr = 'None detected.';
        if (analysis.blockers.length > 0) {
            blockersStr = analysis.blockers.map(b => `- ${b}`).join('\n');
        }
        const confidenceNote = analysis.isLowConfidence
            ? `\n⚠️ NOTE: This summary has low confidence because: ${analysis.confidenceReason}\n`
            : '';
        return `
You are a senior developer's productivity assistant. Synthesize the following raw VS Code activity logs into a Daily Standup update for Slack.

### Instructions:
1. **Focus strongly on the 'Active Files'** data to deduce what feature was being built.
2. **Correlate Git commits with the Active Files** to show what was finished vs what is currently in progress.
3. **List any heavy terminal commands** as research or environment setup.
4. **Format as:** [Completed], [In Progress], and [Notes/Blockers]. 
5. **CRITICAL: Do not use any emojis in the output.**
6. **Tone:** ${toneInstructions[settings.tone] || toneInstructions.casual}
7. **Output Language:** ${settings.outputLanguage}
${settings.customPrompt ? `8. **Custom Instruction:** ${settings.customPrompt}` : ''}

### Analysis Context:
${tagsStr}
${confidenceNote}

### Data Input (Last ${durationHours} Hours):
1. **Top Edited Files (Activity Log):**
${filesList}

2. **Recent Git Commits:**
${commitsList}

3. **Terminal Commands:**
${commandsList}

### Blockers Section:
${blockersStr}

**Generate the standup summary now in ${settings.outputLanguage}:**
`;
    }
}
exports.StandupGenerator = StandupGenerator;
//# sourceMappingURL=standupGenerator.js.map