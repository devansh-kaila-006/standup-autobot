# Troubleshooting Guide

## Common Issues and Solutions

### Installation & Setup

#### Issue: Extension fails to activate
**Symptoms:**
- Error message in notifications
- Extension doesn't appear in command palette

**Solutions:**
1. Check VS Code version (requires 1.80.0+)
2. Reload VS Code window (`Ctrl+R` or `Cmd+R`)
3. Check Developer Tools console for errors (`Help > Toggle Developer Tools`)
4. Ensure Node.js dependencies are installed: `npm install`
5. Try reinstalling the extension

#### Issue: API Key errors
**Symptoms:**
- "API Key is required" error
- Gemini API connection failures

**Solutions:**
1. Set API key: `Standup: Set Gemini API Key`
2. Verify API key is valid at https://ai.google.dev/
3. Check API key has proper permissions
4. Ensure network connectivity to Google servers

### Activity Tracking

#### Issue: File activity not being tracked
**Symptoms:**
- No files showing in standup
- Activity count is zero

**Solutions:**
1. Check tracking is not paused: `Standup: Pause/Resume Tracking`
2. Verify file is not in ignore patterns
3. Ensure file is in an active workspace folder
4. Check file type is supported (must be `file://` scheme)
5. Open Activity Tracker diagnostics: `Standup: Show Diagnostic Logs`

#### Issue: Git commits not showing
**Symptoms:**
- No git history in standup
- Commit list is empty

**Solutions:**
1. Ensure workspace is a git repository: `git init` if needed
2. Check git is in PATH
3. Verify commits exist: `git log --oneline -10`
4. Check time range (default is 24 hours)
5. Ensure git user name/email is configured

#### Issue: Terminal commands not captured
**Symptoms:**
- No terminal history in standup
- Commands list is empty

**Solutions:**
1. Check terminal tracking is enabled in settings
2. Verify tracking mode: `integrated`, `history`, or `both`
3. For integrated mode: Use VS Code integrated terminals
4. For history mode: Check shell history files exist
5. Windows: Verify PowerShell history location
6. Unix: Check shell history file permissions

### Performance Issues

#### Issue: Extension is slow/lagging
**Symptoms:**
- VS Code becomes unresponsive
- Commands take long to execute

**Solutions:**
1. Check data retention settings (reduce if large dataset)
2. Run automatic cleanup: Set `autoCleanupEnabled: true`
3. Disable terminal tracking if not needed
4. Clear old data manually
5. Check memory usage in diagnostics

#### Issue: High memory usage
**Symptoms:**
- VS Code using lots of RAM
- Extension causing slowdowns

**Solutions:**
1. Run memory diagnostics: `Standup: Show Diagnostic Logs`
2. Reduce data retention period
3. Enable automatic cleanup
4. Clear activity history if very large
5. Check for memory leaks in diagnostic report

### Standup Generation

#### Issue: Standup generation fails
**Symptoms:**
- Error when generating standup
- No output produced

**Solutions:**
1. Verify API key is set correctly
2. Check internet connection
3. Try regenerating: `Standup: Generate Daily Summary`
4. Check Gemini API status
5. Review error messages in Developer Tools console
6. Try different tone/language settings

#### Issue: Generated standup is not accurate
**Symptoms:**
- Missing activities
- Wrong information
- Poor formatting

**Solutions:**
1. Check activity tracking is working
2. Increase activity duration in settings
3. Adjust custom prompt for better results
4. Try different tone setting
5. Provide more context in custom prompt
6. Check if activities are being filtered by ignore patterns

### Export Issues

#### Issue: Export to Slack fails
**Symptoms:**
- Slack export error
- Webhook not working

**Solutions:**
1. Verify webhook URL is correct
2. Check Slack app permissions
3. Ensure webhook is active in Slack
4. Test webhook with curl/Postman
5. Check network connectivity

#### Issue: Export to Teams fails
**Symptoms:**
- Teams webhook error
- Message not appearing

**Solutions:**
1. Verify incoming webhook URL
2. Check Teams connector is enabled
3. Ensure message format is correct
4. Test with simple message first
5. Check Teams admin permissions

### Data & Storage

#### Issue: Lost all my data
**Symptoms:**
- Activity history disappeared
- Settings reset to defaults

**Solutions:**
1. Check if VS Code settings were reset
2. Look for backup in globalState
3. Check if extension was reinstalled
4. Data may be in VS Code storage folder
5. Consider exporting data regularly

#### Issue: Data not being cleaned up
**Symptoms:**
- Old data still present
- Storage growing large

**Solutions:**
1. Enable automatic cleanup in settings
2. Reduce retention period
3. Run manual cleanup via API
4. Check cleanup is working: `Standup: Show Diagnostic Logs`
5. Verify cleanup interval settings

### Analytics & Reports

#### Issue: Analytics showing wrong data
**Symptoms:**
- Incorrect metrics
- Wrong trends
- Missing days

**Solutions:**
1. Verify activity tracking is working
2. Check date range for analytics
3. Ensure sufficient data exists
4. Try different time ranges
5. Clear cache and refresh

#### Issue: Sprint summary incomplete
**Symptoms:**
- Missing activities
- Wrong dates
- Empty sections

**Solutions:**
1. Check sprint length setting
2. Verify data exists for sprint period
3. Ensure activity tracking was active
4. Try shorter sprint length
5. Check for data gaps in period

### Configuration

#### Issue: Settings not being applied
**Symptoms:**
- Changed setting but no effect
- Setting resets to default

**Solutions:**
1. Reload VS Code window
2. Check setting name is correct
3. Verify setting in settings.json
4. Check for conflicting settings
5. Look for schema validation errors

#### Issue: Ignore patterns not working
**Symptoms:**
- Ignored files still appear
- Pattern doesn't match

**Solutions:**
1. Use glob patterns correctly
2. Test pattern in VS Code files exclude
3. Ensure pattern uses forward slashes
4. Check pattern syntax
5. Try more specific pattern

## Getting Help

### Collect Diagnostic Information

Before reporting issues, collect:

1. **VS Code version**: `Help > About`
2. **Extension version**: Check in Extensions panel
3. **Error messages**: Copy exact error text
4. **Console logs**: Developer Tools console
5. **Diagnostic logs**: `Standup: Show Diagnostic Logs`

### Debug Mode

Enable debug logging:

```json
{
  "standup.debugEnabled": true
}
```

Then check Output panel > "Standup Autobot" channel.

### Contact & Support

- **GitHub Issues**: Report bugs at https://github.com/your-repo/standup-autobot/issues
- **Discussions**: Ask questions at https://github.com/your-repo/standup-autobot/discussions
- **Email**: support@example.com

### Logs Location

- **Windows**: `%APPDATA%\Code\logs`
- **macOS**: `~/Library/Application Support/Code/logs`
- **Linux**: `~/.config/Code/logs`

## Advanced Troubleshooting

### Reset Extension State

```typescript
// Clear all data
context.globalState.update('standup.activityLog', undefined);

// Clear API keys
await context.secrets.delete('standup.geminiKey');

// Reset settings
context.globalState.update('standup.paused', false);
```

### Manual Data Inspection

Open Command Palette > `Developer: Open Logs Folder` to view logs.

### Performance Profiling

Enable performance monitoring:

```typescript
import { globalPerformanceMonitor } from './utils/performanceMonitor';

// Get performance report
const report = globalPerformanceMonitor.generateReport();
console.log(report);
```

---

**Last Updated:** 2026-03-24
