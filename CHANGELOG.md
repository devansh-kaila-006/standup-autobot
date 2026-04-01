# Changelog

All notable changes to the Standup Autobot extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-03-25

### Added
- **Side Panel Dashboard** (NEW!): Activity Bar integration with persistent dashboard
  - Real-time activity feed with live updates (auto-refresh every 5 seconds)
  - Comprehensive command center with all extension commands organized into collapsible sections:
    - Main Actions (Generate Standup, Toggle Tracking, Copy to Clipboard)
    - Views & Analytics (History, Analytics, Data Audit, Preview Data)
    - Export (Clipboard, Notion, Jira, Weekly Digest)
    - Configuration (Settings, API Keys for all providers)
    - Integrations (Test Jira/GitHub/Slack connections)
    - Notifications (View, Mark All Read)
  - Visual tracking status indicator (active/paused) with file count
  - Displays top 5 files, recent commits, and terminal commands
  - Full keyboard navigation and accessibility support
  - Professional design with icons and smooth animations
  - 62 comprehensive tests ensuring reliability
- **Multiple AI Providers**: Support for Google Gemini, OpenAI GPT, Anthropic Claude, and local LLMs (Ollama)
- **Automatic Failover**: Primary and fallback AI provider configuration
- **Advanced Analytics Dashboard**: Interactive charts showing work patterns and trends
- **Activity Heatmap**: Color-coded visualization of last 7/30/90 days
- **Week-over-Week Comparisons**: Track productivity trends over time
- **Sprint Summaries**: AI-generated summaries of development sprints
- **Project Health Reports**: Comprehensive analysis of project activity
- **Jira Integration**: Auto-link commits to issues, update status, fetch sprint data, log work
- **GitHub Issues Integration**: Link activities to issues/PRs, auto-update status
- **Azure DevOps Integration**: Work item tracking, build/deployment integration
- **Slack Integration**: Post standups to channels with rich formatting
- **Microsoft Teams Integration**: Send to teams via webhooks
- **Toggl Integration**: Fetch time entries, timer management
- **Harvest Integration**: Time entry management and project tracking
- **Enhanced Export Options**: Notion, Jira, Slack, Teams, Email, GitHub Gist, GitLab Snippets
- **Custom Export Templates**: 5+ built-in export templates
- **Batch Export**: Export to multiple destinations at once
- **Workflow Automation**: Event-triggered actions with conditional logic
- **Smart Notifications**: Contextual reminders based on time and activity patterns
- **Activity Categorization**: 20+ AI-powered categories with confidence scoring
- **Blocker Detection**: Automatically identify impediments in workflow
- **Predictive Suggestions**: AI suggests standup content based on patterns
- **Goal Tracking**: Set and track goals with progress alerts
- **Weekly Digests**: Automated AI-generated Friday summaries
- **Smart Scheduling**: Contextual reminders at optimal times
- **Multi-Language Support**: 10 locales with proper date/time/number formatting
- **Keyboard Shortcuts**: 12 configurable keyboard shortcuts (added Ctrl+Alt+B for Dashboard)
- **Accessibility Features**: WCAG 2.1 AA compliance, screen reader support, ARIA labels
- **Data Audit Panel**: Preview raw data before AI processing
- **Enhanced Privacy**: Configurable ignore patterns, automatic data cleanup

### Changed
- **Improved Test Coverage**: 654/654 tests passing (100% success rate) - added 62 SidePanelProvider tests
- **Test Suite Expansion**: From 27 to 28 test suites
- **Null Safety**: Comprehensive null checks across all service layers
- **Cache Management**: Proper cache clearing to prevent test pollution
- **Async Operations**: Fixed debounce/throttle timing with proper Jest timer management
- **Terminal Tracking**: Enhanced configuration options (integrated/history/both modes)
- **Git Integration**: Improved hash format validation (40-character hex strings)
- **Type Safety**: Full TypeScript strict mode compliance
- **Enhanced Webview Testing**: Added VS Code `registerWebviewViewProvider` mock for extension tests

### Fixed
- Fixed TeamsService API method calls
- Added comprehensive VS Code API mocks for tests
- Resolved null safety violations in OpenAI, Claude, Jira, and Slack services
- Fixed cache pollution in test suite
- Corrected terminal tracking configuration keys
- Enhanced webview test infrastructure
- Re-enabled and fixed 2 previously skipped git tracker tests
- Fixed all TypeScript compilation errors
- Removed duplicate package.json configuration properties
- Updated version numbering to match documentation

### Technical Improvements
- **Services**: 118/118 tests passing
  - Enhanced null safety in all API services
  - Improved error handling and logging
  - Better configuration management
- **Webviews**: 152/152 tests passing (added 62 SidePanelProvider tests)
  - **NEW**: SidePanelProvider with Activity Bar integration
  - Enhanced accessibility features
  - Improved theme handling (dark/light/high-contrast)
  - Better internationalization support
  - Auto-refresh timer management (5-second intervals)
  - React-based dashboard with live updates
- **Trackers**: 83/83 tests passing
  - Improved activity tracking accuracy
  - Better git commit parsing
  - Enhanced terminal command tracking
- **Utils**: 247/247 tests passing
  - Improved debounce/throttle implementations
  - Better cache management
  - Enhanced error handling
- **Integration**: 25/25 tests passing
  - Improved memory management
  - Better workflow stability
- **Extension**: 29/29 tests passing
  - Enhanced command registration
  - Improved status bar integration
  - Better configuration handling
  - Added SidePanelProvider registration with context key management

## [1.0.0] - 2026-03-15

### Added
- Initial release of Standup Autobot
- Automatic activity tracking (files, git commits, terminal commands)
- AI-powered standup generation using Gemini API
- Multi-destination export (Slack, Teams, Discord, GitHub)
- Basic analytics and productivity insights
- Smart activity categorization
- Memory-efficient data management
- Data retention policies
- Configurable ignore patterns

### Features
- Silent background monitoring
- Privacy-first design (local storage only)
- Custom prompts for AI generation
- Multiple tone options (brief, detailed, casual, formal)
- Standup history management
- Daily digest generation

---

## Versioning Convention

- **Major (X.0.0)**: Breaking changes, major features
- **Minor (0.X.0)**: New features, enhancements
- **Patch (0.0.X)**: Bug fixes, minor improvements

---

**For more information, see [README.md](README.md) or [DEVELOPER.md](DEVELOPER.md)**
