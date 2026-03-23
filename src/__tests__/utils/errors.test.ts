import {
    StandupError,
    APIError,
    ConfigurationError,
    TrackingError,
    StorageError,
    ValidationError,
    ExportError,
    isStandupError,
    getErrorMessage,
    toStandupError
} from '../../utils/errors';

describe('Error Classes', () => {
    describe('StandupError', () => {
        it('should create base error with message and code', () => {
            const error = new StandupError('Test error', 'TEST_CODE');

            expect(error.message).toBe('Test error');
            expect(error.code).toBe('TEST_CODE');
            expect(error.name).toBe('StandupError');
        });

        it('should include details', () => {
            const details = { field: 'test', value: 123 };
            const error = new StandupError('Test error', 'TEST_CODE', details);

            expect(error.details).toEqual(details);
        });

        it('should convert to JSON', () => {
            const error = new StandupError('Test error', 'TEST_CODE', { key: 'value' });
            const json = error.toJSON();

            expect(json.name).toBe('StandupError');
            expect(json.message).toBe('Test error');
            expect(json.code).toBe('TEST_CODE');
            expect(json.details).toEqual({ key: 'value' });
            expect(json.stack).toBeDefined();
        });

        it('should get user message', () => {
            const error = new StandupError('Test error', 'TEST_CODE');
            const userMessage = error.getUserMessage();

            expect(userMessage).toBe('Test error');
        });
    });

    describe('APIError', () => {
        it('should create API error with status code', () => {
            const error = new APIError('API failed', 404, '/api/test');

            expect(error.message).toBe('API failed');
            expect(error.statusCode).toBe(404);
            expect(error.apiEndpoint).toBe('/api/test');
            expect(error.code).toBe('API_ERROR');
        });

        it('should provide user-friendly message for 401', () => {
            const error = new APIError('Unauthorized', 401);

            expect(error.getUserMessage()).toContain('Authentication failed');
        });

        it('should provide user-friendly message for 429', () => {
            const error = new APIError('Too many requests', 429);

            expect(error.getUserMessage()).toContain('Rate limit');
        });

        it('should provide user-friendly message for 500+', () => {
            const error = new APIError('Server error', 500);

            expect(error.getUserMessage()).toContain('temporarily unavailable');
        });

        it('should provide generic message for other status codes', () => {
            const error = new APIError('Not found', 404);

            expect(error.getUserMessage()).toBe('API Error: Not found');
        });
    });

    describe('ConfigurationError', () => {
        it('should create configuration error', () => {
            const error = new ConfigurationError('Invalid config', 'apiKey');

            expect(error.message).toBe('Invalid config');
            expect(error.configKey).toBe('apiKey');
            expect(error.code).toBe('CONFIG_ERROR');
        });

        it('should include config key in user message', () => {
            const error = new ConfigurationError('Invalid format', 'triggerTime');

            expect(error.getUserMessage()).toContain('triggerTime');
            expect(error.getUserMessage()).toContain('Invalid format');
        });

        it('should handle missing config key', () => {
            const error = new ConfigurationError('General error');

            expect(error.getUserMessage()).toBe('Configuration Error: General error');
        });
    });

    describe('TrackingError', () => {
        it('should create tracking error', () => {
            const error = new TrackingError('Failed to track', 'git');

            expect(error.message).toBe('Failed to track');
            expect(error.trackingType).toBe('git');
            expect(error.code).toBe('TRACKING_ERROR');
        });

        it('should provide user-friendly message for git errors', () => {
            const error = new TrackingError('Git command failed', 'git');

            expect(error.getUserMessage()).toContain('Git tracking error');
        });

        it('should provide user-friendly message for terminal errors', () => {
            const error = new TrackingError('Terminal error', 'terminal');

            expect(error.getUserMessage()).toContain('Terminal tracking error');
        });

        it('should provide user-friendly message for file errors', () => {
            const error = new TrackingError('File error', 'file');

            expect(error.getUserMessage()).toContain('File tracking error');
        });

        it('should provide generic message for unknown tracking type', () => {
            const error = new TrackingError('Unknown error');

            expect(error.getUserMessage()).toBe('Tracking Error: Unknown error');
        });
    });

    describe('StorageError', () => {
        it('should create storage error', () => {
            const error = new StorageError('Storage failed', 'activities.json');

            expect(error.message).toBe('Storage failed');
            expect(error.storageKey).toBe('activities.json');
            expect(error.code).toBe('STORAGE_ERROR');
        });

        it('should provide user-friendly message', () => {
            const error = new StorageError('Disk full');

            expect(error.getUserMessage()).toBe('Storage Error: Disk full');
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('Invalid input', 'email');

            expect(error.message).toBe('Invalid input');
            expect(error.field).toBe('email');
            expect(error.code).toBe('VALIDATION_ERROR');
        });

        it('should include field in user message', () => {
            const error = new ValidationError('Invalid format', 'password');

            expect(error.getUserMessage()).toContain('password');
            expect(error.getUserMessage()).toContain('Invalid format');
        });

        it('should handle missing field', () => {
            const error = new ValidationError('General validation error');

            expect(error.getUserMessage()).toBe('Validation Error: General validation error');
        });
    });

    describe('ExportError', () => {
        it('should create export error', () => {
            const error = new ExportError('Export failed', 'notion');

            expect(error.message).toBe('Export failed');
            expect(error.exportType).toBe('notion');
            expect(error.code).toBe('EXPORT_ERROR');
        });

        it('should include export type in user message', () => {
            const error = new ExportError('API error', 'jira');

            expect(error.getUserMessage()).toContain('jira');
            expect(error.getUserMessage()).toContain('Failed to export');
        });

        it('should handle missing export type', () => {
            const error = new ExportError('General export error');

            expect(error.getUserMessage()).toBe('Export Error: General export error');
        });
    });
});

describe('Error Helper Functions', () => {
    describe('isStandupError', () => {
        it('should return true for StandupError instances', () => {
            const error = new APIError('Test', 500);

            expect(isStandupError(error)).toBe(true);
        });

        it('should return false for regular errors', () => {
            const error = new Error('Regular error');

            expect(isStandupError(error)).toBe(false);
        });

        it('should return false for non-error values', () => {
            expect(isStandupError('string')).toBe(false);
            expect(isStandupError(null)).toBe(false);
            expect(isStandupError(undefined)).toBe(false);
        });
    });

    describe('getErrorMessage', () => {
        it('should get user message from StandupError', () => {
            const error = new APIError('API failed', 401);

            expect(getErrorMessage(error)).toContain('Authentication failed');
        });

        it('should get message from regular Error', () => {
            const error = new Error('Regular error');

            expect(getErrorMessage(error)).toBe('Regular error');
        });

        it('should convert non-error to string', () => {
            expect(getErrorMessage('string error')).toBe('string error');
            expect(getErrorMessage(123)).toBe('123');
        });
    });

    describe('toStandupError', () => {
        it('should return StandupError as-is', () => {
            const original = new APIError('Test', 500);
            const converted = toStandupError(original);

            expect(converted).toBe(original);
        });

        it('should convert regular Error to StandupError', () => {
            const original = new Error('Regular error');
            const converted = toStandupError(original);

            expect(isStandupError(converted)).toBe(true);
            expect(converted.message).toBe('Regular error');
            expect(converted.code).toBe('UNKNOWN_ERROR');
            expect(converted.details).toBeDefined();
        });

        it('should convert string to StandupError', () => {
            const converted = toStandupError('String error');

            expect(isStandupError(converted)).toBe(true);
            expect(converted.message).toBe('String error');
            expect(converted.code).toBe('UNKNOWN_ERROR');
        });

        it('should convert null to StandupError', () => {
            const converted = toStandupError(null);

            expect(isStandupError(converted)).toBe(true);
        });
    });
});
