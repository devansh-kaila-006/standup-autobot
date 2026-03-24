import * as vscode from 'vscode';
import { setApiKeyCommand, getApiKey, ensureApiKey } from '../../utils/auth';

// Mock vscode module
jest.mock('vscode', () => {
    const mockSecrets = {
        store: jest.fn(),
        get: jest.fn(),
        delete: jest.fn(),
        onDidChange: jest.fn(),
    };

    const mockContext = {
        secrets: mockSecrets,
        globalState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: [],
        },
        workspaceState: {
            get: jest.fn(),
            update: jest.fn(),
            keys: [],
        },
        extensionPath: '',
        storagePath: '',
        globalStoragePath: '',
        logPath: '',
        extensionUri: null as any,
        environmentVariableCollection: {} as any,
        asAbsolutePath: (path: string) => path,
        executeCommand: jest.fn(),
    };

    return {
        window: {
            showInputBox: jest.fn(),
            showInformationMessage: jest.fn(),
            showWarningMessage: jest.fn(),
        },
        ExtensionContext: jest.fn(),
        secrets: mockSecrets,
    };
});

describe('auth', () => {
    let mockContext: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Create a mock context
        mockContext = {
            secrets: {
                store: jest.fn(),
                get: jest.fn(),
            },
        };
    });

    describe('setApiKeyCommand', () => {
        it('should save API key when user provides valid input', async () => {
            const testApiKey = 'test-api-key-123';
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(testApiKey);

            const result = await setApiKeyCommand(mockContext);

            expect(result).toBe(testApiKey);
            expect(mockContext.secrets.store).toHaveBeenCalledWith('standup.autobot.apiKey', testApiKey);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('API Key saved securely! 🛡️');
        });

        it('should return undefined when user cancels input', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            const result = await setApiKeyCommand(mockContext);

            expect(result).toBeUndefined();
            expect(mockContext.secrets.store).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });

        it('should validate input and reject empty strings', async () => {
            const emptyValue = '   ';
            (vscode.window.showInputBox as jest.Mock).mockImplementation((options) => {
                if (options.validateInput) {
                    const validationResult = options.validateInput(emptyValue);
                    expect(validationResult).toBe('API Key cannot be empty');
                }
                return Promise.resolve(undefined);
            });

            await setApiKeyCommand(mockContext);

            expect(mockContext.secrets.store).not.toHaveBeenCalled();
        });

        it('should accept valid non-empty input', async () => {
            const testApiKey = 'sk-test-key-12345';
            (vscode.window.showInputBox as jest.Mock).mockImplementation((options) => {
                if (options.validateInput) {
                    const validationResult = options.validateInput(testApiKey);
                    expect(validationResult).toBeNull();
                }
                return Promise.resolve(testApiKey);
            });

            await setApiKeyCommand(mockContext);

            expect(mockContext.secrets.store).toHaveBeenCalled();
        });

        it('should configure input box with correct options', async () => {
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue('test-key');

            await setApiKeyCommand(mockContext);

            expect(vscode.window.showInputBox).toHaveBeenCalledWith(
                expect.objectContaining({
                    prompt: 'Enter your Google Gemini API Key',
                    password: true,
                    ignoreFocusOut: true,
                    placeHolder: 'sk-...',
                    validateInput: expect.any(Function),
                })
            );
        });
    });

    describe('getApiKey', () => {
        it('should return API key when it exists', async () => {
            const testApiKey = 'stored-api-key';
            mockContext.secrets.get.mockResolvedValue(testApiKey);

            const result = await getApiKey(mockContext);

            expect(result).toBe(testApiKey);
            expect(mockContext.secrets.get).toHaveBeenCalledWith('standup.autobot.apiKey');
        });

        it('should return undefined when API key does not exist', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);

            const result = await getApiKey(mockContext);

            expect(result).toBeUndefined();
        });

        it('should return undefined when secrets storage returns null', async () => {
            mockContext.secrets.get.mockResolvedValue(null);

            const result = await getApiKey(mockContext);

            expect(result).toBeNull();
        });
    });

    describe('ensureApiKey', () => {
        it('should return existing API key without prompting', async () => {
            const existingKey = 'existing-api-key';
            mockContext.secrets.get.mockResolvedValue(existingKey);

            const result = await ensureApiKey(mockContext);

            expect(result).toBe(existingKey);
            expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        });

        it('should prompt user when API key is missing and user clicks Set API Key', async () => {
            const newKey = 'new-api-key';
            mockContext.secrets.get.mockResolvedValue(undefined);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Set API Key');
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(newKey);

            const result = await ensureApiKey(mockContext);

            expect(result).toBe(newKey);
            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
                '⚠️ Standup Autobot needs an API Key to generate summaries.',
                'Set API Key',
                'Cancel'
            );
            expect(mockContext.secrets.store).toHaveBeenCalledWith('standup.autobot.apiKey', newKey);
        });

        it('should return undefined when API key is missing and user cancels', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Cancel');

            const result = await ensureApiKey(mockContext);

            expect(result).toBeUndefined();
            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
        });

        it('should return undefined when API key is missing and user dismisses warning', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue(undefined);

            const result = await ensureApiKey(mockContext);

            expect(result).toBeUndefined();
            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
        });

        it('should return undefined when user cancels the input box', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            (vscode.window.showWarningMessage as jest.Mock).mockResolvedValue('Set API Key');
            (vscode.window.showInputBox as jest.Mock).mockResolvedValue(undefined);

            const result = await ensureApiKey(mockContext);

            expect(result).toBeUndefined();
            expect(mockContext.secrets.store).not.toHaveBeenCalled();
        });
    });
});
