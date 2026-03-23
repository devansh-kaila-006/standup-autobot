// Mock for VS Code API
export const window = {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(),
    withProgress: jest.fn(),
    activeTextEditor: null,
};

export const workspace = {
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

export const commands = {
    executeCommand: jest.fn(),
    registerCommand: jest.fn(),
};

export const extensions = {
    getExtension: jest.fn(),
};

export const env = {
    clipboard: {
        writeText: jest.fn(),
        readText: jest.fn(),
    },
    openExternal: jest.fn(),
    machineId: 'test-machine-id',
    sessionId: 'test-session-id',
};

export const Uri = {
    file: (path: string) => ({ fsPath: path, toString: () => path }),
    parse: jest.fn(),
};

export const Range = jest.fn();
export const Position = jest.fn();
export const Location = jest.fn();
export const Diagnostic = jest.fn();
export const DiagnosticSeverity = { Error: 0, Warning: 1, Information: 2, Hint: 3 };

export const StatusBarAlignment = { Left: 1, Right: 2 };
export const ThemeColor = jest.fn();

export const ExtensionMode = {
    Production: 1,
    Development: 2,
    Test: 3,
};

class MockDisposable {
    static from(...disposables: any[]) {
        const disposable = new MockDisposable();
        (disposable as any).innerDisposables = disposables;
        return disposable;
    }

    dispose() {
        if ((this as any).innerDisposables) {
            (this as any).innerDisposables.forEach((d: any) => d.dispose?.());
        }
    }
}

export const Disposable = MockDisposable as any;

export const ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
};

export default {
    window,
    workspace,
    commands,
    extensions,
    env,
    Uri,
    Range,
    Position,
    Location,
    Diagnostic,
    DiagnosticSeverity,
    StatusBarAlignment,
    ThemeColor,
    ConfigurationTarget,
};
