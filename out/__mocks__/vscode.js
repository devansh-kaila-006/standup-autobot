"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationTarget = exports.ExtensionMode = exports.ThemeColor = exports.StatusBarAlignment = exports.DiagnosticSeverity = exports.Diagnostic = exports.Location = exports.Position = exports.Range = exports.Uri = exports.env = exports.extensions = exports.commands = exports.workspace = exports.window = void 0;
// Mock for VS Code API
exports.window = {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(),
    withProgress: jest.fn(),
    activeTextEditor: null,
};
exports.workspace = {
    getConfiguration: jest.fn(() => ({
        get: jest.fn(),
        update: jest.fn(),
        inspect: jest.fn(),
    })),
    workspaceFolders: [],
    onDidChangeConfiguration: jest.fn(),
    onDidSaveTextDocument: jest.fn(),
    onDidChangeTextDocument: jest.fn(),
    onDidOpenTextDocument: jest.fn(),
    onDidCloseTextDocument: jest.fn(),
    fs: {
        readFile: jest.fn(),
        writeFile: jest.fn(),
    },
};
exports.commands = {
    executeCommand: jest.fn(),
    registerCommand: jest.fn(),
};
exports.extensions = {
    getExtension: jest.fn(),
};
exports.env = {
    clipboard: {
        writeText: jest.fn(),
        readText: jest.fn(),
    },
    openExternal: jest.fn(),
    machineId: 'test-machine-id',
    sessionId: 'test-session-id',
};
exports.Uri = {
    file: (path) => ({ fsPath: path, toString: () => path }),
    parse: jest.fn(),
};
exports.Range = jest.fn();
exports.Position = jest.fn();
exports.Location = jest.fn();
exports.Diagnostic = jest.fn();
exports.DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };
exports.StatusBarAlignment = { Left: 1, Right: 2 };
exports.ThemeColor = jest.fn();
exports.ExtensionMode = {
    Production: 1,
    Development: 2,
    Test: 3,
};
exports.ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
};
exports.default = {
    window: exports.window,
    workspace: exports.workspace,
    commands: exports.commands,
    extensions: exports.extensions,
    env: exports.env,
    Uri: exports.Uri,
    Range: exports.Range,
    Position: exports.Position,
    Location: exports.Location,
    Diagnostic: exports.Diagnostic,
    DiagnosticSeverity: exports.DiagnosticSeverity,
    StatusBarAlignment: exports.StatusBarAlignment,
    ThemeColor: exports.ThemeColor,
    ConfigurationTarget: exports.ConfigurationTarget,
};
//# sourceMappingURL=vscode.js.map