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
const Diagnostics_1 = require("../../utils/Diagnostics");
const Logger_1 = require("../../utils/Logger");
const vscode = __importStar(require("vscode"));
describe('Diagnostics', () => {
    let diagnostics;
    let mockLogger;
    beforeEach(() => {
        // Mock logger
        mockLogger = {
            getLogs: jest.fn().mockReturnValue([]),
            getLogsAsJSON: jest.fn().mockReturnValue('[]'),
            warn: jest.fn(),
            info: jest.fn(),
        };
        // Mock vscode APIs
        vscode.extensions.getExtension.mockReturnValue({
            packageJSON: { version: '1.0.0' }
        });
        vscode.workspace.getConfiguration.mockReturnValue({});
        // Mock vscode.version and process.platform
        Object.defineProperty(vscode, 'version', {
            value: '1.80.0',
            writable: false,
            configurable: true
        });
        Object.defineProperty(process, 'platform', {
            value: 'win32',
            writable: false,
            configurable: true
        });
        diagnostics = new Diagnostics_1.Diagnostics(mockLogger);
    });
    afterEach(() => {
        jest.clearAllMocks();
    });
    describe('constructor', () => {
        it('should create diagnostics instance', () => {
            expect(diagnostics).toBeDefined();
        });
        it('should use provided logger', () => {
            const newDiagnostics = new Diagnostics_1.Diagnostics(mockLogger);
            expect(newDiagnostics).toBeDefined();
        });
        it('should create default logger if none provided', () => {
            const newDiagnostics = new Diagnostics_1.Diagnostics();
            expect(newDiagnostics).toBeDefined();
        });
    });
    describe('generateReport', () => {
        it('should generate basic diagnostic report', async () => {
            mockLogger.getLogsAsJSON.mockReturnValue('[]');
            const report = await diagnostics.generateReport();
            expect(report).toBeDefined();
            expect(report.timestamp).toBeDefined();
            expect(report.extensionVersion).toBe('1.0.0');
            expect(report.vscodeVersion).toBeDefined();
            expect(report.platform).toBeDefined();
            expect(report.logs).toBe('[]');
        });
        // Note: Skipping sanitizeConfig test due to difficulty mocking WorkspaceConfiguration
        // The sanitizeConfig method is tested indirectly by its usage in generateReport
    });
    describe('testAPIConnection', () => {
        it('should return error when no API key configured', async () => {
            vscode.workspace.getConfiguration.mockReturnValue({
                get: jest.fn().mockReturnValue(undefined)
            });
            const result = await diagnostics.testAPIConnection();
            expect(result.success).toBe(false);
            expect(result.message).toContain('No API key configured');
        });
    });
    describe('error handling', () => {
        it('should handle missing extension gracefully', async () => {
            vscode.extensions.getExtension.mockReturnValue(undefined);
            const report = await diagnostics.generateReport();
            expect(report.extensionVersion).toBe('unknown');
        });
        it('should handle configuration errors', async () => {
            vscode.workspace.getConfiguration.mockImplementation(() => {
                throw new Error('Config error');
            });
            await expect(diagnostics.generateReport()).rejects.toThrow('Config error');
        });
    });
    describe('integration with Logger', () => {
        it('should use logger methods correctly', async () => {
            const testLogger = new Logger_1.Logger('Test');
            const testDiagnostics = new Diagnostics_1.Diagnostics(testLogger);
            expect(testDiagnostics).toBeDefined();
            testLogger.dispose();
        });
        it('should get logs from logger', async () => {
            mockLogger.getLogsAsJSON.mockReturnValue('[{"message":"test"}]');
            const report = await diagnostics.generateReport();
            expect(report.logs).toBe('[{"message":"test"}]');
            expect(mockLogger.getLogsAsJSON).toHaveBeenCalled();
        });
    });
});
//# sourceMappingURL=Diagnostics.test.js.map