# Standup Autobot - Developer Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Local Development Setup](#local-development-setup)
- [Project Structure](#project-structure)
- [Core Services](#core-services)
- [Testing](#testing)
- [Contributing Guidelines](#contributing-guidelines)
- [Code Style Guide](#code-style-guide)
- [Release Process](#release-process)

## Overview

Standup Autobot is a VS Code extension that automatically tracks developer activity and generates AI-powered daily standup summaries. It uses local LLMs (Gemini) to create intelligent summaries of work completed, in-progress items, and blockers.

**Key Features:**
- Automatic activity tracking (files, git commits, terminal commands)
- AI-powered standup generation using Gemini API
- Multi-destination export (Slack, Teams, Discord, GitHub, etc.)
- Advanced analytics and productivity insights
- Smart activity categorization
- Memory-efficient data management

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VS Code Extension                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Trackers   │  │   Services   │  │   Webviews   │       │
│  │              │  │              │  │              │       │
│  │ • Activity   │──│ • Standup    │──│ • Standup    │       │
│  │ • Git        │  │   Generator  │  │   Card       │       │
│  │ • Terminal   │  │ • Analytics  │  │ • History    │       │
│  │              │  │ • Smart      │  │ • Analytics  │       │
│  │              │  │   Features   │  │ • Data Audit │       │
│  └──────────────┘  │ • Exporter   │  └──────────────┘       │
│                    │ • Memory     │                         │
│  ┌──────────────┐  │   Manager    │  ┌──────────────┐       │
│  │    Utils     │  │              │  │  Providers   │       │
│  │              │  └──────────────┘  │              │       │
│  │ • Logger     │                    │ • Completion │       │
│  │ • Errors     │──┐               ┌─│ • TreeView   │       │
│  │ • Config     │  │               │ │              │       │
│  │ • Cache      │  │  ┌───────┐    │ └──────────────┘       │
│  │ • Debounce   │  └──│ Store │────│                        │
│  │ • Rate Limit │     │       │  ┌──────────────┐           │
│  └──────────────┘     └───────┘  │   Commands   │           │
│                                  │              │           │
│                                  └──────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Activity Tracking**
   - `ActivityTracker` monitors file changes and switches
   - `GitTracker` captures commit history
   - `TerminalTracker` records command execution

2. **Data Storage**
   - All data stored in VS Code's `globalState`
   - Automatic cleanup based on retention policy
   - LRU cache for frequently accessed data

3. **Standup Generation**
   - Data collected from all trackers
   - Sent to Gemini API with structured prompt
   - Response cached for 5 minutes

4. **Export**
   - Support for multiple destinations
   - Custom templates for formatting
   - Batch export to multiple platforms

## Local Development Setup

### Prerequisites

- Node.js 18+ and npm
- VS Code with extension development tools
- Git

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-repo/standup-autobot.git
   cd standup-autobot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Open in VS Code**
   ```bash
   code .
   ```

4. **Build the extension**
   ```bash
   npm run compile
   ```

5. **Run tests**
   ```bash
   npm test
   ```

6. **Debug the extension**
   - Press F5 in VS Code
   - A new Extension Development Host window will open
   - Your extension will be loaded in this window

### Development Workflow

1. **Make changes to source code**
   - Source files are in `src/`
   - Tests are in `src/__tests__/`

2. **Watch mode for automatic compilation**
   ```bash
   npm run watch
   ```

3. **Run tests in watch mode**
   ```bash
   npm run test:watch
   ```

4. **Check code coverage**
   ```bash
   npm run test:coverage
   ```

5. **Run linter**
   ```bash
   npm run lint
   ```

## Project Structure

```
standup-autobot/
├── src/
│   ├── __tests__/              # Test files
│   │   ├── integration/        # Integration tests
│   │   ├── services/           # Service tests
│   │   ├── trackers/           # Tracker tests
│   │   ├── utils/              # Utility tests
│   │   ├── webviews/           # Webview tests
│   │   └── extension.test.ts   # Main extension tests
│   ├── services/               # Business logic services
│   │   ├── AnalyticsService.ts
│   │   ├── DigestService.ts
│   │   ├── EnhancedExporterService.ts
│   │   ├── ExporterService.ts
│   │   ├── HistoryService.ts
│   │   ├── MemoryManager.ts
│   │   ├── SmartFeaturesService.ts
│   │   ├── StandupGenerator.ts
│   │   └── ConfigManager.ts
│   ├── trackers/               # Activity tracking
│   │   ├── activityTracker.ts
│   │   ├── gitTracker.ts
│   │   └── terminalTracker.ts
│   ├── utils/                  # Utility functions
│   │   ├── ActivityAnalyzer.ts
│   │   ├── ConfigValidator.ts
│   │   ├── Logger.ts
│   │   ├── Diagnostics.ts
│   │   ├── errors.ts
│   │   ├── auth.ts
│   │   ├── ignore.ts
│   │   ├── debounce.ts
│   │   ├── rateLimiter.ts
│   │   ├── performanceMonitor.ts
│   │   ├── apiCache.ts
│   │   └── getNonce.ts
│   ├── webviews/               # UI panels
│   │   ├── standupCard.ts
│   │   ├── HistoryPanel.ts
│   │   ├── AnalyticsPanel.ts
│   │   └── DataAuditPanel.ts
│   ├── extension.ts            # Main extension entry point
│   └── types.ts                # TypeScript type definitions
├── package.json                # Extension manifest
├── tsconfig.json              # TypeScript configuration
├── jest.config.js             # Jest test configuration
├── DEVELOPER.md               # This file
└── README.md                  # User documentation
```

## Core Services

### ActivityTracker
**Purpose:** Tracks file editing activity and time spent

**Key Methods:**
- `getTopFiles(limit: number)` - Get most active files
- `reset()` - Clear all tracking data
- `dispose()` - Clean up resources

**Usage:**
```typescript
const tracker = new ActivityTracker(context);
const topFiles = tracker.getTopFiles(5);
```

### GitTracker
**Purpose:** Captures git commit history

**Key Methods:**
- `getRecentCommits(hours?: number)` - Get commits from last N hours
- `dispose()` - Clean up resources

**Usage:**
```typescript
const tracker = new GitTracker();
const commits = await tracker.getRecentCommits(24);
```

### StandupGenerator
**Purpose:** Generates AI-powered standup summaries

**Key Methods:**
- `generateStandup(data, apiKey, settings)` - Generate standup from activity data
- `generateContent(prompt, apiKey)` - Call Gemini API

**Usage:**
```typescript
const generator = new StandupGenerator();
const standup = await generator.generateStandup(
    activityData,
    apiKey,
    { tone: 'casual', outputLanguage: 'English' }
);
```

### AnalyticsService
**Purpose:** Provides productivity insights and trend analysis

**Key Methods:**
- `getProductivityInsights(days)` - Get productivity metrics
- `getTrendData(days)` - Get activity trends
- `generateSprintSummary(length)` - Generate sprint report
- `generateProjectHealthReport()` - Get project health score

**Usage:**
```typescript
const analytics = new AnalyticsService(context);
const insights = await analytics.getProductivityInsights(30);
```

### SmartFeaturesService
**Purpose:** AI-powered activity categorization and predictions

**Key Methods:**
- `categorizeActivity(activity)` - Auto-categorize an activity
- `predictActivities(hours)` - Predict likely activities
- `detectBlockers()` - Identify potential blockers
- `getSmartSchedulingRecommendation()` - Get optimal standup time

**Usage:**
```typescript
const smart = new SmartFeaturesService(context);
const category = smart.categorizeActivity({ type: 'file', filePath: 'src/test.ts' });
```

### EnhancedExporterService
**Purpose:** Multi-destination export functionality

**Key Methods:**
- `exportToSlack(webhookUrl, content)` - Export to Slack
- `exportToTeams(webhookUrl, content)` - Export to Teams
- `exportToDiscord(webhookUrl, content)` - Export to Discord
- `exportToGitHubGist(token, content)` - Create GitHub Gist
- `batchExport(content, destinations)` - Export to multiple destinations

**Usage:**
```typescript
const exporter = new EnhancedExporterService(context);
await exporter.exportToSlack(webhookUrl, standupText);
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.test.ts
```

### Test Organization

- **Utils tests** (`src/__tests__/utils/`): 247 tests
  - Utility functions, helpers, and standalone modules
  - Examples: auth, debounce, rateLimiter, ActivityAnalyzer
- **Services tests** (`src/__tests__/services/`): 118 tests
  - Service layer classes and business logic
  - Examples: standupGenerator, HistoryService, ExporterService
- **Webviews tests** (`src/__tests__/webviews/`): 90 tests
  - UI components and webview panels
  - Examples: standupCard, HistoryPanel, DataAuditPanel
- **Trackers tests** (`src/__tests__/trackers/`): 83 tests
  - Activity tracking, git integration, terminal monitoring
  - Examples: activityTracker, gitTracker, terminalTracker
- **Integration tests** (`src/__tests__/integration/`): 25 tests
  - Cross-component workflows and memory management
  - Examples: workflows, memoryStability
- **Extension tests** (`src/__tests__/extension.test.ts`): 29 tests
  - VS Code extension activation and command registration

### Writing Tests

**Example test structure:**
```typescript
describe('MyService', () => {
    let service: MyService;
    let mockContext: vscode.ExtensionContext;

    beforeEach(() => {
        mockContext = {
            globalState: {
                get: jest.fn(),
                update: jest.fn(),
            },
        } as any;
        service = new MyService(mockContext);
    });

    it('should do something', async () => {
        const result = await service.doSomething();
        expect(result).toBe('expected');
    });
});
```

### Test Coverage

Current test status: **592/592 passing (100% success rate)**

Test breakdown by category:
- **Utils**: 247/247 passing (100%)
- **Services**: 118/118 passing (100%)
- **Webviews**: 90/90 passing (100%)
- **Trackers**: 83/83 passing (100%)
- **Integration**: 25/25 passing (100%)
- **Extension**: 29/29 passing (100%)

Run `npm test` to execute all tests.
Run `npm run test:coverage` to see detailed coverage report.

## Contributing Guidelines

### Before Contributing

1. Check existing issues for your feature/bug
2. Create an issue to discuss your changes
3. Fork the repository
4. Create a feature branch: `git checkout -b feature/my-feature`

### Making Changes

1. **Write code following the style guide**
2. **Add tests for new functionality** (target 80%+ coverage)
3. **Update documentation** (JSDoc comments)
4. **Run tests**: `npm test`
5. **Run linter**: `npm run lint`
6. **Commit with clear message**: "feat: add new feature"

### Commit Message Format

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

Examples:
```
feat: add Slack integration for standup export
fix: resolve memory leak in activity tracker
docs: update API documentation for AnalyticsService
```

### Pull Request Process

1. Update your branch: `git pull upstream main`
2. Push to your fork: `git push origin feature/my-feature`
3. Create pull request on GitHub
4. Fill PR template with description and testing notes
5. Wait for code review

## Code Style Guide

### TypeScript

- Use TypeScript strict mode
- Prefer `const` over `let` when possible
- Use arrow functions for callbacks
- Use template literals for strings
- Avoid `any` type - use proper types or `unknown`

### Naming Conventions

- **Classes**: PascalCase (`ActivityTracker`)
- **Functions/Methods**: camelCase (`getTopFiles`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_HISTORY_SIZE`)
- **Private members**: Prefix with underscore (`_privateField`)

### File Organization

- One class per file
- File name matches class name (PascalCase)
- Group related functionality in folders
- Use barrel exports (`index.ts`) for clean imports

### Error Handling

- Use custom error classes from `utils/errors.ts`
- Always handle errors with try-catch
- Log errors with context using Logger
- Provide user-friendly error messages

```typescript
import { StandupError } from './utils/errors';

try {
    await riskyOperation();
} catch (error) {
    logger.error('Operation failed', error);
    throw new StandupError('Failed to complete operation', 'OP_FAILED', { context });
}
```

### Performance Considerations

- Use debouncing for frequent events
- Implement rate limiting for API calls
- Cache expensive operations
- Lazy load large datasets
- Clean up resources in dispose()

## Release Process

### Version Bumping

1. Update `version` in `package.json`
2. Update changelog in `CHANGELOG.md`
3. Commit changes: `chore: bump version to X.X.X`

### Building Release

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package extension
vsce package
```

### Publishing to Marketplace

1. Ensure all tests pass
2. Update documentation
3. Create git tag: `git tag vX.X.X`
4. Push tag: `git push origin vX.X.X`
5. Publish to VS Code Marketplace:
   ```bash
   vsce publish
   ```

## Troubleshooting

### Common Issues

**Issue:** Tests failing with TypeScript errors
**Solution:** Run `npm run compile` to check for compilation errors

**Issue:** Extension not loading in development host
**Solution:** Check Output panel for error messages, ensure `npm run compile` has been run

**Issue:** Git commands not working
**Solution:** Ensure git is in your PATH and repository is initialized

### Debug Mode

Enable debug logging:
```typescript
import { Logger } from './utils/Logger';

const logger = new Logger();
logger.setDebugEnabled(true);
```

### Getting Help

- Check existing issues on GitHub
- Read documentation in `docs/` folder
- Ask questions in GitHub Discussions
- Check VS Code Extension API docs

## Additional Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [Gemini API Documentation](https://ai.google.dev/docs)

---

**Last Updated:** 2026-03-24
**Version:** 1.0.0
