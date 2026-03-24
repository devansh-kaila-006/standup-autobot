import * as vscode from 'vscode';
export declare class DataAuditPanel {
    static currentPanel: DataAuditPanel | undefined;
    private readonly _panel;
    private _disposables;
    static createOrShow(extensionUri: vscode.Uri, data: any, onConfirm: () => void): void;
    private constructor();
    private _getHtmlForWebview;
    dispose(): void;
}
//# sourceMappingURL=DataAuditPanel.d.ts.map