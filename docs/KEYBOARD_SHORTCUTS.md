# Keyboard Shortcuts Reference

## Default Keyboard Shortcuts

The extension uses **Alt+Shift** combinations to avoid conflicts with IDE shortcuts and common applications.

| Command | Windows/Linux | Mac | Description |
|---------|--------------|-----|-------------|
| Generate Standup | `Alt+Shift+S` | `Alt+Shift+S` | Generate daily standup summary |
| Show History | `Alt+Shift+H` | `Alt+Shift+H` | View standup history |
| Copy to Clipboard | `Alt+Shift+C` | `Alt+Shift+C` | Copy last standup to clipboard |
| Data Audit | `Alt+Shift+D` | `Alt+Shift+D` | Preview raw activity data |
| Show Notifications | `Alt+Shift+N` | `Alt+Shift+N` | Show notifications panel |

## Why These Shortcuts?

### Avoided Common Conflicts

**Avoided `Ctrl+Alt+` combinations:**
- `Ctrl+Alt+S` - Used in some IDEs for "Save As"
- `Ctrl+Alt+H` - Used for "Replace in Files" history  
- `Ctrl+Alt+C` - Conflicts with copy operations in some apps
- `Ctrl+Alt+D` - Used in debuggers
- `Ctrl+Alt+N` - Used in some systems for notifications

**Chose `Alt+Shift+` combinations:**
- Much less commonly used by applications
- No conflicts with VS Code default shortcuts
- No conflicts with popular IDEs (IntelliJ, Visual Studio, etc.)
- Easy to remember with mnemonic letters

### Mnemonic Letters

- **S** - **S**tandup (Generate Standup)
- **H** - **H**istory (Show History)
- **C** - **C**opy (Copy to Clipboard)
- **D** - **D**ata (Data Audit)
- **N** - **N**otifications (Show Notifications)

## How to Customize

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
    "key": "alt+shift+s",
    "command": "standup.generateStandup",
    "when": "!standup.paused"
  },
  {
    "key": "alt+shift+c",
    "command": "standup.copyToClipboard"
  },
  {
    "key": "alt+shift+h",
    "command": "standup.showHistory"
  },
  {
    "key": "alt+shift+d",
    "command": "standup.dataAudit"
  },
  {
    "key": "alt+shift+n",
    "command": "standup.showNotifications"
  }
]
```

### Quick Setup Command

Run the `Standup: Configure Keyboard Shortcuts` command from the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`) to open the keyboard shortcuts interface with Standup Autobot commands pre-filtered.

## Conflicts to Avoid

When customizing shortcuts, avoid these common IDE shortcuts:

### File Operations
- `Ctrl+S` / `Cmd+S` - Save
- `Ctrl+N` / `Cmd+N` - New File
- `Ctrl+O` / `Cmd+O` - Open File
- `Ctrl+W` / `Cmd+W` - Close
- `Ctrl+Shift+W` / `Cmd+Shift+W` - Close All

### Editing
- `Ctrl+C` / `Cmd+C` - Copy
- `Ctrl+V` / `Cmd+V` - Paste
- `Ctrl+X` / `Cmd+X` - Cut
- `Ctrl+Z` / `Cmd+Z` - Undo
- `Ctrl+Y` / `Cmd+Y` - Redo
- `Ctrl+A` / `Cmd+A` - Select All
- `Ctrl+F` / `Cmd+F` - Find
- `Ctrl+H` / `Cmd+H` - Replace

### Navigation
- `Ctrl+G` / `Cmd+G` - Go to Line
- `Ctrl+B` / `Cmd+B` - Go to Definition
- `Ctrl+Shift+B` / `Cmd+Shift+B` - Go Back
- `F12` / `Cmd+F12` - Go to Definition
- `Ctrl+I` / `Cmd+I` - Go to Implementation

### Debugging
- `F5` - Start Debugging
- `F9` - Toggle Breakpoint
- `F10` - Step Over
- `F11` - Step Into
- `Shift+F11` - Step Out

### Tabs & Windows
- `Ctrl+Tab` / `Ctrl+` - Next Tab
- `Ctrl+Shift+Tab` / `Ctrl+Shift+` - Previous Tab
- `Ctrl+` / `Cmd+` - Split Editor
- `Ctrl+1` through `Ctrl+9` - Switch to Tab

### Search
- `Ctrl+Shift+F` - Find in Files
- `Ctrl+Shift+H` - Replace in Files
- `Ctrl+P` / `Cmd+P` - Quick Open
- `Ctrl+Shift+P` / `Cmd+Shift+P` - Command Palette

### Terminal
- `Ctrl+`` - Toggle Terminal
- `Ctrl+Shift+`` - Create New Terminal

## Safe Shortcut Combinations

These combinations are generally safe to use:

### Alt+Shift+Letter (Recommended)
- Very rarely used by applications
- Easy to press with one hand
- Our recommended choice

### Ctrl+Shift+Alt+Letter
- Extremely rare conflicts
- Requires 3 keys but very safe
- Use if Alt+Shift doesn't work for you

### Function Keys F6-F8 (without modifiers)
- `F6` - Generally free
- `F7` - Generally free
- `F8` - Generally free
- Note: F9-F12 are often used by debuggers/browsers

## Platform-Specific Notes

### Windows/Linux
- `Alt` key works consistently
- Avoid `Ctrl+Alt` as it's used by system
- `Super+` (Windows key) is generally safe but rarely used by extensions

### macOS
- `Option+Shift` (Alt+Shift) works well
- Avoid `Cmd+Option` (Ctrl+Alt equivalent) as it's used by system
- `Ctrl` on Mac is different from Windows `Ctrl`
- `Cmd` is the primary modifier (like Windows `Ctrl`)

## Example Custom Configurations

### For Developers Who Use IntelliJ IDEs
```
Alt+Shift+S  - Generate Standup (safe in IntelliJ)
Alt+Shift+H  - Show History (safe in IntelliJ)
Alt+Shift+C  - Copy to Clipboard (safe in IntelliJ)
Alt+Shift+D  - Data Audit (safe in IntelliJ)
Alt+Shift+N  - Show Notifications (safe in IntelliJ)
```

### For Developers Who Use Visual Studio
```
Alt+Shift+S  - Generate Standup (safe in VS)
Alt+Shift+H  - Show History (safe in VS)
Alt+Shift+C  - Copy to Clipboard (safe in VS)
Alt+Shift+D  - Data Audit (safe in VS)
Alt+Shift+N  - Show Notifications (safe in VS)
```

### For Maximum Safety (Ctrl+Shift+Alt combinations)
```
Ctrl+Shift+Alt+S  - Generate Standup
Ctrl+Shift+Alt+H  - Show History
Ctrl+Shift+Alt+C  - Copy to Clipboard
Ctrl+Shift+Alt+D  - Data Audit
Ctrl+Shift+Alt+N  - Show Notifications
```

## Testing Your Shortcuts

After setting up shortcuts, test them to ensure they don't conflict:

1. Open a typical project in your IDE
2. Try each shortcut in different contexts (editor, terminal, file explorer)
3. If a shortcut doesn't work, it may be conflicting with another command
4. Check the keyboard shortcuts editor to see conflicts

## Troubleshooting

### Shortcuts Not Working
1. Check if another extension is using the same shortcut
2. Verify the command is registered in VS Code
3. Try a different combination if conflicts persist

### Shortcut Conflicts
1. Open Keyboard Shortcuts editor
2. Search for your shortcut
3. See which commands are using it
4. Choose a different shortcut or disable the conflicting command

## Available Commands

All these commands can have custom shortcuts:

| Command | Description |
|---------|-------------|
| `standup.generateStandup` | Generate daily standup summary |
| `standup.copyToClipboard` | Copy last generated standup to clipboard |
| `standup.export` | Export standup |
| `standup.showHistory` | View standup history |
| `standup.dataAudit` | Open data audit panel |
| `standup.showNotifications` | Show notifications |
| `standup.configureSettings` | Open extension settings |
| `standup.toggleTracking` | Pause/resume activity tracking |

## Feedback

If you find better shortcut combinations that work well across different IDEs, please share them with the community!
