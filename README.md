# Standup Autobot

**Standup Autobot** is a VS Code extension that silently tracks your developer activity and generates concise, professional daily standup summaries using Google's Gemini LLMs. No more struggling to remember what you did yesterday—let AI synthesize your work for you.

## Features

- 🕵️ **Silent Tracking**: Automatically tracks file edits, time spent, Git commits, and terminal commands.
- ⚡ **AI-Powered**: Uses Gemini 3 Flash to generate intelligent, context-aware summaries.
- 📅 **Scheduled Summaries**: Set a "Trigger Time" to automatically see your report every morning.
- 📋 **Slack Ready**: One-click "Copy for Slack" button with professional, emoji-free formatting.
- 🔒 **Privacy Focused**: All activity tracking is stored locally on your machine.

## Getting Started

1. **Install** the extension from the VS Code Marketplace.
2. **Set your API Key**:
   - Run the command `Standup: Set API Key` from the Command Palette (`Ctrl+Shift+P`).
   - Paste your Google Gemini API key (you can get one for free at [Google AI Studio](https://aistudio.google.com/)).
3. **Configure Settings**:
   - Go to `File > Preferences > Settings` and search for "Standup Autobot".
   - Set your preferred **Trigger Time** (e.g., `09:30`) and **Activity Duration** (e.g., `24` hours).

## Usage

- **Manual Generation**: Run `Standup: Generate Daily Summary` at any time.
- **Automatic**: The extension will automatically show your summary card at your specified `Trigger Time`.

## Requirements

- VS Code version 1.80.0 or higher.
- A Google Gemini API Key.

## Extension Settings

This extension contributes the following settings:

* `standup.triggerTime`: The daily time to automatically show the standup card (format: `HH:MM`).
* `standup.activityDuration`: The number of hours of history to include in each report (default: `24`).

## Release Notes

### 0.0.1
- Initial release with Activity, Git, and Terminal tracking.
- Integration with Gemini 3 Flash.
- Automated scheduling and configurable lookback windows.

---
**Enjoying Standup Autobot?** [Leave a review](https://marketplace.visualstudio.com/)!
