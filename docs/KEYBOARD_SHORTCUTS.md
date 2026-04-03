# Keyboard Shortcuts Configuration

Standup Autobot supports customizable keyboard shortcuts for all major commands. By default, no shortcuts are configured - you can set up your own keybindings to match your workflow.

## Available Commands

You can configure keyboard shortcuts for the following commands:

| Command | Description |
|---------|-------------|
| `standup.generateStandup` | Generate daily standup summary |
| `standup.copyToClipboard` | Copy last generated standup to clipboard |
| `standup.export` | Export standup (opens export menu) |
| `standup.showHistory` | View standup history |
| `standup.showAnalytics` | View analytics dashboard |
| `standup.dataAudit` | Open data audit panel |
| `standup.showNotifications` | Show notifications |
| `standup.configureSettings` | Open extension settings |
| `standup.toggleTracking` | Pause/resume activity tracking |

## How to Configure Shortcuts

### Method 1: Using VSCode Keyboard Shortcuts UI

1. Open VSCode
2. Press `Ctrl+K, Ctrl+S` (or `Cmd+K, Cmd+S` on Mac) to open Keyboard Shortcuts
3. Search for "standup" to see all available Standup Autobot commands
4. Click the **+** icon next to any command
5. Press your desired key combination
6. Click **Enter** to save

### Method 2: Using keybindings.json

1. Open VSCode Settings
2. Search for "keyboard shortcuts"
3. Click on **"Open Keyboard Shortcuts (JSON)"**
4. Add your custom keybindings:

```json
[
  {
    "key": "ctrl+alt+s",
    "command": "standup.generateStandup",
    "when": "!standup.paused"
  },
  {
    "key": "ctrl+alt+c",
    "command": "standup.copyToClipboard"
  },
  {
    "key": "ctrl+alt+h",
    "command": "standup.showHistory"
  },
  {
    "key": "ctrl+alt+d",
    "command": "standup.showAnalytics"
  },
  {
    "key": "ctrl+alt+a",
    "command": "standup.dataAudit"
  },
  {
    "key": "ctrl+alt+n",
    "command": "standup.showNotifications"
  }
]
```

### Quick Setup Command

Run the `Standup: Configure Keyboard Shortcuts` command from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) to open the keyboard shortcuts interface with Standup Autobot commands pre-filtered.

## Tips

- Use key combinations that don't conflict with VSCode's built-in shortcuts or other extensions
- On Windows/Linux, use `ctrl`, on Mac use `cmd` for the primary modifier
- You can use the `when` clause to make shortcuts context-sensitive (e.g., only when tracking is not paused)
- To remove a shortcut, open Keyboard Shortcuts UI and click the trash icon next to the binding

## Default Suggestions

While no shortcuts are configured by default, here are some popular combinations used by other users:

- `Ctrl+Alt+S` - Generate standup
- `Ctrl+Alt+C` - Copy to clipboard
- `Ctrl+Alt+H` - Show history
- `Ctrl+Alt+D` - Show analytics
- `Ctrl+Alt+A` - Data audit

Feel free to use these or create your own!
