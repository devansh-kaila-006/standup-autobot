import { StandupGenerator, DeveloperActivityData, StandupSettings } from '../../services/standupGenerator';
import { APIError } from '../../utils/errors';
import { geminiAPICache } from '../../utils/apiCache';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe('StandupGenerator', () => {
    let generator: StandupGenerator;
    let mockApiKey: string;

    beforeEach(() => {
        generator = new StandupGenerator();
        mockApiKey = 'test-api-key-123';
        jest.clearAllMocks();
        geminiAPICache.clear(); // Clear cache between tests
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('generateContent', () => {
        it('should successfully generate content from Gemini API', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: 'Test standup summary'
                                }
                            ]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const prompt = 'Test prompt';
            const result = await generator.generateContent(prompt, mockApiKey);

            expect(result).toBe('Test standup summary');
            expect(mockFetch).toHaveBeenCalledTimes(1);
            expect(mockFetch).toHaveBeenCalledWith(
                expect.stringContaining('generativelanguage.googleapis.com'),
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/json',
                        'x-goog-api-key': mockApiKey
                    })
                })
            );
        });

        it('should handle API error responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({
                    error: { message: 'Invalid API key' }
                })
            });

            const prompt = 'Test prompt';

            await expect(generator.generateContent(prompt, mockApiKey))
                .rejects
                .toThrow('Gemini API error (401): Invalid API key');
        });

        it('should handle network errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const prompt = 'Test prompt';

            await expect(generator.generateContent(prompt, mockApiKey))
                .rejects
                .toThrow('Failed to connect to Gemini API');
        });

        it('should handle malformed API responses', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ invalid: 'response' })
            });

            const prompt = 'Test prompt';

            await expect(generator.generateContent(prompt, mockApiKey))
                .rejects
                .toThrow('Invalid response format from Gemini API');
        });

        it('should include generation config in request', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const prompt = 'Test prompt';
            await generator.generateContent(prompt, mockApiKey);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);

            expect(body.generationConfig).toEqual({
                temperature: 0.7,
                maxOutputTokens: 2048
            });
        });
    });

    describe('generateStandup', () => {
        const mockData: DeveloperActivityData = {
            topFiles: [
                { file: 'src/test.ts', timeSpent: '30 mins', linesChanged: 50 },
                { file: 'src/test2.ts', timeSpent: '15 mins', linesChanged: 25 }
            ],
            commits: [
                {
                    hash: 'abc123',
                    message: 'Test commit',
                    timestamp: '2024-01-01T12:00:00Z',
                    files: ['src/test.ts']
                }
            ],
            commands: ['npm test', 'git status']
        };

        const mockSettings: StandupSettings = {
            tone: 'casual',
            outputLanguage: 'English'
        };

        it('should generate standup with valid data', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [
                                {
                                    text: 'Generated standup summary'
                                }
                            ]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const result = await generator.generateStandup(
                mockData,
                mockApiKey,
                mockSettings
            );

            expect(result).toBe('Generated standup summary');
        });

        it('should throw error when API key is missing', async () => {
            await expect(generator.generateStandup(mockData, undefined, mockSettings))
                .rejects
                .toThrow('Google Gemini API Key is required');
        });

        it('should include custom prompt in generation', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const settingsWithCustom: StandupSettings = {
                ...mockSettings,
                customPrompt: 'Include JIRA tickets'
            };

            await generator.generateStandup(mockData, mockApiKey, settingsWithCustom);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            expect(prompt).toContain('Include JIRA tickets');
        });

        it('should respect tone settings', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            const briefSettings: StandupSettings = {
                ...mockSettings,
                tone: 'brief'
            };

            await generator.generateStandup(mockData, mockApiKey, briefSettings);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            expect(prompt).toContain('Keep it extremely short');
        });

        it('should include activity data in prompt', async () => {
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await generator.generateStandup(mockData, mockApiKey, mockSettings);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            expect(prompt).toContain('src/test.ts');
            expect(prompt).toContain('abc123');
            expect(prompt).toContain('npm test');
        });
    });

    describe('custom configuration', () => {
        it('should use custom base URL', () => {
            const customGenerator = new StandupGenerator({
                baseUrl: 'https://custom-api.example.com/v1/generate'
            });

            // Test that the custom URL is used by making a call
            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            customGenerator.generateContent('test', mockApiKey);

            expect(mockFetch).toHaveBeenCalledWith(
                'https://custom-api.example.com/v1/generate',
                expect.any(Object)
            );
        });

        it('should use custom model', () => {
            const customGenerator = new StandupGenerator({
                model: 'custom-model-v2'
            });

            expect((customGenerator as any).model).toBe('custom-model-v2');
        });
    });

    describe('project grouping', () => {
        it('should group activity by project correctly', async () => {
            const multiProjectData: DeveloperActivityData = {
                topFiles: [
                    { file: 'project-a/src/component.tsx', timeSpent: '30 mins', linesChanged: 50 },
                    { file: 'project-b/src/utils.ts', timeSpent: '20 mins', linesChanged: 30 },
                    { file: 'project-a/src/hooks.ts', timeSpent: '15 mins', linesChanged: 25 }
                ],
                commits: [
                    {
                        hash: 'abc123',
                        message: 'Add component to project-a',
                        timestamp: '2024-01-01T12:00:00Z',
                        files: ['project-a/src/component.tsx']
                    },
                    {
                        hash: 'def456',
                        message: 'Fix utils in project-b',
                        timestamp: '2024-01-01T13:00:00Z',
                        files: ['project-b/src/utils.ts']
                    }
                ],
                commands: ['npm test', 'git status']
            };

            const testSettings: StandupSettings = {
                tone: 'casual',
                outputLanguage: 'English'
            };

            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response with project sections' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await generator.generateStandup(multiProjectData, mockApiKey, testSettings);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            // Verify that the prompt contains project sections
            expect(prompt).toContain('Project:');
            expect(prompt).toContain('Organize by PROJECT');
            expect(prompt).toContain('project-a');
            expect(prompt).toContain('project-b');
        });

        it('should handle Windows paths correctly and avoid drive letters as projects', async () => {
            const windowsPathData: DeveloperActivityData = {
                topFiles: [
                    { file: 'c:\\Users\\devan\\OneDrive\\Desktop\\cartographer\\README.md', timeSpent: '5 mins', linesChanged: 5 },
                    { file: 'c:\\Users\\devan\\OneDrive\\Desktop\\standup-autobot\\src\\extension.ts', timeSpent: '30 mins', linesChanged: 50 }
                ],
                commits: [
                    {
                        hash: 'abc123',
                        message: 'Update README',
                        timestamp: '2024-01-01T12:00:00Z',
                        files: ['c:\\Users\\devan\\OneDrive\\Desktop\\cartographer\\README.md']
                    }
                ],
                commands: ['git rebase -i HEAD~5', 'git pull']
            };

            const testSettings: StandupSettings = {
                tone: 'casual',
                outputLanguage: 'English'
            };

            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response with project sections' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await generator.generateStandup(windowsPathData, mockApiKey, testSettings);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            // Verify that drive letters are not used as project names
            expect(prompt).not.toContain('Project: c:');
            expect(prompt).not.toContain('Project: C:');

            // Verify that actual project names are detected
            expect(prompt).toContain('cartographer');
            expect(prompt).toContain('standup-autobot');

            // Verify that git commands are properly grouped
            expect(prompt).toContain('Git Operations');
        });

        it('should correctly detect project names from Windows paths with usernames', async () => {
            const windowsPathData: DeveloperActivityData = {
                topFiles: [
                    { file: 'c:\\Users\\devan\\OneDrive\\Desktop\\cartographer\\README.md', timeSpent: '5 mins', linesChanged: 5 },
                    { file: 'c:\\Users\\devan\\OneDrive\\Desktop\\standup-autobot\\src\\extension.ts', timeSpent: '30 mins', linesChanged: 50 },
                    { file: 'C:\\Users\\john\\Documents\\projects\\my-app\\src\\index.ts', timeSpent: '15 mins', linesChanged: 25 }
                ],
                commits: [
                    {
                        hash: 'abc123',
                        message: 'Update cartographer README',
                        timestamp: '2024-01-01T12:00:00Z',
                        files: ['c:\\Users\\devan\\OneDrive\\Desktop\\cartographer\\README.md']
                    }
                ],
                commands: ['git status']
            };

            const testSettings: StandupSettings = {
                tone: 'casual',
                outputLanguage: 'English'
            };

            const mockResponse = {
                candidates: [
                    {
                        content: {
                            parts: [{ text: 'Response with project sections' }]
                        }
                    }
                ]
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse
            });

            await generator.generateStandup(windowsPathData, mockApiKey, testSettings);

            const callArgs = mockFetch.mock.calls[0];
            const body = JSON.parse(callArgs[1].body);
            const prompt = body.contents[0].parts[0].text;

            // Verify that usernames are not used as project names
            expect(prompt).not.toContain('Project: devan');
            expect(prompt).not.toContain('Project: john');

            // Verify that actual project names are detected
            expect(prompt).toContain('cartographer');
            expect(prompt).toContain('standup-autobot');
            expect(prompt).toContain('my-app');

            // Verify that system folders are not used as project names
            expect(prompt).not.toContain('Project: Users');
            expect(prompt).not.toContain('Project: OneDrive');
            expect(prompt).not.toContain('Project: Desktop');
            expect(prompt).not.toContain('Project: Documents');
            expect(prompt).not.toContain('Project: projects');
        });
    });
});
