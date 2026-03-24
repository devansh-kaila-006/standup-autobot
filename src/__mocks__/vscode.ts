// Mock for VS Code API

// Store callbacks for testing
const callbacks = {
    onDidChangeActiveTextEditor: [] as ((editor: any) => void)[],
    onDidChangeTextDocument: [] as ((event: any) => void)[],
};

class MockDisposable {
    constructor(private callback?: () => void) {}

    dispose() {
        this.callback?.();
    }

    static from(...disposables: any[]) {
        const disposable = new MockDisposable();
        (disposable as any).innerDisposables = disposables;
        return disposable;
    }
}

export const window = {
    createWebviewPanel: jest.fn(),
    showInformationMessage: jest.fn(),
    showErrorMessage: jest.fn(),
    showWarningMessage: jest.fn(),
    showInputBox: jest.fn(),
    createOutputChannel: jest.fn(() => ({
        appendLine: jest.fn(),
        clear: jest.fn(),
        show: jest.fn(),
        dispose: jest.fn(),
    })),
    withProgress: jest.fn(),
    activeTextEditor: null,
    onDidChangeActiveTextEditor: jest.fn((callback: (editor: any) => void) => {
        callbacks.onDidChangeActiveTextEditor.push(callback);
        return new MockDisposable();
    }),
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
    onDidChangeTextDocument: jest.fn((callback: (event: any) => void) => {
        callbacks.onDidChangeTextDocument.push(callback);
        return new MockDisposable();
    }),
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
    file: (path: string) => ({ fsPath: path, scheme: 'file', toString: () => path }),
    parse: jest.fn((uri: string) => {
        if (uri.startsWith('file:')) {
            return { fsPath: uri.replace('file://', ''), scheme: 'file', toString: () => uri };
        }
        return { fsPath: uri, scheme: 'untitled', toString: () => uri };
    }),
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
    Disposable,
    callbacks,
};

// Export for use in tests
export { callbacks, MockDisposable };
