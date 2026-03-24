declare const callbacks: {
    onDidChangeActiveTextEditor: ((editor: any) => void)[];
    onDidChangeTextDocument: ((event: any) => void)[];
};
declare class MockDisposable {
    private callback?;
    constructor(callback?: (() => void) | undefined);
    dispose(): void;
    static from(...disposables: any[]): MockDisposable;
}
export declare const window: {
    createWebviewPanel: jest.Mock<any, any, any>;
    showInformationMessage: jest.Mock<any, any, any>;
    showErrorMessage: jest.Mock<any, any, any>;
    showWarningMessage: jest.Mock<any, any, any>;
    showInputBox: jest.Mock<any, any, any>;
    createOutputChannel: jest.Mock<{
        appendLine: jest.Mock<any, any, any>;
        clear: jest.Mock<any, any, any>;
        show: jest.Mock<any, any, any>;
        dispose: jest.Mock<any, any, any>;
    }, [], any>;
    withProgress: jest.Mock<any, any, any>;
    activeTextEditor: null;
    onDidChangeActiveTextEditor: jest.Mock<MockDisposable, [callback: (editor: any) => void], any>;
};
export declare const workspace: {
    getConfiguration: jest.Mock<{
        get: jest.Mock<any, any, any>;
        update: jest.Mock<any, any, any>;
        inspect: jest.Mock<any, any, any>;
    }, [], any>;
    workspaceFolders: never[];
    onDidChangeConfiguration: jest.Mock<any, any, any>;
    onDidSaveTextDocument: jest.Mock<any, any, any>;
    onDidChangeTextDocument: jest.Mock<MockDisposable, [callback: (event: any) => void], any>;
    onDidOpenTextDocument: jest.Mock<any, any, any>;
    onDidCloseTextDocument: jest.Mock<any, any, any>;
    fs: {
        readFile: jest.Mock<any, any, any>;
        writeFile: jest.Mock<any, any, any>;
    };
};
export declare const commands: {
    executeCommand: jest.Mock<any, any, any>;
    registerCommand: jest.Mock<any, any, any>;
};
export declare const extensions: {
    getExtension: jest.Mock<any, any, any>;
};
export declare const env: {
    clipboard: {
        writeText: jest.Mock<any, any, any>;
        readText: jest.Mock<any, any, any>;
    };
    openExternal: jest.Mock<any, any, any>;
    machineId: string;
    sessionId: string;
};
export declare const Uri: {
    file: (path: string) => {
        fsPath: string;
        scheme: string;
        toString: () => string;
    };
    parse: jest.Mock<{
        fsPath: string;
        scheme: string;
        toString: () => string;
    }, [uri: string], any>;
};
export declare const Range: jest.Mock<any, any, any>;
export declare const Position: jest.Mock<any, any, any>;
export declare const Location: jest.Mock<any, any, any>;
export declare const Diagnostic: jest.Mock<any, any, any>;
export declare const DiagnosticSeverity: {
    Error: number;
    Warning: number;
    Information: number;
    Hint: number;
};
export declare const StatusBarAlignment: {
    Left: number;
    Right: number;
};
export declare const ThemeColor: jest.Mock<any, any, any>;
export declare const ExtensionMode: {
    Production: number;
    Development: number;
    Test: number;
};
export declare const Disposable: any;
export declare const ConfigurationTarget: {
    Global: number;
    Workspace: number;
    WorkspaceFolder: number;
};
declare const _default: {
    window: {
        createWebviewPanel: jest.Mock<any, any, any>;
        showInformationMessage: jest.Mock<any, any, any>;
        showErrorMessage: jest.Mock<any, any, any>;
        showWarningMessage: jest.Mock<any, any, any>;
        showInputBox: jest.Mock<any, any, any>;
        createOutputChannel: jest.Mock<{
            appendLine: jest.Mock<any, any, any>;
            clear: jest.Mock<any, any, any>;
            show: jest.Mock<any, any, any>;
            dispose: jest.Mock<any, any, any>;
        }, [], any>;
        withProgress: jest.Mock<any, any, any>;
        activeTextEditor: null;
        onDidChangeActiveTextEditor: jest.Mock<MockDisposable, [callback: (editor: any) => void], any>;
    };
    workspace: {
        getConfiguration: jest.Mock<{
            get: jest.Mock<any, any, any>;
            update: jest.Mock<any, any, any>;
            inspect: jest.Mock<any, any, any>;
        }, [], any>;
        workspaceFolders: never[];
        onDidChangeConfiguration: jest.Mock<any, any, any>;
        onDidSaveTextDocument: jest.Mock<any, any, any>;
        onDidChangeTextDocument: jest.Mock<MockDisposable, [callback: (event: any) => void], any>;
        onDidOpenTextDocument: jest.Mock<any, any, any>;
        onDidCloseTextDocument: jest.Mock<any, any, any>;
        fs: {
            readFile: jest.Mock<any, any, any>;
            writeFile: jest.Mock<any, any, any>;
        };
    };
    commands: {
        executeCommand: jest.Mock<any, any, any>;
        registerCommand: jest.Mock<any, any, any>;
    };
    extensions: {
        getExtension: jest.Mock<any, any, any>;
    };
    env: {
        clipboard: {
            writeText: jest.Mock<any, any, any>;
            readText: jest.Mock<any, any, any>;
        };
        openExternal: jest.Mock<any, any, any>;
        machineId: string;
        sessionId: string;
    };
    Uri: {
        file: (path: string) => {
            fsPath: string;
            scheme: string;
            toString: () => string;
        };
        parse: jest.Mock<{
            fsPath: string;
            scheme: string;
            toString: () => string;
        }, [uri: string], any>;
    };
    Range: jest.Mock<any, any, any>;
    Position: jest.Mock<any, any, any>;
    Location: jest.Mock<any, any, any>;
    Diagnostic: jest.Mock<any, any, any>;
    DiagnosticSeverity: {
        Error: number;
        Warning: number;
        Information: number;
        Hint: number;
    };
    StatusBarAlignment: {
        Left: number;
        Right: number;
    };
    ThemeColor: jest.Mock<any, any, any>;
    ConfigurationTarget: {
        Global: number;
        Workspace: number;
        WorkspaceFolder: number;
    };
    Disposable: any;
    callbacks: {
        onDidChangeActiveTextEditor: ((editor: any) => void)[];
        onDidChangeTextDocument: ((event: any) => void)[];
    };
};
export default _default;
export { callbacks, MockDisposable };
//# sourceMappingURL=vscode.d.ts.map