/**
 * Utility to check if a path matches any of the given glob patterns.
 * Simplified glob-to-regex conversion for internal use.
 */
export function isIgnored(filePath: string, patterns: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/').toLowerCase();

    return patterns.some(pattern => {
        const p = pattern.replace(/\\/g, '/').toLowerCase();

        // 1. Handle common recursive patterns: **/node_modules/** or node_modules/**
        let cleanPattern = p.replace(/^\*\*\//, '').replace(/\/\*\*$/, '');
        // Remove trailing slash for matching
        cleanPattern = cleanPattern.replace(/\/$/, '');

        // Check if pattern appears as a complete path segment (directory name or filename)
        const segments = normalizedPath.split('/');
        if (segments.some(segment => segment === cleanPattern || segment.startsWith(cleanPattern + '.'))) {
            return true;
        }

        // 2. Handle simple extension wildcards: *.log
        if (p.startsWith('*.')) {
            const ext = p.substring(1);
            return normalizedPath.endsWith(ext);
        }

        // 3. Exact match or simple prefix
        return normalizedPath === p || normalizedPath.startsWith(p + '/');
    });
}
