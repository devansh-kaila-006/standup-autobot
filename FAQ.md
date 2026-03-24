# Frequently Asked Questions (FAQ)

## General Questions

### What is Standup Autobot?
Standup Autobot is a VS Code extension that automatically tracks your development activity (file edits, git commits, terminal commands) and generates AI-powered daily standup summaries using Google's Gemini API.

### Is my data private?
Yes! All your activity data is stored locally on your machine in VS Code's storage. The only data sent to external APIs is:
- Activity data sent to Gemini API for standup generation
- Data sent to configured export destinations (Slack, Teams, etc.)

You control what data is shared and with whom.

### How much does it cost?
- **Extension**: Free and open source
- **Gemini API**: Has a free tier with generous limits (check current pricing at https://ai.google.dev/pricing)
- Optional: Export destinations may have their own costs

### What platforms are supported?
- **Operating Systems**: Windows, macOS, Linux
- **VS Code**: Version 1.80.0 or higher
- **Shells**: Bash, Zsh, PowerShell, CMD, Fish

## Installation & Setup

### How do I install Standup Autobot?
1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Search for "Standup Autobot"
4. Click Install

### Do I need a Gemini API key?
Yes, for AI-powered standup generation. Get your free API key at https://ai.google.dev/

### How do I set my API key?
1. Open Command Palette (Ctrl+Shift+P / Cmd+Shift+P)
2. Type "Standup: Set Gemini API Key"
3. Paste your API key
4. Press Enter

### Can I use it without an API key?
Yes, but you'll only get activity tracking and manual standup creation. AI-powered features require an API key.

## Usage

### How do I generate a standup?
1. Open Command Palette
2. Type "Standup: Generate Daily Summary"
3. Your standup will be generated and displayed

### How often should I generate standups?
Most users generate standups once per day, typically before their daily standup meeting.

### Can I customize the standup format?
Yes! You can:
- Change the tone (brief, detailed, casual, formal)
- Set the output language
- Add custom prompts for specific requirements
- Use custom export templates

### What time period does it cover?
By default, it covers the last 24 hours. You can adjust this in settings (`standup.activityDuration`).

### Can I see my activity history?
Yes! Use "Standup: View History" to see all past standups and activity trends.

## Features

### What activities are tracked?
- **File activity**: Edits, time spent, lines changed
- **Git activity**: Commits with messages and files
- **Terminal activity**: Commands executed in integrated terminals

### Can I exclude certain files?
Yes! Use the `standup.ignorePatterns` setting. Supports glob patterns like:
- `**/node_modules/**`
- `**/*.test.ts`
- `**/dist/**`

### Does it work with multiple projects?
Yes! Each workspace/project is tracked separately. Switch between projects and generate standups for each.

### Can I export my standups?
Yes! Export to:
- Clipboard (copy/paste)
- Email
- Slack
- Microsoft Teams
- Discord
- GitHub Gist
- GitLab Snippet
- And more...

### What are analytics?
Analytics provide insights into:
- Most productive hours
- Activity trends over time
- Week-over-week comparisons
- Project health reports
- Sprint summaries

Open with "Standup: View Analytics Dashboard".

## Configuration

### How do I pause tracking?
Use "Standup: Pause/Resume Tracking" or set `standup.paused` in settings.

### How do I change the standup time?
Set `standup.triggerTime` in settings (format: "HH:MM", e.g., "09:00").

### Can I adjust how much history is kept?
Yes! Set `standup.dataRetentionDays` (default: 30 days).

### How do I enable automatic cleanup?
Set `standup.autoCleanupEnabled` to `true` and configure `standup.cleanupIntervalDays`.

### What are the different tracking modes?
- **integrated**: Track VS Code terminals only
- **history**: Read shell history files
- **both**: Use both methods (recommended)

## Troubleshooting

### My standup isn't accurate
- Check tracking is enabled (not paused)
- Verify you have activity in the last 24 hours
- Try increasing the activity duration
- Check ignore patterns aren't filtering your work
- Review raw data: "Standup: Preview Raw Data"

### Extension is slow
- Reduce data retention period
- Enable automatic cleanup
- Disable terminal tracking if not needed
- Check diagnostic report for issues

### API errors
- Verify your API key is valid
- Check internet connection
- Try regenerating the standup
- Check Gemini API status

### Data disappeared
- Check if extension was reinstalled
- Verify VS Code storage location
- Ensure tracking wasn't paused
- Check diagnostic logs for errors

## Advanced

### Can I integrate with my CI/CD?
Yes! Use the Enhanced Exporter Service API in your own scripts.

### Can I use it with multiple team members?
Each team member needs their own installation and API key. For team features, consider the collaboration features in development.

### Does it work with remote workspaces?
Yes! It works with SSH remote, WSL, and GitHub Codespaces.

### Can I extend it with custom features?
Yes! The extension is open source. Check the Developer Guide for contribution guidelines.

### Is there an API?
Yes! All services are documented with JSDoc. See the Developer Guide.

## Privacy & Security

### Where is my data stored?
- Activity data: VS Code's globalState (local machine)
- API keys: VS Code's secret storage (encrypted, local machine)
- Export destinations: Per destination (e.g., Slack servers)

### Is my activity sent to Google?
Only when generating standups. The activity data is sent to Gemini API for processing. No activity data is stored by Google.

### Can I use it with corporate policies?
Check with your IT department. You may need to:
- Use a corporate Gemini API key
- Adjust data retention settings
- Verify export destination compliance
- Review what data is sent externally

### What about sensitive information?
- The extension tracks file paths and commit messages
- Be cautious with sensitive project names
- Use ignore patterns for sensitive files
- Review generated standups before sharing

## Integration & Extensibility

### Does it work with other standup tools?
Currently, it generates standups that you can copy/paste into other tools. Integration support is planned.

### Can I automate standup generation?
Yes! Use the VS Code Task Scheduler or set up external automation using the extension's API.

### Are there keyboard shortcuts?
By default, no. But you can add custom keybindings in VS Code settings.

## Performance

### How much resources does it use?
- Memory: ~50-100MB (varies with activity history)
- CPU: Minimal impact, uses rate limiting
- Disk: ~1-5MB per month of activity data

### Will it slow down my IDE?
No! Performance optimizations include:
- Rate limiting (100 calls/10 seconds)
- Debouncing for file events
- Lazy loading for webviews
- LRU cache for frequently accessed data
- Automatic data cleanup

### How often does it track activity?
- File changes: Debounced (1 second delay)
- Git commits: On demand (when generating standup)
- Terminal: Continuous (if integrated mode enabled)

## Updates & Support

### How do I update?
Updates are automatic through VS Code Extensions marketplace.

### Where do I report bugs?
Report issues at: https://github.com/your-repo/standup-autobot/issues

### Where can I request features?
Use GitHub Discussions or create a feature request issue.

### Is there documentation available?
Yes! Check out:
- Developer Guide (DEVELOPER.md)
- Troubleshooting Guide (TROUBLESHOOTING.md)
- API Documentation (JSDoc in source code)

## License

### Can I use it commercially?
Yes! It's released under the SEE LICENSE. Check the LICENSE file for details.

### Can I modify it?
Yes! It's open source. Contributions are welcome!

---

**Last Updated:** 2026-03-24
**Version:** 1.0.0
