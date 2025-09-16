export interface ContextValidationRule {
    readonly pattern: RegExp;
    readonly message: string;
    readonly severity: 'error' | 'warning';
}

export const BUILT_IN_VALIDATION_RULES: ContextValidationRule[] = [
    {
        pattern: /^[^<>:"|?*]+$/,
        message: 'Path contains invalid characters (<>:"|?*)',
        severity: 'error'
    },
    {
        pattern: /^(?!.*\/\.\.\/)/,
        message: 'Path traversal (..) not allowed for security',
        severity: 'error'
    },
    {
        pattern: /^(?!.*\/{2,})/,
        message: 'Multiple consecutive slashes not recommended',
        severity: 'warning'
    },
    {
        pattern: /^(?!.*\s$)/,
        message: 'Path should not end with whitespace',
        severity: 'warning'
    }
];
