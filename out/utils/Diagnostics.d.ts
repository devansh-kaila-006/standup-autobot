import * as vscode from 'vscode';
import { Logger } from './Logger';
export interface DiagnosticReport {
    timestamp: string;
    extensionVersion: string;
    vscodeVersion: string;
    platform: string;
    logs: string;
    configuration: any;
    activityData?: {
        totalFiles: number;
        totalActivities: number;
        dataAge: number;
    };
}
/**
 * Diagnostic utilities for troubleshooting
 */
export declare class Diagnostics {
    private logger;
    constructor(logger?: Logger);
    /**
     * Generate a diagnostic report
     */
    generateReport(): Promise<DiagnosticReport>;
    /**
     * Sanitize configuration to remove sensitive data
     */
    private sanitizeConfig;
    /**
     * Export diagnostic report to a file
     */
    exportReport(filePath?: string): Promise<string>;
    /**
     * Test API connection
     */
    testAPIConnection(apiKey?: string): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }>;
    /**
     * Show diagnostic logs in a webview
     */
    showLogs(): Promise<void>;
    /**
     * Simple markdown renderer for logs
     */
    private renderMarkdown;
}
export declare function setDiagnosticsContext(ctx: vscode.ExtensionContext): void;
//# sourceMappingURL=Diagnostics.d.ts.map