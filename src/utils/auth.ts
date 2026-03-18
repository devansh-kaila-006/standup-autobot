import * as vscode from 'vscode';

const SECRET_STORAGE_KEY = 'standup.autobot.apiKey';

/**
 * Prompts the user for an API key and saves it to SecretStorage.
 */
export async function setApiKeyCommand(context: vscode.ExtensionContext) {
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
        vscode.window.showInformationMessage('API Key saved securely! 🛡️');
        return input;
    }
    return undefined;
}

/**
 * Retrieves the API key from SecretStorage.
 */
export async function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    return await context.secrets.get(SECRET_STORAGE_KEY);
}

/**
 * Ensures an API key is present. If not, prompts the user to set one.
 */
export async function ensureApiKey(context: vscode.ExtensionContext): Promise<string | undefined> {
    const key = await getApiKey(context);

    if (key) {
        return key;
    }

    const choice = await vscode.window.showWarningMessage(
        '⚠️ Standup Autobot needs an API Key to generate summaries.',
        'Set API Key',
        'Cancel'
    );

    if (choice === 'Set API Key') {
        return await setApiKeyCommand(context);
    }

    return undefined;
}
