# Removed Hardcoded Parts

This document lists all hardcoded values and configurations that have been removed or made configurable in Standup Autobot.

## Changes Made

### 1. Keyboard Shortcuts (REMOVED)
**Status**: ✅ Fully Removed

**Previous Implementation**:
- Hardcoded in `package.json` under `keybindings` section
- Duplicated in `src/utils/KeyboardShortcutManager.ts`

**Changes**:
- Removed all keybindings from `package.json`
- Deleted `KeyboardShortcutManager.ts` file
- Removed all exports and imports of `KeyboardShortcutManager`
- Added `standup.configureShortcuts` command to help users set up their own shortcuts

**Current Implementation**:
- Users configure shortcuts through VSCode's native keyboard shortcuts UI
- Command Palette: `Standup: Configure Keyboard Shortcuts`
- Documentation: [docs/KEYBOARD_SHORTCUTS.md](KEYBOARD_SHORTCUTS.md)

### 2. KeyboardShortcutManager Class (REMOVED)
**File**: `src/utils/KeyboardShortcutManager.ts`

**Status**: ✅ Completely Deleted

**Reason**: 
- Duplicated functionality already available in VSCode
- Maintained hardcoded shortcuts that couldn't be easily customized
- Added unnecessary complexity

### 3. SmartNotificationsService Integration (FIXED)
**Status**: ✅ Now Properly Integrated

**Previous Issue**:
- Service was defined but never instantiated
- Commands `showNotifications` and `markNotificationsRead` were not registered

**Changes**:
- Added service instantiation in `extension.ts`
- Registered notification commands properly
- All notification keybindings now work correctly

## What Remains Configurable

The following values are NOT hardcoded and can be configured through VSCode settings:

### Settings (Already Configurable)
- `standup.triggerTime` - Default: "09:00"
- `standup.activityDuration` - Default: 24 hours
- `standup.dataRetentionDays` - Default: 30 days
- `standup.cleanupIntervalDays` - Default: 7 days
- `standup.autoCleanupEnabled` - Default: false
- `standup.ignorePatterns` - Default: ["**/node_modules/**", "**/.git/**"]
- `standup.aiProvider` - Default: "gemini"
- `standup.fallbackProvider` - Default: "local"
- All API keys, tokens, and connection settings
- UI preferences (locale, themes, etc.)

### Mathematical Constants (Acceptable)
The following are mathematical constants and intentionally not configurable:
- 24 hours in a day
- 60 minutes in an hour
- 7 days in a week
- 1000 milliseconds in a second

### Default Values (Acceptable)
These are sensible defaults that are used when no user data is available:
- Default recommended time: '09:00' (used only when no activity data exists)
- Default activity duration: 24 hours (can be overridden in settings)
- Default retention: 30 days (can be overridden in settings)

## Migration Guide

If you were using the old hardcoded shortcuts, you'll need to set them up manually:

### Old Hardcoded Shortcuts (No Longer Active)
- `Ctrl+Alt+S` → Generate Standup
- `Ctrl+Alt+C` → Copy to Clipboard
- `Ctrl+Alt+E` → Export
- `Ctrl+Alt+H` → Show History
- `Ctrl+Alt+D` → Show Analytics
- `Ctrl+Alt+A` → Data Audit
- `Ctrl+Alt+N` → Show Notifications
- `Ctrl+Alt+,` → Configure Settings

### How to Restore Your Shortcuts
1. Run command: `Standup: Configure Keyboard Shortcuts`
2. Or manually edit `keybindings.json` and add:

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
  },
  {
    "key": "ctrl+alt+,",
    "command": "standup.configureSettings"
  }
]
```

## Benefits

1. **Full User Control**: Users can now configure any shortcuts they want
2. **No Conflicts**: No more conflicts with other extensions or VSCode built-in shortcuts
3. **Flexibility**: Each user can set up shortcuts that match their workflow
4. **Simplicity**: Removed complex shortcut management code
5. **Native Integration**: Uses VSCode's built-in keyboard shortcuts system

## Files Modified

- `package.json` - Removed keybindings section
- `src/extension.ts` - Removed KeyboardShortcutManager, added configureShortcuts command, integrated SmartNotificationsService
- `src/utils/index.ts` - Removed KeyboardShortcutManager export
- `src/utils/KeyboardShortcutManager.ts` - DELETED
- `README.md` - Updated to reference keyboard shortcuts documentation
- `docs/KEYBOARD_SHORTCUTS.md` - NEW: Comprehensive keyboard shortcuts guide
