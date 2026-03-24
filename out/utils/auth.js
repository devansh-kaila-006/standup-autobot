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
exports.setApiKeyCommand = setApiKeyCommand;
exports.getApiKey = getApiKey;
exports.ensureApiKey = ensureApiKey;
const vscode = __importStar(require("vscode"));
const iconUtils_1 = require("./iconUtils");
const SECRET_STORAGE_KEY = 'standup.autobot.apiKey';
/**
 * Prompts the user for an API key and saves it to SecretStorage.
 */
async function setApiKeyCommand(context) {
    const input = await vscode.window.showInputBox({
        prompt: 'Enter your Google Gemini API Key',
        password: true,
        ignoreFocusOut: true,
        placeHolder: 'sk-...',
        validateInput: (value) => {
            if (!value || value.trim().length === 0) {
                return 'API Key cannot be empty';
            }
            return null;
        }
    });
    if (input) {
        await context.secrets.store(SECRET_STORAGE_KEY, input);
        vscode.window.showInformationMessage(`API Key saved securely! ${iconUtils_1.Icons.shield()}`);
        return input;
    }
    return undefined;
}
/**
 * Retrieves the API key from SecretStorage.
 */
async function getApiKey(context) {
    return await context.secrets.get(SECRET_STORAGE_KEY);
}
/**
 * Ensures an API key is present. If not, prompts the user to set one.
 */
async function ensureApiKey(context) {
    const key = await getApiKey(context);
    if (key) {
        return key;
    }
    const choice = await vscode.window.showWarningMessage(`${iconUtils_1.Icons.warning()} Standup Autobot needs an API Key to generate summaries.`, 'Set API Key', 'Cancel');
    if (choice === 'Set API Key') {
        return await setApiKeyCommand(context);
    }
    return undefined;
}
//# sourceMappingURL=auth.js.map