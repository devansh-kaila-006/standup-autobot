import { ActivityAnalyzer } from '../../utils/ActivityAnalyzer';
import { DeveloperActivityData } from '../../services/standupGenerator';

describe('ActivityAnalyzer', () => {
    const createMockActivityData = (overrides?: Partial<DeveloperActivityData>): DeveloperActivityData => ({
        commits: [],
        commands: [],
        topFiles: [],
        ...overrides,
    });

    describe('analyze', () => {
        describe('tag detection', () => {
            it('should detect bugfix tags from commit messages', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'fix: critical bug in auth', files: ['auth.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('bugfix');
            });

            it('should detect feature tags from commit messages', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'feat: add new dashboard component', files: ['dashboard.tsx'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('feature');
            });

            it('should detect refactor tags', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'refactor: clean up utils', files: ['utils.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('refactor');
            });

            it('should detect review tags', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'Merge pull request #123', files: ['main.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('review');
            });

            it('should detect docs tags from files', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'update docs', files: ['README.md'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('docs');
            });

            it('should detect config tags', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'update config', files: ['.env'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('config');
            });

            it('should detect test tags', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'add tests', files: ['__tests__/utils.test.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('test');
            });

            it('should detect multiple tags from different sources', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'feat: add feature and fix bugs', files: ['component.tsx', '__tests__/component.test.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('feature');
                expect(result.tags).toContain('bugfix');
                expect(result.tags).toContain('test');
            });

            it('should detect tags from top files', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'config.json', timeSpent: '5 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('config');
            });

            it('should avoid duplicate tags', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'fix: bug 1', files: ['test.ts'], hash: 'abc123', timestamp: new Date().toISOString() },
                        { message: 'fix: bug 2', files: ['test.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ],
                    topFiles: [
                        { file: 'test.spec.ts', timeSpent: '10 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                const bugfixCount = result.tags.filter(t => t === 'bugfix').length;
                expect(bugfixCount).toBe(1);
            });

            it('should return empty tags array when no patterns match', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'random message', files: ['random.ts'], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toEqual([]);
            });
        });

        describe('blocker detection', () => {
            it('should detect error keyword in commands', () => {
                const data = createMockActivityData({
                    commands: ['npm run build', 'error: module not found']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.length).toBeGreaterThan(0);
                expect(result.blockers[0]).toContain('ERROR');
            });

            it('should detect failed keyword', () => {
                const data = createMockActivityData({
                    commands: ['test failed']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('FAILED'))).toBe(true);
            });

            it('should detect exception keyword', () => {
                const data = createMockActivityData({
                    commands: ['throw exception']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('EXCEPTION'))).toBe(true);
            });

            it('should detect ENOENT keyword', () => {
                const data = createMockActivityData({
                    commands: ['ENOENT: no such file']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('ENOENT'))).toBe(true);
            });

            it('should detect "cannot find" keyword', () => {
                const data = createMockActivityData({
                    commands: ['cannot find module']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('CANNOT FIND'))).toBe(true);
            });

            it('should detect rejected keyword', () => {
                const data = createMockActivityData({
                    commands: ['Promise rejected']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('REJECTED'))).toBe(true);
            });

            it('should detect segfault keyword', () => {
                const data = createMockActivityData({
                    commands: ['segfault at memory']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('SEGFAULT'))).toBe(true);
            });

            it('should detect panic keyword', () => {
                const data = createMockActivityData({
                    commands: ['runtime panic']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers.some(b => b.includes('PANIC'))).toBe(true);
            });

            it('should truncate long commands in blocker messages', () => {
                const longCommand = 'error: ' + 'x'.repeat(100);
                const data = createMockActivityData({
                    commands: [longCommand]
                });

                const result = ActivityAnalyzer.analyze(data);

                // Format: '[ERROR] ' (8 chars) + truncated command (50 chars + '...' = 53 chars) = 61 chars max
                expect(result.blockers[0].length).toBeLessThanOrEqual(61);
                expect(result.blockers[0]).toContain('...');
            });

            it('should return empty blockers when no keywords found', () => {
                const data = createMockActivityData({
                    commands: ['npm run build', 'npm run test']
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.blockers).toEqual([]);
            });
        });

        describe('confidence calculation', () => {
            it('should mark as low confidence for short sessions (< 10 mins)', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '5 mins', linesChanged: 10 },
                        { file: 'file2.ts', timeSpent: '3 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(true);
                expect(result.confidenceReason).toContain('8 minutes');
            });

            it('should mark as low confidence for single file', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '15 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(true);
                expect(result.confidenceReason).toContain('Only one file');
            });

            it('should mark as high confidence for multiple files with sufficient time', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '10 mins', linesChanged: 10 },
                        { file: 'file2.ts', timeSpent: '5 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(false);
                expect(result.confidenceReason).toBe('');
            });

            it('should handle zero minutes correctly', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '0 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(true);
                expect(result.confidenceReason).toContain('Only one file');
            });

            it('should handle empty topFiles array', () => {
                const data = createMockActivityData({
                    topFiles: []
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(false);
                expect(result.confidenceReason).toBe('');
            });

            it('should parse various time formats', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '15 mins', linesChanged: 10 },
                        { file: 'file2.ts', timeSpent: '20 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.isLowConfidence).toBe(false);
            });

            it('should prioritize short session reason over single file reason', () => {
                const data = createMockActivityData({
                    topFiles: [
                        { file: 'file1.ts', timeSpent: '5 mins', linesChanged: 10 }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                // Short session is checked first
                expect(result.isLowConfidence).toBe(true);
                expect(result.confidenceReason).toContain('minutes');
            });
        });

        describe('edge cases', () => {
            it('should handle completely empty data', () => {
                const data = createMockActivityData({});

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toEqual([]);
                expect(result.blockers).toEqual([]);
                expect(result.isLowConfidence).toBe(false);
            });

            it('should handle commits with empty files array', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: 'fix: bug', files: [], hash: 'abc123', timestamp: new Date().toISOString() }
                    ]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result.tags).toContain('bugfix');
            });

            it('should handle null/undefined values gracefully', () => {
                const data = createMockActivityData({
                    commits: [
                        { message: '', files: [''], hash: 'abc123', timestamp: new Date().toISOString() }
                    ],
                    commands: [''],
                    topFiles: [{ file: '', timeSpent: '', linesChanged: 10 }]
                });

                const result = ActivityAnalyzer.analyze(data);

                expect(result).toBeDefined();
                expect(Array.isArray(result.tags)).toBe(true);
                expect(Array.isArray(result.blockers)).toBe(true);
            });
        });
    });
});
