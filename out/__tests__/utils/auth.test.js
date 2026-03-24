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
const vscode = __importStar(require("vscode"));
const auth_1 = require("../../utils/auth");
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
        extensionUri: null,
        environmentVariableCollection: {},
        asAbsolutePath: (path) => path,
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
    let mockContext;
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
            vscode.window.showInputBox.mockResolvedValue(testApiKey);
            const result = await (0, auth_1.setApiKeyCommand)(mockContext);
            expect(result).toBe(testApiKey);
            expect(mockContext.secrets.store).toHaveBeenCalledWith('standup.autobot.apiKey', testApiKey);
            expect(vscode.window.showInformationMessage).toHaveBeenCalledWith('API Key saved securely! 🛡️');
        });
        it('should return undefined when user cancels input', async () => {
            vscode.window.showInputBox.mockResolvedValue(undefined);
            const result = await (0, auth_1.setApiKeyCommand)(mockContext);
            expect(result).toBeUndefined();
            expect(mockContext.secrets.store).not.toHaveBeenCalled();
            expect(vscode.window.showInformationMessage).not.toHaveBeenCalled();
        });
        it('should validate input and reject empty strings', async () => {
            const emptyValue = '   ';
            vscode.window.showInputBox.mockImplementation((options) => {
                if (options.validateInput) {
                    const validationResult = options.validateInput(emptyValue);
                    expect(validationResult).toBe('API Key cannot be empty');
                }
                return Promise.resolve(undefined);
            });
            await (0, auth_1.setApiKeyCommand)(mockContext);
            expect(mockContext.secrets.store).not.toHaveBeenCalled();
        });
        it('should accept valid non-empty input', async () => {
            const testApiKey = 'sk-test-key-12345';
            vscode.window.showInputBox.mockImplementation((options) => {
                if (options.validateInput) {
                    const validationResult = options.validateInput(testApiKey);
                    expect(validationResult).toBeNull();
                }
                return Promise.resolve(testApiKey);
            });
            await (0, auth_1.setApiKeyCommand)(mockContext);
            expect(mockContext.secrets.store).toHaveBeenCalled();
        });
        it('should configure input box with correct options', async () => {
            vscode.window.showInputBox.mockResolvedValue('test-key');
            await (0, auth_1.setApiKeyCommand)(mockContext);
            expect(vscode.window.showInputBox).toHaveBeenCalledWith(expect.objectContaining({
                prompt: 'Enter your Google Gemini API Key',
                password: true,
                ignoreFocusOut: true,
                placeHolder: 'sk-...',
                validateInput: expect.any(Function),
            }));
        });
    });
    describe('getApiKey', () => {
        it('should return API key when it exists', async () => {
            const testApiKey = 'stored-api-key';
            mockContext.secrets.get.mockResolvedValue(testApiKey);
            const result = await (0, auth_1.getApiKey)(mockContext);
            expect(result).toBe(testApiKey);
            expect(mockContext.secrets.get).toHaveBeenCalledWith('standup.autobot.apiKey');
        });
        it('should return undefined when API key does not exist', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            const result = await (0, auth_1.getApiKey)(mockContext);
            expect(result).toBeUndefined();
        });
        it('should return undefined when secrets storage returns null', async () => {
            mockContext.secrets.get.mockResolvedValue(null);
            const result = await (0, auth_1.getApiKey)(mockContext);
            expect(result).toBeNull();
        });
    });
    describe('ensureApiKey', () => {
        it('should return existing API key without prompting', async () => {
            const existingKey = 'existing-api-key';
            mockContext.secrets.get.mockResolvedValue(existingKey);
            const result = await (0, auth_1.ensureApiKey)(mockContext);
            expect(result).toBe(existingKey);
            expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
        });
        it('should prompt user when API key is missing and user clicks Set API Key', async () => {
            const newKey = 'new-api-key';
            mockContext.secrets.get.mockResolvedValue(undefined);
            vscode.window.showWarningMessage.mockResolvedValue('Set API Key');
            vscode.window.showInputBox.mockResolvedValue(newKey);
            const result = await (0, auth_1.ensureApiKey)(mockContext);
            expect(result).toBe(newKey);
            expect(vscode.window.showWarningMessage).toHaveBeenCalledWith('⚠️ Standup Autobot needs an API Key to generate summaries.', 'Set API Key', 'Cancel');
            expect(mockContext.secrets.store).toHaveBeenCalledWith('standup.autobot.apiKey', newKey);
        });
        it('should return undefined when API key is missing and user cancels', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            vscode.window.showWarningMessage.mockResolvedValue('Cancel');
            const result = await (0, auth_1.ensureApiKey)(mockContext);
            expect(result).toBeUndefined();
            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
        });
        it('should return undefined when API key is missing and user dismisses warning', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            vscode.window.showWarningMessage.mockResolvedValue(undefined);
            const result = await (0, auth_1.ensureApiKey)(mockContext);
            expect(result).toBeUndefined();
            expect(vscode.window.showInputBox).not.toHaveBeenCalled();
        });
        it('should return undefined when user cancels the input box', async () => {
            mockContext.secrets.get.mockResolvedValue(undefined);
            vscode.window.showWarningMessage.mockResolvedValue('Set API Key');
            vscode.window.showInputBox.mockResolvedValue(undefined);
            const result = await (0, auth_1.ensureApiKey)(mockContext);
            expect(result).toBeUndefined();
            expect(mockContext.secrets.store).not.toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=auth.test.js.map