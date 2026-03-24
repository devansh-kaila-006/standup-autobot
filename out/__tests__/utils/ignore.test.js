"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ignore_1 = require("../../utils/ignore");
describe('ignore', () => {
    describe('isIgnored', () => {
        describe('path normalization', () => {
            it('should normalize Windows backslashes to forward slashes', () => {
                const patterns = ['**/node_modules/**'];
                const filePath = 'C:\\Users\\test\\node_modules\\package\\index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should be case-insensitive', () => {
                const patterns = ['**/Node_Modules/**'];
                const filePath = '/home/user/node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should convert patterns to lowercase', () => {
                const patterns = ['**/DIST/**'];
                const filePath = '/home/user/dist/build.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
        });
        describe('recursive patterns', () => {
            it('should match **/pattern/** format', () => {
                const patterns = ['**/node_modules/**'];
                const filePath = '/home/user/project/node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match pattern/** format (without leading **)', () => {
                const patterns = ['node_modules/**'];
                const filePath = '/home/user/project/node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match nested files with recursive patterns', () => {
                const patterns = ['**/build/**'];
                const filePath = '/home/user/project/build/static/js/main.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match pattern at any depth with **/', () => {
                const patterns = ['**/.git/**'];
                const filePath = '/home/user/project/src/components/.git/hooks/pre-commit';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match pattern in root directory', () => {
                const patterns = ['**/node_modules/**'];
                const filePath = 'node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle trailing ** in patterns', () => {
                const patterns = ['**/test/**'];
                const filePath = '/home/user/project/test/unit/app.test.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
        });
        describe('extension wildcards', () => {
            it('should match *.log pattern', () => {
                const patterns = ['*.log'];
                const filePath = '/home/user/project/error.log';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match *.test.ts pattern', () => {
                const patterns = ['*.test.ts'];
                const filePath = '/home/user/project/utils.test.ts';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match *.spec.js pattern', () => {
                const patterns = ['*.spec.js'];
                const filePath = '/home/user/project/component.spec.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match extension at any depth', () => {
                const patterns = ['*.md'];
                const filePath = '/home/user/project/docs/README.md';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should not match if extension is different', () => {
                const patterns = ['*.log'];
                const filePath = '/home/user/project/error.txt';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(false);
            });
            it('should match multiple extension patterns', () => {
                const patterns = ['*.log', '*.tmp'];
                const filePath1 = '/home/user/project/error.log';
                const filePath2 = '/home/user/project/temp.tmp';
                expect((0, ignore_1.isIgnored)(filePath1, patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)(filePath2, patterns)).toBe(true);
            });
        });
        describe('exact and prefix matches', () => {
            it('should match exact path', () => {
                const patterns = ['package-lock.json'];
                const filePath = 'package-lock.json';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match path with prefix', () => {
                const patterns = ['.git'];
                const filePath = '.git/config';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should match nested directory with prefix', () => {
                const patterns = ['dist'];
                const filePath = 'dist/static/js/main.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should not match partial string', () => {
                const patterns = ['test'];
                const filePath = '/home/user/project/mytest/file.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(false);
            });
            it('should match directory name in path', () => {
                const patterns = ['coverage'];
                const filePath = '/home/user/project/coverage/lcov-report/index.html';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
        });
        describe('multiple patterns', () => {
            it('should match if any pattern matches', () => {
                const patterns = ['**/node_modules/**', '*.log', 'dist'];
                const filePath = '/home/user/project/node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should check all patterns until match is found', () => {
                const patterns = ['*.log', '*.tmp', '**/test/**'];
                const filePath = '/home/user/project/test/unit/app.test.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should return false if no patterns match', () => {
                const patterns = ['**/node_modules/**', '*.log', 'dist'];
                const filePath = '/home/user/project/src/utils/helpers.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(false);
            });
            it('should handle complex pattern combinations', () => {
                const patterns = [
                    '**/node_modules/**',
                    '**/.git/**',
                    '*.log',
                    '*.tmp',
                    'dist',
                    'build',
                    'coverage'
                ];
                expect((0, ignore_1.isIgnored)('/home/user/project/src/app.ts', patterns)).toBe(false);
                expect((0, ignore_1.isIgnored)('/home/user/project/node_modules/pkg/index.js', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/home/user/project/.git/config', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/home/user/project/error.log', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/home/user/project/dist/main.js', patterns)).toBe(true);
            });
        });
        describe('edge cases', () => {
            it('should handle empty patterns array', () => {
                const patterns = [];
                const filePath = '/home/user/project/src/app.ts';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(false);
            });
            it('should handle empty file path', () => {
                const patterns = ['**/test/**'];
                const filePath = '';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(false);
            });
            it('should handle pattern with trailing slash', () => {
                const patterns = ['test/'];
                const filePath = '/home/user/project/test/file.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle file path with trailing slash', () => {
                const patterns = ['test'];
                const filePath = '/home/user/project/test/';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle special characters in paths', () => {
                const patterns = ['**/test-file/**'];
                const filePath = '/home/user/project/test-file/utils.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle paths with spaces', () => {
                const patterns = ['**/my folder/**'];
                const filePath = '/home/user/project/my folder/file.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle deeply nested paths', () => {
                const patterns = ['**/a/**'];
                const filePath = '/home/user/project/1/2/3/a/b/c/d/e/file.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle patterns without wildcards', () => {
                const patterns = ['README.md'];
                const filePath = 'README.md';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should be case insensitive for extensions', () => {
                const patterns = ['*.LOG'];
                const filePath = '/home/user/project/error.log';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle mixed slashes in patterns', () => {
                const patterns = ['node_modules\\**'];
                const filePath = '/home/user/project/node_modules/package/index.js';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle dotfiles', () => {
                const patterns = ['.env'];
                const filePath = '/home/user/project/.env';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
            it('should handle dotfiles with prefix', () => {
                const patterns = ['.vscode'];
                const filePath = '/home/user/project/.vscode/settings.json';
                expect((0, ignore_1.isIgnored)(filePath, patterns)).toBe(true);
            });
        });
        describe('real-world scenarios', () => {
            it('should handle common ignore patterns for Node.js projects', () => {
                const patterns = [
                    '**/node_modules/**',
                    '**/.git/**',
                    '*.log',
                    'dist',
                    'build',
                    '.env',
                    '.env.local'
                ];
                expect((0, ignore_1.isIgnored)('/project/node_modules/lodash/index.js', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/.git/hooks/pre-commit', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/npm-debug.log', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/dist/main.js', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/.env', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/src/app.ts', patterns)).toBe(false);
            });
            it('should handle common ignore patterns for testing', () => {
                const patterns = [
                    '**/coverage/**',
                    '*.test.ts',
                    '*.spec.ts',
                    '__tests__'
                ];
                expect((0, ignore_1.isIgnored)('/project/coverage/lcov-report/index.html', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/src/app.test.ts', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/src/utils.spec.ts', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/__tests__/utils.test.ts', patterns)).toBe(true);
                expect((0, ignore_1.isIgnored)('/project/src/app.ts', patterns)).toBe(false);
            });
        });
    });
});
//# sourceMappingURL=ignore.test.js.map