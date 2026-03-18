# Standup Autobot

**Standup Autobot** is a premium VS Code extension that silently tracks your developer activity and generates concise, professional daily standup summaries using Google's Gemini LLMs. No more struggling to remember what you did yesterday—let AI synthesize your work for you.

## Key Features

- 🕵️ **Silent Background Tracking**: Automatically records file edits, line changes, time spent, Git commits, and terminal commands.
- ⚡ **AI-Powered Summaries**: Uses Gemini Flash to generate intelligent, context-aware reports with auto-tagging (bugfix, feature, chore).
- 📅 **Productivity Heatmap**: Visualize your last 7 days of activity with a color-coded intensity grid.
- 📋 **Export Anywhere**: One-click export to **Notion**, **Jira**, **Microsoft Teams**, or **Email**.
- 📝 **Weekly Digests**: Automated AI-generated Friday summaries of your entire week.
- 🔒 **Privacy & Audit**: Preview your raw JSON data before sending it to the AI. Integrated ignore patterns (`node_modules`, `.git`) ensure your privacy.
- ⚙️ **Project-Level Settings**: Use a `.standup.json` in your workspace to override global configurations.

## Getting Started

1. **Install** the extension from the VS Code Marketplace.
2. **Set your API Key**: Run `Standup: Set API Key` and paste your Google Gemini Key.
3. **Configure Settings**: Go to `File > Preferences > Settings` and search for "Standup Autobot".
4. **Project Overrides**: Add a `.standup.json` to your workspace root:
   ```json
   {
     "tone": "detailed",
     "triggerTime": "10:00",
     "customPrompt": "Focus strictly on the 'Backend' folder."
   }
   ```

## Commands & Usage

- **Standup: Generate Daily Summary**: Manual trigger for the daily report.
- **Standup: View History**: Open the dashboard to see past reports and the activity heatmap.
- **Standup: Preview Raw Data**: Review exactly what JSON payload is being sent to the AI.
- **Standup: Pause/Resume Tracking**: Toggle activity monitoring on/off via status bar or command.
- **Standup: Set Notion/Jira Tokens**: Securely store your API tokens for direct exports.

## Configuration (.standup.json Schema)

| Key | Type | Default | Description |
|---|---|---|---|
| `triggerTime` | string | `"09:00"` | Daily time to show the report (HH:MM). |
| `activityDuration` | number | `24` | Hours of history to include. |
| `tone` | string | `"casual"` | `brief`, `detailed`, `casual`, or `formal`. |
| `outputLanguage`| string | `"English"` | Language for the AI response. |
| `ignorePatterns`| array | `[...]` | Glob patterns to exclude from tracking. |

## Privacy

**Standup Autobot** respects your privacy. All activity logs are stored locally in VS Code's `globalState` and are never uploaded to any external server except for the final summary generation via Google's Gemini API (which you can preview via the Data Audit tool).

## License

**Standup Autobot** is a commercial product. A valid license or subscription is required for use. See the [LICENSE](LICENSE) file for the full text.

---
**Enjoying Standup Autobot?** [Get a premium license]([Your Licensing URL])
