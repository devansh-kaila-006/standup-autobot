import * as vscode from 'vscode';
export declare class StandupCardProvider {
    private readonly _extensionUri;
    private _markdown;
    static currentPanel: StandupCardProvider | undefined;
    static readonly viewType = "standupAutobot.standupCard";
    private readonly _panel;
    private _disposables;
    static createOrShow(extensionUri: vscode.Uri, markdown: string): void;
    private constructor();
    dispose(): void;
    private _update;
    private _getHtmlForWebview;
}
//# sourceMappingURL=standupCard.d.ts.map