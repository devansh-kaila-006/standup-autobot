import { DigestService } from '../../services/DigestService';
import { StandupGenerator } from '../../services/standupGenerator';
import { StandupEntry } from '../../services/HistoryService';

// Mock StandupGenerator
jest.mock('../../services/standupGenerator');

describe('DigestService', () => {
    let mockGenerator: jest.Mocked<StandupGenerator>;

    beforeEach(() => {
        mockGenerator = {
            generateContent: jest.fn(),
        } as any;

        jest.clearAllMocks();
    });

    const createMockEntry = (text: string, timestamp?: number): StandupEntry => ({
        id: '1',
        timestamp: timestamp || Date.now(),
        text,
        date: new Date(timestamp || Date.now()).toISOString().split('T')[0], // YYYY-MM-DD format
    });

    describe('generateWeeklyDigest', () => {
        it('should return error message when history has fewer than 3 entries', async () => {
            const history = [
                createMockEntry('Today I worked on feature A.'),
                createMockEntry('Today I worked on feature B.'),
            ];

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Not enough standup history available for a weekly digest (minimum 3 required).');
            expect(mockGenerator.generateContent).not.toHaveBeenCalled();
        });

        it('should return error message when history is empty', async () => {
            const history: StandupEntry[] = [];

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Not enough standup history available for a weekly digest (minimum 3 required).');
            expect(mockGenerator.generateContent).not.toHaveBeenCalled();
        });

        it('should return error message when history has exactly 2 entries', async () => {
            const history = [
                createMockEntry('Entry 1'),
                createMockEntry('Entry 2'),
            ];

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toContain('minimum 3 required');
            expect(mockGenerator.generateContent).not.toHaveBeenCalled();
        });

        it('should generate digest when history has exactly 3 entries', async () => {
            const history = [
                createMockEntry('Worked on feature A', Date.now() - 86400000 * 3),
                createMockEntry('Worked on feature B', Date.now() - 86400000 * 2),
                createMockEntry('Worked on feature C', Date.now() - 86400000),
            ];

            mockGenerator.generateContent.mockResolvedValue('Weekly summary generated');

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Weekly summary generated');
            expect(mockGenerator.generateContent).toHaveBeenCalledTimes(1);
        });

        it('should format history entries with dates and notes', async () => {
            const timestamp1 = Date.now() - 86400000 * 3;
            const timestamp2 = Date.now() - 86400000 * 2;
            const timestamp3 = Date.now() - 86400000;

            const history = [
                createMockEntry('Worked on authentication', timestamp1),
                createMockEntry('Fixed login bug', timestamp2),
                createMockEntry('Added unit tests', timestamp3),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];

            expect(promptArg).toContain('Date:');
            expect(promptArg).toContain('Notes:');
            expect(promptArg).toContain('Worked on authentication');
            expect(promptArg).toContain('Fixed login bug');
            expect(promptArg).toContain('Added unit tests');
        });

        it('should include separator between entries', async () => {
            const history = [
                createMockEntry('Entry 1'),
                createMockEntry('Entry 2'),
                createMockEntry('Entry 3'),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];

            expect(promptArg).toContain('---\n\n');
        });

        it('should construct prompt with instructions', async () => {
            const history = [
                createMockEntry('Entry 1'),
                createMockEntry('Entry 2'),
                createMockEntry('Entry 3'),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];

            expect(promptArg).toContain('helpful engineering manager assistant');
            expect(promptArg).toContain('raw standup notes');
            expect(promptArg).toContain('3-5 bullet points');
            expect(promptArg).toContain('key achievements');
            expect(promptArg).toContain('recurring blockers');
        });

        it('should pass API key to generator', async () => {
            const history = [
                createMockEntry('Entry 1'),
                createMockEntry('Entry 2'),
                createMockEntry('Entry 3'),
            ];

            const apiKey = 'my-api-key-123';
            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, apiKey);

            expect(mockGenerator.generateContent).toHaveBeenCalledWith(expect.any(String), apiKey);
        });

        it('should handle generator errors gracefully', async () => {
            const history = [
                createMockEntry('Entry 1'),
                createMockEntry('Entry 2'),
                createMockEntry('Entry 3'),
            ];

            mockGenerator.generateContent.mockRejectedValue(new Error('API Error'));

            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Failed to generate weekly digest.');
            expect(consoleSpy).toHaveBeenCalledWith('Weekly digest generation failed:', expect.any(Error));

            consoleSpy.mockRestore();
        });

        it('should handle large history (more than 3 entries)', async () => {
            const history = [
                createMockEntry('Day 1'),
                createMockEntry('Day 2'),
                createMockEntry('Day 3'),
                createMockEntry('Day 4'),
                createMockEntry('Day 5'),
            ];

            mockGenerator.generateContent.mockResolvedValue('Weekly summary');

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Weekly summary');
            expect(mockGenerator.generateContent).toHaveBeenCalledTimes(1);

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];
            expect(promptArg).toContain('Day 1');
            expect(promptArg).toContain('Day 5');
        });

        it('should format dates using locale format', async () => {
            const timestamp = new Date('2024-01-15T10:00:00Z').getTime();
            const history = [
                createMockEntry('Entry 1', timestamp),
                createMockEntry('Entry 2', timestamp + 86400000),
                createMockEntry('Entry 3', timestamp + 86400000 * 2),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];

            expect(promptArg).toContain('Date:');
        });

        it('should handle special characters in entry text', async () => {
            const history = [
                createMockEntry('Fixed bug with "quotes" and \'apostrophes\''),
                createMockEntry('Worked on feature with <html> tags'),
                createMockEntry('Used emoji: 🚀 and special chars: @#$%'),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Summary');
            expect(mockGenerator.generateContent).toHaveBeenCalledTimes(1);
        });

        it('should handle multiline entry text', async () => {
            const history = [
                createMockEntry('Line 1\nLine 2\nLine 3'),
                createMockEntry('Entry 2'),
                createMockEntry('Entry 3'),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(mockGenerator.generateContent).toHaveBeenCalled();

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];
            expect(promptArg).toContain('Line 1');
        });

        it('should preserve entry order', async () => {
            const history = [
                createMockEntry('First entry', Date.now() - 86400000 * 3),
                createMockEntry('Second entry', Date.now() - 86400000 * 2),
                createMockEntry('Third entry', Date.now() - 86400000),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            const promptArg = mockGenerator.generateContent.mock.calls[0][0];
            const firstIndex = promptArg.indexOf('First entry');
            const secondIndex = promptArg.indexOf('Second entry');
            const thirdIndex = promptArg.indexOf('Third entry');

            expect(firstIndex).toBeLessThan(secondIndex);
            expect(secondIndex).toBeLessThan(thirdIndex);
        });

        it('should handle entries with same timestamp', async () => {
            const sameTime = Date.now();
            const history = [
                createMockEntry('Entry 1', sameTime),
                createMockEntry('Entry 2', sameTime),
                createMockEntry('Entry 3', sameTime),
            ];

            mockGenerator.generateContent.mockResolvedValue('Summary');

            const result = await DigestService.generateWeeklyDigest(history, mockGenerator, 'test-api-key');

            expect(result).toBe('Summary');
        });
    });
});
