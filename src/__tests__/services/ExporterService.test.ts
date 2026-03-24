import * as vscode from 'vscode';
import { ExporterService } from '../../services/ExporterService';

// Mock vscode module
jest.mock('vscode', () => ({
    env: {
        openExternal: jest.fn(),
    },
    Uri: {
        parse: jest.fn((uri) => ({ toString: () => uri })),
    },
}));

// Mock fetch globally
global.fetch = jest.fn();

describe('ExporterService', () => {
    let exporterService: ExporterService;

    beforeEach(() => {
        exporterService = new ExporterService();
        jest.clearAllMocks();
    });

    describe('formatForTeams', () => {
        it('should remove emojis from markdown', () => {
            const markdown = 'Hello 👋 World 🚀';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('Hello World');
        });

        it('should remove multiple emojis', () => {
            const markdown = '🎉 🎊 🎈 Celebrate! 🎉';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('Celebrate!');
        });

        it('should convert HTML bold to markdown bold', () => {
            const markdown = '<b>Bold text</b> and <strong>more bold</strong>';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('**Bold text** and **more bold**');
        });

        it('should handle mixed HTML and emojis', () => {
            const markdown = '<b>Hello 👋</b> World';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('**Hello** World');
        });

        it('should trim whitespace', () => {
            const markdown = '  Hello World  👋  ';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('Hello World');
        });

        it('should preserve markdown syntax', () => {
            const markdown = '# Header 👋\n\n**Bold** text';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toContain('# Header');
            expect(result).toContain('**Bold**');
        });

        it('should handle empty string', () => {
            const result = exporterService.formatForTeams('');

            expect(result).toBe('');
        });

        it('should handle string with only emojis', () => {
            const markdown = '👋 🚀 🎉';
            const result = exporterService.formatForTeams(markdown);

            expect(result).toBe('');
        });
    });

    describe('exportToEmail', () => {
        it('should create mailto link and open it', async () => {
            const markdown = '# Daily Standup\n\n- Task 1\n- Task 2';
            const mockUri = { toString: () => 'mailto:...' };

            (vscode.Uri.parse as jest.Mock).mockReturnValue(mockUri);
            (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);

            await exporterService.exportToEmail(markdown);

            expect(vscode.Uri.parse).toHaveBeenCalledWith(
                expect.stringContaining('mailto:')
            );
            expect(vscode.Uri.parse).toHaveBeenCalledWith(
                expect.stringContaining('subject=')
            );
            expect(vscode.Uri.parse).toHaveBeenCalledWith(
                expect.stringContaining('body=')
            );
            expect(vscode.env.openExternal).toHaveBeenCalledWith(mockUri);
        });

        it('should include date in subject', async () => {
            const markdown = 'Test';
            const dateStr = new Date().toLocaleDateString();

            (vscode.Uri.parse as jest.Mock).mockReturnValue({ toString: () => '' });
            (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);

            await exporterService.exportToEmail(markdown);

            const callArgs = (vscode.Uri.parse as jest.Mock).mock.calls[0][0];
            // The subject is URL-encoded, so check for the encoded version
            const encodedSubject = encodeURIComponent(`Daily Standup – ${dateStr}`);
            expect(callArgs).toContain(encodedSubject);
        });

        it('should strip markdown from body', async () => {
            const markdown = '# Header\n\n**Bold** and `code`';
            const mockUri = { toString: () => '' };

            (vscode.Uri.parse as jest.Mock).mockReturnValue(mockUri);
            (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);

            await exporterService.exportToEmail(markdown);

            const callArgs = (vscode.Uri.parse as jest.Mock).mock.calls[0][0];
            expect(callArgs).toContain('Header');
            expect(callArgs).toContain('Bold');
            expect(callArgs).toContain('code');
            expect(callArgs).not.toContain('#');
            expect(callArgs).not.toContain('**');
            expect(callArgs).not.toContain('`');
        });

        it('should encode URI components', async () => {
            const markdown = 'Test with spaces & special chars!';
            const mockUri = { toString: () => '' };

            (vscode.Uri.parse as jest.Mock).mockReturnValue(mockUri);
            (vscode.env.openExternal as jest.Mock).mockResolvedValue(true);

            await exporterService.exportToEmail(markdown);

            const callArgs = (vscode.Uri.parse as jest.Mock).mock.calls[0][0];
            expect(callArgs).toContain('Test%20with%20spaces');
            expect(callArgs).toContain('%26');
        });
    });

    describe('exportToNotion', () => {
        const mockConfig = {
            token: 'test-token',
            pageId: 'test-page-id',
        };

        it('should export markdown to Notion successfully', async () => {
            const markdown = '# Header\n\n- Item 1\n- Item 2';
            const mockResponse = {
                ok: true,
                text: async () => 'Success',
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await exporterService.exportToNotion(markdown, mockConfig);

            expect(result).toBe('Successfully exported to Notion.');
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.notion.com/v1/blocks/test-page-id/children',
                expect.objectContaining({
                    method: 'PATCH',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                        'Notion-Version': '2022-06-28',
                    }),
                })
            );
        });

        it('should throw error when token is missing', async () => {
            const markdown = 'Test';
            const config = { token: '', pageId: 'page-id' };

            await expect(exporterService.exportToNotion(markdown, config as any))
                .rejects.toThrow('Notion Token or Page ID is missing.');
        });

        it('should throw error when pageId is missing', async () => {
            const markdown = 'Test';
            const config = { token: 'token', pageId: '' };

            await expect(exporterService.exportToNotion(markdown, config as any))
                .rejects.toThrow('Notion Token or Page ID is missing.');
        });

        it('should throw error when API request fails', async () => {
            const markdown = 'Test';
            const mockResponse = {
                ok: false,
                status: 401,
                text: async () => 'Unauthorized',
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(exporterService.exportToNotion(markdown, mockConfig))
                .rejects.toThrow('Notion API Error: 401 - Unauthorized');
        });

        it('should convert markdown headers to Notion blocks', async () => {
            const markdown = '## Heading 2\n### Heading 3';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToNotion(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.children).toHaveLength(2);
            expect(body.children[0].type).toBe('heading_2');
            expect(body.children[1].type).toBe('heading_3');
        });

        it('should convert markdown lists to Notion blocks', async () => {
            const markdown = '- Item 1\n* Item 2';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToNotion(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.children).toHaveLength(2);
            expect(body.children[0].type).toBe('bulleted_list_item');
            expect(body.children[1].type).toBe('bulleted_list_item');
        });

        it('should convert plain text to Notion paragraph blocks', async () => {
            const markdown = 'Plain text paragraph';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToNotion(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.children[0].type).toBe('paragraph');
        });

        it('should skip empty lines', async () => {
            const markdown = 'Line 1\n\n\nLine 2';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToNotion(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.children).toHaveLength(2);
        });
    });

    describe('exportToJira', () => {
        const mockConfig = {
            domain: 'test-company',
            email: 'user@example.com',
            token: 'api-token',
            issueKey: 'PROJ-123',
        };

        it('should export markdown to Jira successfully', async () => {
            const markdown = 'Test comment';
            const mockResponse = {
                ok: true,
                text: async () => 'Success',
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            const result = await exporterService.exportToJira(markdown, mockConfig);

            expect(result).toBe('Successfully commented on Jira issue PROJ-123.');
            expect(global.fetch).toHaveBeenCalledWith(
                'https://test-company.atlassian.net/rest/api/2/issue/PROJ-123/comment',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                    }),
                })
            );
        });

        it('should use Basic authentication', async () => {
            const markdown = 'Test';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToJira(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const authHeader = fetchCall[1].headers.Authorization;

            expect(authHeader).toMatch(/^Basic /);
            expect(authHeader).not.toContain('user@example.com');
            expect(authHeader).not.toContain('api-token');
        });

        it('should encode credentials correctly', async () => {
            const markdown = 'Test';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToJira(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const authHeader = fetchCall[1].headers.Authorization;
            const base64Part = authHeader.replace('Basic ', '');

            const decoded = Buffer.from(base64Part, 'base64').toString('utf-8');
            expect(decoded).toBe('user@example.com:api-token');
        });

        it('should throw error when domain is missing', async () => {
            const markdown = 'Test';
            const config = { ...mockConfig, domain: '' };

            await expect(exporterService.exportToJira(markdown, config as any))
                .rejects.toThrow('Jira credentials or Issue Key are missing.');
        });

        it('should throw error when email is missing', async () => {
            const markdown = 'Test';
            const config = { ...mockConfig, email: '' };

            await expect(exporterService.exportToJira(markdown, config as any))
                .rejects.toThrow('Jira credentials or Issue Key are missing.');
        });

        it('should throw error when token is missing', async () => {
            const markdown = 'Test';
            const config = { ...mockConfig, token: '' };

            await expect(exporterService.exportToJira(markdown, config as any))
                .rejects.toThrow('Jira credentials or Issue Key are missing.');
        });

        it('should throw error when issueKey is missing', async () => {
            const markdown = 'Test';
            const config = { ...mockConfig, issueKey: '' };

            await expect(exporterService.exportToJira(markdown, config as any))
                .rejects.toThrow('Jira credentials or Issue Key are missing.');
        });

        it('should throw error when API request fails', async () => {
            const markdown = 'Test';
            const mockResponse = {
                ok: false,
                status: 404,
                text: async () => 'Not Found',
            };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await expect(exporterService.exportToJira(markdown, mockConfig))
                .rejects.toThrow('Jira API Error: 404 - Not Found');
        });

        it('should include markdown in request body', async () => {
            const markdown = '**Bold** comment';
            const mockResponse = { ok: true, text: async () => '' };

            (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

            await exporterService.exportToJira(markdown, mockConfig);

            const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
            const body = JSON.parse(fetchCall[1].body);

            expect(body.body).toBe(markdown);
        });
    });
});
