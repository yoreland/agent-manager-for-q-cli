/**
 * Result pattern for consistent error handling across the application.
 * Eliminates the need for throwing exceptions in business logic.
 */

export type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};

/**
 * Utility class for creating Result instances
 */
export class ResultBuilder {
    /**
     * Creates a successful result with data
     */
    static success<T>(data: T): Result<T> {
        return {
            success: true,
            data
        };
    }

    /**
     * Creates a failed result with error
     */
    static failure<E = Error>(error: E): Result<never, E> {
        return {
            success: false,
            error
        };
    }

    /**
     * Creates a failed result from an Error instance
     */
    static fromError(error: Error): Result<never, Error> {
        return {
            success: false,
            error
        };
    }

    /**
     * Creates a failed result with a simple error message
     */
    static fromMessage(message: string): Result<never, Error> {
        return {
            success: false,
            error: new Error(message)
        };
    }
}

// Convenience functions for easier usage
export const success = ResultBuilder.success;
export const failure = ResultBuilder.failure;

/**
 * Utility functions for working with Result types
 */
export class ResultUtils {
    /**
     * Maps a successful result to a new value
     */
    static map<T, U, E>(result: Result<T, E>, mapper: (value: T) => U): Result<U, E> {
        if (result.success) {
            return { success: true, data: mapper(result.data) };
        }
        return result;
    }

    /**
     * Chains multiple Result operations together
     */
    static flatMap<T, U, E>(
        result: Result<T, E>, 
        mapper: (value: T) => Result<U, E>
    ): Result<U, E> {
        if (result.success) {
            return mapper(result.data);
        }
        return result;
    }

    /**
     * Combines multiple results into a single result with an array of values
     */
    static combine<T, E>(...results: Result<T, E>[]): Result<T[], E> {
        const values: T[] = [];
        
        for (const result of results) {
            if (!result.success) {
                return result;
            }
            values.push(result.data);
        }
        
        return { success: true, data: values };
    }

    /**
     * Extracts the value from a Result, throwing if it's an error
     */
    static unwrap<T>(result: Result<T>): T {
        if (result.success) {
            return result.data;
        }
        throw result.error;
    }

    /**
     * Extracts the value from a Result, returning a default if it's an error
     */
    static unwrapOr<T>(result: Result<T>, defaultValue: T): T {
        if (result.success) {
            return result.data;
        }
        return defaultValue;
    }
}