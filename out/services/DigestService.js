"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DigestService = void 0;
class DigestService {
    /**
     * Generates a weekly summary using the Gemini API.
     */
    static async generateWeeklyDigest(history, generator, apiKey) {
        if (history.length < 3) {
            return "Not enough standup history available for a weekly digest (minimum 3 required).";
        }
        // Format data for the prompt
        const dataString = history.map(entry => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            return `Date: ${date}\nNotes: ${entry.text}`;
        }).join('\n\n---\n\n');
        const prompt = `
      You are a helpful engineering manager assistant.
      Here are the raw standup notes from a developer for the past week:
      
      ${dataString}
      
      Based on these notes, summarize this developer's week in 3-5 bullet points.
      Focus on key achievements, overall progress, and any recurring blockers.
      Be concise and professional.
    `;
        try {
            // Re-using the generateContent logic or similar from StandupGenerator
            // For simplicity, we can add a generic generate method to StandupGenerator or use it directly
            return await generator.generateContent(prompt, apiKey);
        }
        catch (error) {
            console.error("Weekly digest generation failed:", error);
            return "Failed to generate weekly digest.";
        }
    }
}
exports.DigestService = DigestService;
//# sourceMappingURL=DigestService.js.map