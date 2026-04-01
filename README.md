# Standup Autobot

**Standup Autobot** is an enterprise-grade VS Code extension that silently tracks your developer activity and generates concise, professional daily standup summaries using advanced AI. No more struggling to remember what you did yesterday—let AI synthesize your work for you.

## 🌟 Key Features

### 🎛️ Side Panel Dashboard (NEW!)
- **Activity Bar Integration**: Quick access dashboard in VS Code's Activity Bar
- **Real-Time Activity Feed**: See your top files, recent commits, and terminal commands update live
- **Comprehensive Command Center**: All extension commands organized into collapsible sections:
  - **Main Actions**: Generate Standup, Toggle Tracking, Copy to Clipboard
  - **Views & Analytics**: History, Analytics, Data Audit, Preview Raw Data
  - **Export**: Clipboard, Notion, Jira, Weekly Digest
  - **Configuration**: Settings, API Keys (Gemini, OpenAI, Claude, Notion, Jira)
  - **Integrations**: Test connections for Jira, GitHub, Slack
  - **Notifications**: View notifications, mark all as read
- **Tracking Status**: Visual indicator showing tracking status (active/paused) with file count
- **Auto-Refresh**: Dashboard updates every 5 seconds with latest activity data
- **Persistent UI**: Always available without blocking your workspace
- **Keyboard Accessible**: Full keyboard navigation support
- **Professional Design**: Clean, modern interface with icons and smooth animations

### 🕵️ Intelligent Activity Tracking
- **Silent Background Monitoring**: Automatically records file edits, line changes, time spent, Git commits, and terminal commands
- **Smart Categorization**: Auto-tags activities as bugfix, feature, chore, refactor, documentation, or test
- **Multi-Source Tracking**: File changes, Git history, terminal commands, and workspace events
- **Privacy-First**: Configurable ignore patterns (`node_modules`, `.git`, etc.) keep your data private
- **Data Retention**: Automatic cleanup with configurable retention periods (default: 30 days)

### 🤖 Multiple AI Providers
- **Google Gemini**: Gemini Flash/Pro models for fast, intelligent summaries
- **OpenAI GPT**: GPT-4 and GPT-3.5 Turbo support
- **Anthropic Claude**: Claude 3.5 Sonnet integration
- **Local LLM**: Ollama support for privacy-focused, offline AI processing
- **Automatic Failover**: Primary and fallback provider configuration
- **AI-Powered Insights**: Productivity recommendations, work pattern analysis, and burnout detection

### 📊 Advanced Analytics
- **Productivity Dashboard**: Interactive charts showing your work patterns and trends
- **Activity Heatmap**: Color-coded visualization of your last 7/30/90 days
- **Week-over-Week Comparisons**: Track your productivity trends over time
- **Sprint Summaries**: AI-generated summaries of your development sprints
- **Project Health Reports**: Comprehensive analysis of your project activity
- **Custom Time Ranges**: Analyze any time period with flexible filters
- **Export to CSV**: Download your analytics data for further analysis

### 🔌 Extensive Integrations

#### Issue Trackers
- **Jira**: Auto-link commits to issues, update status, fetch sprint data, log work
- **GitHub Issues**: Link activities to issues/PRs, auto-update status, track pull requests
- **Azure DevOps**: Work item tracking, build/deployment integration, full REST API

#### Communication Platforms
- **Slack**: Post standups to channels, rich formatting with Adaptive Cards, webhooks
- **Microsoft Teams**: Channel posting, Graph API integration, adaptive cards

#### Time Tracking
- **Toggl**: Fetch time entries, timer management, project tracking
- **Harvest**: Time entry management, project tracking, task categorization

### 📤 Flexible Export Options
- **Notion**: Direct export to Notion databases
- **Jira**: Create issues and add comments
- **Slack**: Post to channels via webhooks or bot
- **Microsoft Teams**: Send to teams via webhooks
- **Email**: Email standups directly
- **GitHub Gist**: Create public/private gists
- **GitLab Snippets**: Export to GitLab
- **Custom Templates**: 5+ built-in export templates
- **Batch Export**: Export to multiple destinations at once

### 🎨 Modern UI & Accessibility
- **Dark/Light/High-Contrast Themes**: Automatic VS Code theme detection
- **Responsive Design**: Clean, modern interface that works on all screen sizes
- **WCAG 2.1 AA Compliant**: Full accessibility support with keyboard navigation
- **Screen Reader Support**: ARIA labels, semantic HTML, and landmark navigation
- **11 Keyboard Shortcuts**: All features accessible via keyboard
- **Custom Shortcuts**: Configure your own keybindings
- **Multi-Language Support**: 10 locales with proper date/time/number formatting

### 🔄 Workflow Automation
- **Event-Triggered Actions**: Automate tasks based on events (standup generated, commit pushed, etc.)
- **Custom Scripts**: Write JavaScript automation scripts with full context access
- **Conditional Logic**: Time-based, count-based, and expression conditions
- **8 Action Types**: Notifications, commands, webhooks, standup operations, and more
- **Smart Notifications**: Contextual reminders based on time and activity patterns

### 📝 Smart Features
- **Activity Categorization**: 20+ AI-powered categories with confidence scoring
- **Blocker Detection**: Automatically identify impediments in your workflow
- **Predictive Suggestions**: AI suggests standup content based on your patterns
- **Goal Tracking**: Set and track goals with progress alerts
- **Weekly Digests**: Automated AI-generated Friday summaries
- **Smart Scheduling**: Contextual reminders at optimal times

## 🚀 Getting Started

### 1. Installation
Install the extension from the VS Code Marketplace or search for "Standup Autobot" in VS Code extensions.

### 2. Initial Setup

#### Set Your AI Provider
Choose from multiple AI providers:

```bash
# For Google Gemini
Standup: Set Gemini API Key

# For OpenAI
Standup: Set OpenAI API Key

# For Anthropic Claude
Standup: Set Claude API Key

# For Local LLM (Ollama)
# Install Ollama and run: ollama pull llama2
# Configure base URL in settings
```

#### Configure Integrations (Optional)
```bash
# Jira
Standup: Set Jira Domain & API Token

# GitHub
# Configure via settings (uses git remote)

# Slack
Standup: Set Slack Webhook URL

# Microsoft Teams
Standup: Set Teams Webhook URL

# Toggl
Standup: Set Toggl API Key

# Harvest
Standup: Set Harvest Account ID & Access Token
```

### 3. Project Configuration
Create a `.standup.json` in your workspace root for project-specific settings:

```json
{
  "tone": "detailed",
  "triggerTime": "10:00",
  "activityDuration": 24,
  "customPrompt": "Focus on backend API development and database migrations.",
  "ignorePatterns": [
    "**/node_modules/**",
    "**/dist/**",
    "**/*.test.ts"
  ],
  "aiProvider": "gemini",
  "fallbackProvider": "local",
  "integrations": {
    "jira": {
      "projectKey": "PROJ"
    }
  }
}
```

## ⌨️ Keyboard Shortcuts

| Shortcut | Command |
|----------|---------|
| `Ctrl+Alt+S` | Generate Standup |
| `Ctrl+Alt+C` | Copy to Clipboard |
| `Ctrl+Alt+E` | Export Standup |
| `Ctrl+Alt+H` | Show History |
| `Ctrl+Alt+A` | Show Analytics |
| `Ctrl+Alt+D` | Data Audit Panel |
| `Ctrl+Alt+N` | Show Notifications |
| `Ctrl+Alt+B` | Show Dashboard (NEW!) |
| `Ctrl+Alt+R` | Mark Notifications Read |
| `Ctrl+Alt+T` | Toggle Timer |
| `Ctrl+Alt+,` | Open Settings |

*Mac users: Use `Cmd` instead of `Ctrl`*

## 📋 Commands

### Standup Commands
- **Standup: Generate Standup** - Generate your daily standup
- **Standup: Copy to Clipboard** - Copy last standup to clipboard
- **Standup: Export** - Export standup to various formats

### View Commands
- **Standup: Show History** - View standup history and trends
- **Standup: Show Analytics** - Open productivity dashboard
- **Standup: Data Audit** - Preview raw data before AI processing
- **Standup: Show Dashboard** - Open Activity Bar side panel (NEW!)

### Settings Commands
- **Standup: Set Gemini API Key** - Configure Google Gemini
- **Standup: Set OpenAI API Key** - Configure OpenAI
- **Standup: Set Claude API Key** - Configure Anthropic Claude
- **Standup: Configure Settings** - Open settings editor

### Integration Commands
- **Standup: Test Jira Connection** - Verify Jira integration
- **Standup: Test GitHub Connection** - Verify GitHub integration
- **Standup: Test Slack Connection** - Verify Slack webhook

## ⚙️ Configuration

### Global Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `standup.tone` | string | `"casual"` | Standup tone: `brief`, `detailed`, `casual`, `formal` |
| `standup.triggerTime` | string | `"09:00"` | Daily standup trigger time (HH:MM) |
| `standup.activityDuration` | number | `24` | Hours of history to include |
| `standup.aiProvider` | string | `"gemini"` | AI provider: `gemini`, `openai`, `claude`, `local` |
| `standup.fallbackProvider` | string | `"local"` | Fallback AI provider |
| `standup.enableTracking` | boolean | `true` | Enable/disable activity tracking |
| `standup.dataRetentionDays` | number | `30` | Days to keep activity data |
| `standup.language` | string | `"en"` | Interface language (10 locales supported) |

### Integration Settings

#### Jira
- `standup.jiraDomain` - Your Jira domain (e.g., `company.atlassian.net`)
- `standup.jiraProjectKey` - Default project key

#### OpenAI
- `standup.openaiModel` - Model to use (default: `gpt-4`)
- `standup.openaiTemperature` - Response creativity (0.0-1.0)
- `standup.openaiMaxTokens` - Maximum response length

#### Anthropic Claude
- `standup.claudeModel` - Model to use (default: `claude-3-5-sonnet-20241022`)
- `standup.claudeTemperature` - Response creativity
- `standup.claudeMaxTokens` - Maximum response length

#### Local LLM (Ollama)
- `standup.localLlmBaseUrl` - Ollama server URL (default: `http://localhost:11434`)
- `standup.localLlmModel` - Model to use (default: `llama2`)

## 🌍 Supported Languages

- English (en)
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Simplified Chinese (zh-CN)
- Traditional Chinese (zh-TW)
- Portuguese Brazil (pt-BR)
- Russian (ru)
- Arabic (ar)

## 🔒 Privacy & Security

- **Local Storage**: All activity data stored locally in VS Code's secure storage
- **No Telemetry**: Zero telemetry or data collection
- **API Key Security**: All API keys stored in VS Code's secure secrets storage
- **Data Preview**: Preview exactly what data is sent to AI before processing
- **Ignore Patterns**: Exclude sensitive files and directories from tracking
- **Data Retention**: Automatic cleanup of old data
- **Privacy-First Local AI**: Use Ollama for completely offline, private AI processing

## 📊 Analytics Features

### Productivity Insights
- **Productivity Score**: 0-100 score based on your activity patterns
- **Peak Hours**: Discover when you're most productive
- **Activity Distribution**: See how you spend your time
- **Trend Analysis**: Track productivity trends over time

### Work Patterns
- **Activity Types**: Breakdown by feature, bugfix, refactor, etc.
- **Commit Patterns**: Git commit frequency and timing
- **File Focus**: Which files you work on most
- **Session Analysis**: Deep dive into your work sessions

### Burnout Prevention
- **Risk Assessment**: Low/medium/high burnout risk detection
- **Overtime Tracking**: Monitor excessive work hours
- **Weekend Work**: Track weekend work frequency
- **Mitigation Suggestions**: AI-powered recommendations to prevent burnout

## 🎯 Advanced Features

### Workflow Automation
Create powerful automations:
```javascript
// Example: Auto-post to Slack when standup generated
{
  "name": "Post to Slack on Standup",
  "trigger": {
    "type": "event",
    "eventType": "standup.generated"
  },
  "actions": [
    {
      "type": "webhook",
      "params": {
        "url": "YOUR_SLACK_WEBHOOK_URL"
      }
    }
  ]
}
```

### Smart Notifications
- **Contextual Reminders**: Time-based reminders for standup
- **Activity Summaries**: Daily activity summaries
- **Goal Progress**: Track and notify on goal completion
- **Blocker Alerts**: Get notified when blockers are detected
- **Multi-Channel**: Notifications in VS Code, Slack, Teams

### Custom Export Templates
Built-in templates:
- **Markdown**: Clean markdown format
- **HTML**: Styled HTML email format
- **JSON**: Raw data export
- **Plain Text**: Simple text format
- **Jira**: Jira-formatted text
- **Slack**: Slack message format
- **Teams**: Teams adaptive card format

## 🧪 Testing & Quality

- **654 Passing Tests**: 100% test success rate (654/654)
- **28 Test Suites**: All passing with comprehensive coverage
- **0 Skipped Tests**: All tests actively running
- **Test Categories**:
  - Utils: 247/247 passing
  - Services: 118/118 passing
  - Webviews: 152/152 passing (includes 62 new SidePanelProvider tests)
  - Trackers: 83/83 passing
  - Integration: 25/25 passing
  - Extension: 29/29 passing
- **TypeScript Strict Mode**: Type-safe codebase
- **ESLint & Prettier**: Code quality and formatting
- **CI/CD Pipeline**: Automated testing and releases

### Recent Test Improvements (March 2026)

**Side Panel Dashboard (NEW!):**
- Added 62 comprehensive tests for SidePanelProvider
- Tests cover initialization, data fetching, message handling (all 20+ commands), auto-refresh
- HTML generation, theme changes, accessibility, and disposal all tested
- 100% test coverage for new dashboard functionality

**Comprehensive Test Suite Enhancement:**
- Fixed all 123 previously failing tests across all categories
- Re-enabled and fixed 2 previously skipped git tracker tests
- Achieved 100% test success rate (654/654 passing)
- Improved cache management to prevent test pollution
- Enhanced null safety across all service layers

**Key Fixes Applied:**
- **Extension Integration**: Fixed TeamsService API method calls, added comprehensive VS Code API mocks
- **Service Layer**: Added null safety checks in OpenAI, Claude, Jira, and Slack services
- **Cache Management**: Implemented proper cache clearing in test setup to prevent cross-test pollution
- **Async Operations**: Fixed debounce/throttle timing issues with proper Jest timer management
- **Terminal Tracking**: Corrected configuration keys for terminal tracking mode
- **Git Integration**: Fixed git hash format validation (40-character hex strings)
- **Test Infrastructure**: Enhanced VS Code workspace and environment mocks for webview tests
- **Type Safety**: Resolved all TypeScript strict mode violations in services

## 📚 Documentation

- **[DEVELOPER.md](DEVELOPER.md)**: Developer guide and architecture
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)**: Common issues and solutions
- **[FAQ.md](FAQ.md)**: Frequently asked questions
- **[improvements.md](improvements.md)**: Roadmap and project status

## 🤝 Contributing

We welcome contributions! Please see [DEVELOPER.md](DEVELOPER.md) for guidelines.

## 📜 License

**Standup Autobot** is a commercial product. A valid license or subscription is required for use. See the [LICENSE](LICENSE) file for the full text.

## 🙏 Acknowledgments

Built with:
- **VS Code Extension API**
- **Google Gemini** / **OpenAI** / **Anthropic Claude** / **Ollama**
- **Chart.js** for visualizations
- **Jest** for testing

---

**Version**: 2.0.0 | **Last Updated**: March 25, 2026 | **Status**: Production Ready ✅

## 🎉 What's New in v2.0.0

### Side Panel Dashboard
- **NEW**: Activity Bar integration with persistent dashboard
- **NEW**: Real-time activity feed with live updates
- **NEW**: Quick action buttons for common tasks
- **NEW**: Visual tracking status indicator
- **NEW**: Auto-refresh every 5 seconds
- **NEW**: 45 new tests ensuring dashboard reliability
