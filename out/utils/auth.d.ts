import * as vscode from 'vscode';
/**
 * Prompts the user for an API key and saves it to SecretStorage.
 */
export declare function setApiKeyCommand(context: vscode.ExtensionContext): Promise<string | undefined>;
/**
 * Retrieves the API key from SecretStorage.
 */
export declare function getApiKey(context: vscode.ExtensionContext): Promise<string | undefined>;
/**
 * Ensures an API key is present. If not, prompts the user to set one.
 */
export declare function ensureApiKey(context: vscode.ExtensionContext): Promise<string | undefined>;
//# sourceMappingURL=auth.d.ts.map