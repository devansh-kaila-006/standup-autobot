"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const standupGenerator_1 = require("../../services/standupGenerator");
// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;
describe('StandupGenerator', () => {
    let generator;
    let mockApiKey;
    beforeEach(() => {
        generator = new standupGenerator_1.StandupGenerator();
        mockApiKey = 'test-api-key-123';
        jest.clearAllMocks();
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
            expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('generativelanguage.googleapis.com'), expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    'Content-Type': 'application/json',
                    'x-goog-api-key': mockApiKey
                })
            }));
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
        const mockData = {
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
        const mockSettings = {
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
            const result = await generator.generateStandup(mockData, mockApiKey, mockSettings);
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
            const settingsWithCustom = {
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
            const briefSettings = {
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
            const customGenerator = new standupGenerator_1.StandupGenerator({
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
            expect(mockFetch).toHaveBeenCalledWith('https://custom-api.example.com/v1/generate', expect.any(Object));
        });
        it('should use custom model', () => {
            const customGenerator = new standupGenerator_1.StandupGenerator({
                model: 'custom-model-v2'
            });
            expect(customGenerator.model).toBe('custom-model-v2');
        });
    });
});
//# sourceMappingURL=standupGenerator.test.js.map