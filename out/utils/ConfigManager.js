"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ConfigManager {
    /**
     * Retrieves the current configuration, merging global settings with workspace-level .standup.json overrides.
     */
    static getConfig() {
        const globalConfig = vscode.workspace.getConfiguration('standup');
        const config = {
            triggerTime: globalConfig.get('triggerTime') || '09:00',
            activityDuration: globalConfig.get('activityDuration') || 24,
            tone: globalConfig.get('tone') || 'casual',
            customPrompt: globalConfig.get('customPrompt') || '',
            outputLanguage: globalConfig.get('outputLanguage') || 'English',
            ignorePatterns: globalConfig.get('ignorePatterns') || ["**/node_modules/**", "**/.git/**"]
        };
        // Attempt to load workspace override
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const rootPath = workspaceFolders[0].uri.fsPath;
            const projectConfigPath = path.join(rootPath, '.standup.json');
            if (fs.existsSync(projectConfigPath)) {
                try {
                    const projectConfigRaw = fs.readFileSync(projectConfigPath, 'utf8');
                    const projectConfig = JSON.parse(projectConfigRaw);
                    // Merge project-level overrides
                    return { ...config, ...projectConfig };
                }
                catch (error) {
                    console.error('Failed to parse .standup.json:', error);
                }
            }
        }
        return config;
    }
    /**
     * Helper to get a specific config key.
     */
    static get(key) {
        return this.getConfig()[key];
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map