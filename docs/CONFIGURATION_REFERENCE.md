# Standup Autobot - Configuration Reference

This document provides a complete reference for all configurable settings in Standup Autobot.

## Overview

ALL hardcoded values have been removed from the codebase. Everything is now configurable through VSCode settings. You can customize:

- API endpoints and URLs
- Timeouts and delays
- Cache settings
- Rate limiting
- File size limits
- CDN URLs
- And much more

## Configuration Categories

### 1. API & Network Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.apiTimeout` | integer | 30000 | API request timeout in milliseconds (1000-120000) |
| `standup.apiRetryAttempts` | integer | 3 | Number of retry attempts for failed API calls (0-10) |
| `standup.apiRetryDelay` | integer | 1000 | Delay between API retry attempts in milliseconds (100-10000) |
| `standup.rateLimitRequestsPerMinute` | integer | 60 | Maximum API requests per minute (10-1000) |
| `standup.rateLimitBurstSize` | integer | 10 | Maximum burst size for rate limiting (1-100) |

### 2. Cache & Performance Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.maxCacheSize` | integer | 100 | Maximum number of items to keep in API response cache (10-1000) |
| `standup.cacheTTL` | integer | 300000 | Cache time-to-live in milliseconds (60000-3600000) |
| `standup.dashboardRefreshInterval` | integer | 5000 | Dashboard auto-refresh interval in milliseconds (1000-60000) |

### 3. Data Management Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.historyPageSize` | integer | 20 | Number of items to load per page in history view (5-100) |
| `standup.maxFileSize` | integer | 10485760 | Maximum file size to track in bytes (102400-104857600) |
| `standup.dataRetentionDays` | integer | 30 | Number of days to retain activity data (1-365) |
| `standup.autoCleanupEnabled` | boolean | false | Enable automatic cleanup of old activity data |
| `standup.cleanupIntervalDays` | integer | 7 | Number of days between automatic cleanup runs (1-30) |

### 4. Notification Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.notificationRetentionDays` | integer | 30 | Number of days to retain notifications (1-365) |
| `standup.maxNotificationsPerDay` | integer | 50 | Maximum notifications per day before auto-cleanup (10-500) |

### 5. API URLs

All API endpoints are now configurable:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.githubApiUrl` | string | https://api.github.com | GitHub API base URL |
| `standup.notionApiUrl` | string | https://api.notion.com | Notion API base URL |
| `standup.jiraApiBaseUrl` | string | https://{domain}.atlassian.net | Jira API base URL pattern |
| `standup.slackApiUrl` | string | https://slack.com/api | Slack API base URL |
| `standup.teamsAuthorityUrl` | string | https://login.microsoftonline.com | Microsoft Teams OAuth URL |
| `standup.teamsGraphApiUrl` | string | https://graph.microsoft.com | Microsoft Graph API for Teams |
| `standup.azureDevOpsApiUrl` | string | https://dev.azure.com | Azure DevOps API base URL |
| `standup.harvestApiUrl` | string | https://api.harvestapp.com | Harvest API base URL |
| `standup.togglApiUrl` | string | https://api.track.toggl.com | Toggl API base URL |

### 6. CDN URLs

All CDN URLs for webview libraries are configurable:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.cdnReactUrl` | string | https://unpkg.com/react@18/... | React library CDN URL |
| `standup.cdnReactDOMUrl` | string | https://unpkg.com/react-dom@18/... | React DOM CDN URL |
| `standup.cdnBabelUrl` | string | https://unpkg.com/@babel/... | Babel standalone CDN URL |
| `standup.cdnTailwindUrl` | string | https://cdn.tailwindcss.com | Tailwind CSS CDN URL |
| `standup.cdnMarkedUrl` | string | https://cdn.jsdelivr.net/... | Marked markdown parser CDN URL |
| `standup.cdnChartJsUrl` | string | https://cdn.jsdelivr.net/... | Chart.js library CDN URL |

### 7. Other Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.defaultImagePlaceholder` | string | https://adaptivecards.io/... | Default placeholder image URL |

## How to Configure Settings

### Method 1: VSCode Settings UI

1. Open VSCode Settings (Ctrl+, or Cmd+,)
2. Search for "standup"
3. Modify any setting
4. Changes take effect immediately

### Method 2: settings.json

Open your settings.json and add:

```json
{
  "standup.apiTimeout": 60000,
  "standup.githubApiUrl": "https://your-github-enterprise.com/api/v3",
  "standup.dashboardRefreshInterval": 10000,
  // ... any other settings
}
```

### Method 3: Workspace Settings

Configure settings for a specific workspace:

1. Open your workspace
2. Go to Settings > Workspace
3. Search for "standup"
4. Configure settings that apply only to this workspace

## Configuration Examples

### Example 1: Enterprise GitHub

```json
{
  "standup.githubApiUrl": "https://github.enterprise.com/api/v3",
  "standup.apiTimeout": 60000
}
```

### Example 2: Custom Jira Instance

```json
{
  "standup.jiraApiBaseUrl": "https://jira.company.com",
  "standup.apiRetryAttempts": 5
}
```

### Example 3: Self-Hosted CDNs

```json
{
  "standup.cdnReactUrl": "https://cdn.company.com/react.min.js",
  "standup.cdnReactDOMUrl": "https://cdn.company.com/react-dom.min.js",
  "standup.cdnBabelUrl": "https://cdn.company.com/babel.min.js"
}
```

### Example 4: Performance Tuning

```json
{
  "standup.apiTimeout": 120000,
  "standup.apiRetryAttempts": 5,
  "standup.maxCacheSize": 200,
  "standup.cacheTTL": 600000,
  "standup.dashboardRefreshInterval": 10000
}
```

### Example 5: Reduced Memory Usage

```json
{
  "standup.maxCacheSize": 50,
  "standup.historyPageSize": 10,
  "standup.dataRetentionDays": 14,
  "standup.notificationRetentionDays": 14
}
```

## Migration from Hardcoded Values

If you were previously using the extension with hardcoded values, here's what changed:

### Keyboard Shortcuts

**Old**: Hardcoded shortcuts like `Ctrl+Alt+S` for generating standup
**New**: No default shortcuts. Configure your own in VSCode keyboard shortcuts

See [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) for setup instructions.

### API URLs

**Old**: Hardcoded to public APIs (github.com, notion.com, etc.)
**New**: All URLs are configurable for enterprise/self-hosted instances

### Timeouts & Limits

**Old**: Fixed values like 30-second timeout, 100-item cache
**New**: All values are configurable to match your needs

## Best Practices

1. **Start with defaults**: Use default values initially, then adjust based on your needs
2. **Test changes**: Some settings (like API URLs) require testing to ensure compatibility
3. **Workspace-specific**: Use workspace settings for project-specific configurations
4. **Document changes**: Keep a record of your custom configurations for your team
5. **Performance tuning**: Adjust cache and timeout settings based on your network conditions

## Troubleshooting

### Issue: API calls timing out

**Solution**: Increase `standup.apiTimeout`:

```json
{
  "standup.apiTimeout": 60000
}
```

### Issue: Rate limiting errors

**Solution**: Adjust rate limiting settings:

```json
{
  "standup.rateLimitRequestsPerMinute": 30,
  "standup.apiRetryDelay": 2000
}
```

### Issue: High memory usage

**Solution**: Reduce cache and retention settings:

```json
{
  "standup.maxCacheSize": 50,
  "standup.dataRetentionDays": 14,
  "standup.notificationRetentionDays": 14
}
```

### Issue: Dashboard refreshing too frequently

**Solution**: Increase refresh interval:

```json
{
  "standup.dashboardRefreshInterval": 10000
}
```

## Configuration Service API

For developers, the `ConfigurationService` class provides programmatic access to settings:

```typescript
import { ConfigurationService } from './services/ConfigurationService';

// Get singleton instance
const config = ConfigurationService.getInstance();

// Get all configuration
const appConfig = config.getConfig();

// Get specific API URL
const githubUrl = config.getApiUrl('github');

// Get Jira URL with domain
const jiraUrl = config.getJiraApiUrl('mycompany');

// Get CDN URLs
const cdnUrls = config.getCdnUrls();
```

## See Also

- [KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md) - Configuring keyboard shortcuts
- [README.md](../README.md) - Main project documentation
