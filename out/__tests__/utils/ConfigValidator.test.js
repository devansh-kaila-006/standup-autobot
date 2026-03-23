"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ConfigValidator_1 = require("../../utils/ConfigValidator");
const errors_1 = require("../../utils/errors");
describe('ConfigValidator', () => {
    describe('validateStandupConfig', () => {
        it('should validate valid configuration', () => {
            const validConfig = {
                triggerTime: '09:00',
                activityDuration: 24,
                tone: 'casual',
                outputLanguage: 'English',
                ignorePatterns: ['**/node_modules/**'],
            };
            const result = ConfigValidator_1.ConfigValidator.validateStandupConfig(validConfig);
            // Check that the passed values are present
            expect(result.triggerTime).toBe('09:00');
            expect(result.activityDuration).toBe(24);
            expect(result.tone).toBe('casual');
            expect(result.outputLanguage).toBe('English');
            expect(result.ignorePatterns).toEqual(['**/node_modules/**']);
            // Check that defaults are applied
            expect(result).toHaveProperty('customPrompt');
            expect(result).toHaveProperty('enableTracking');
        });
        it('should reject invalid triggerTime format', () => {
            const invalidConfig = {
                triggerTime: 'invalid-time', // Should be HH:MM
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should reject invalid tone', () => {
            const invalidConfig = {
                tone: 'invalid_tone',
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should reject invalid activityDuration (too small)', () => {
            const invalidConfig = {
                activityDuration: 0,
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should reject invalid activityDuration (too large)', () => {
            const invalidConfig = {
                activityDuration: 200, // Max is 168
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should accept empty string for jiraEmail', () => {
            const validConfig = {
                jiraEmail: '',
            };
            const result = ConfigValidator_1.ConfigValidator.validateStandupConfig(validConfig);
            expect(result.jiraEmail).toBe('');
        });
        it('should apply defaults for missing fields', () => {
            const minimalConfig = {};
            const result = ConfigValidator_1.ConfigValidator.validateStandupConfig(minimalConfig);
            expect(result.tone).toBe('casual');
            expect(result.activityDuration).toBe(24);
            expect(result.outputLanguage).toBe('English');
        });
        it('should reject customPrompt that is too long', () => {
            const invalidConfig = {
                customPrompt: 'a'.repeat(1001), // Max is 1000
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should reject invalid ignorePatterns', () => {
            const invalidConfig = {
                ignorePatterns: 'not-an-array',
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateStandupConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
    });
    describe('validateWorkspaceConfig', () => {
        it('should validate valid workspace configuration', () => {
            const validConfig = {
                tone: 'formal',
                ignorePatterns: ['**/test/**'],
            };
            const result = ConfigValidator_1.ConfigValidator.validateWorkspaceConfig(validConfig);
            expect(result).toEqual(validConfig);
        });
        it('should accept partial workspace configuration', () => {
            const partialConfig = {
                tone: 'brief',
            };
            const result = ConfigValidator_1.ConfigValidator.validateWorkspaceConfig(partialConfig);
            expect(result.tone).toBe('brief');
        });
        it('should reject invalid workspace configuration', () => {
            const invalidConfig = {
                tone: 'invalid',
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateWorkspaceConfig(invalidConfig))
                .toThrow(errors_1.ConfigurationError);
        });
    });
    describe('validateActivity', () => {
        it('should validate valid activity data', () => {
            const validActivity = {
                filePath: '/test/file.ts',
                fileName: 'file.ts',
                timestamp: Date.now(),
                type: 'edit',
                linesChanged: 10,
            };
            const result = ConfigValidator_1.ConfigValidator.validateActivity(validActivity);
            expect(result).toEqual(validActivity);
        });
        it('should reject invalid activity type', () => {
            const invalidActivity = {
                filePath: '/test/file.ts',
                fileName: 'file.ts',
                timestamp: Date.now(),
                type: 'invalid_type',
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateActivity(invalidActivity))
                .toThrow(errors_1.ValidationError);
        });
        it('should reject negative linesChanged', () => {
            const invalidActivity = {
                filePath: '/test/file.ts',
                fileName: 'file.ts',
                timestamp: Date.now(),
                type: 'edit',
                linesChanged: -1,
            };
            expect(() => ConfigValidator_1.ConfigValidator.validateActivity(invalidActivity))
                .toThrow(errors_1.ValidationError);
        });
    });
    describe('validateConfigValue', () => {
        it('should validate individual valid config value', () => {
            expect(() => ConfigValidator_1.ConfigValidator.validateConfigValue('tone', 'casual'))
                .not.toThrow();
        });
        it('should reject individual invalid config value', () => {
            expect(() => ConfigValidator_1.ConfigValidator.validateConfigValue('tone', 'invalid'))
                .toThrow(errors_1.ConfigurationError);
        });
        it('should reject unknown config key', () => {
            expect(() => ConfigValidator_1.ConfigValidator.validateConfigValue('unknownKey', 'value'))
                .toThrow(errors_1.ConfigurationError);
        });
    });
    describe('sanitizeConfig', () => {
        it('should remove unknown keys from config', () => {
            const configWithUnknowns = {
                tone: 'casual',
                unknownKey: 'value',
                anotherUnknown: 123,
            };
            const sanitized = ConfigValidator_1.ConfigValidator.sanitizeConfig(configWithUnknowns);
            expect(sanitized).toEqual({ tone: 'casual' });
        });
        it('should preserve valid keys', () => {
            const validConfig = {
                tone: 'casual',
                activityDuration: 12,
            };
            const sanitized = ConfigValidator_1.ConfigValidator.sanitizeConfig(validConfig);
            expect(sanitized).toEqual(validConfig);
        });
        it('should handle empty config', () => {
            const sanitized = ConfigValidator_1.ConfigValidator.sanitizeConfig({});
            expect(sanitized).toEqual({});
        });
    });
    describe('getDefaults', () => {
        it('should return default configuration', () => {
            const defaults = ConfigValidator_1.ConfigValidator.getDefaults();
            expect(defaults.tone).toBe('casual');
            expect(defaults.activityDuration).toBe(24);
            expect(defaults.outputLanguage).toBe('English');
            expect(defaults.ignorePatterns).toContain('**/node_modules/**');
            expect(defaults.ignorePatterns).toContain('**/.git/**');
        });
    });
    describe('mergeWithDefaults', () => {
        it('should merge user config with defaults', () => {
            const userConfig = {
                tone: 'formal',
            };
            const merged = ConfigValidator_1.ConfigValidator.mergeWithDefaults(userConfig);
            expect(merged.tone).toBe('formal');
            expect(merged.activityDuration).toBe(24); // From defaults
            expect(merged.outputLanguage).toBe('English'); // From defaults
        });
        it('should prioritize user config over defaults', () => {
            const userConfig = {
                tone: 'brief',
                activityDuration: 12,
            };
            const merged = ConfigValidator_1.ConfigValidator.mergeWithDefaults(userConfig);
            expect(merged.tone).toBe('brief');
            expect(merged.activityDuration).toBe(12);
        });
        it('should handle empty user config', () => {
            const merged = ConfigValidator_1.ConfigValidator.mergeWithDefaults({});
            expect(merged).toEqual(ConfigValidator_1.ConfigValidator.getDefaults());
        });
        it('should sanitize unknown keys', () => {
            const userConfig = {
                tone: 'casual',
                unknownKey: 'value',
            };
            const merged = ConfigValidator_1.ConfigValidator.mergeWithDefaults(userConfig);
            expect(merged.tone).toBe('casual');
            expect(merged.unknownKey).toBeUndefined();
        });
    });
});
describe('ConfigMigrator', () => {
    describe('needsMigration', () => {
        it('should return true if version is less than current', () => {
            // Mock current version to be higher
            const originalVersion = ConfigValidator_1.ConfigMigrator.CURRENT_VERSION;
            ConfigValidator_1.ConfigMigrator.CURRENT_VERSION = 3;
            const needsMigration = ConfigValidator_1.ConfigMigrator.needsMigration();
            expect(needsMigration).toBe(true);
            // Restore
            ConfigValidator_1.ConfigMigrator.CURRENT_VERSION = originalVersion;
        });
    });
    describe('getCurrentVersion', () => {
        it('should return current version', () => {
            const version = ConfigValidator_1.ConfigMigrator.getCurrentVersion();
            expect(typeof version).toBe('number');
        });
    });
    describe('migrate', () => {
        it('should run migrations to current version', async () => {
            // This is a basic test to ensure migrate doesn't throw
            // In a real scenario, you'd mock the version checking
            await expect(ConfigValidator_1.ConfigMigrator.migrate()).resolves.not.toThrow();
        });
    });
});
//# sourceMappingURL=ConfigValidator.test.js.map