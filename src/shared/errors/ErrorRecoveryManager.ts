import { ExtensionError, ErrorCategory } from './extensionError';
import { ILogger } from '../infrastructure/ILogger';
import { IVSCodeAdapter } from '../infrastructure/IVSCodeAdapter';
import { Result, success, failure } from './result';

export class ErrorRecoveryManager {
    private recoveryStrategies = new Map<ErrorCategory, RecoveryStrategy>();
    private errorHistory: ErrorHistoryEntry[] = [];
    private maxHistorySize = 100;

    constructor(
        private logger: ILogger,
        private vscodeAdapter: IVSCodeAdapter
    ) {
        this.initializeRecoveryStrategies();
    }

    async handleError(error: ExtensionError): Promise<Result<void>> {
        this.recordError(error);
        
        const strategy = this.recoveryStrategies.get(error.category);
        if (!strategy) {
            return this.handleUnknownError(error);
        }

        try {
            const result = await strategy.recover(error, this.vscodeAdapter, this.logger);
            
            if (result.success) {
                this.logger.info('Error recovery successful', { 
                    category: error.category,
                    message: error.message 
                });
            } else {
                this.logger.warn('Error recovery failed', { 
                    category: error.category,
                    error: result.error.message 
                });
            }
            
            return result;
        } catch (recoveryError) {
            this.logger.error('Recovery strategy threw error', recoveryError as Error, {
                originalError: error.message,
                category: error.category
            });
            return failure(recoveryError as Error);
        }
    }

    getErrorHistory(): ErrorHistoryEntry[] {
        return [...this.errorHistory];
    }

    getErrorStats(): ErrorStats {
        const categoryCount = new Map<ErrorCategory, number>();
        
        for (const entry of this.errorHistory) {
            const count = categoryCount.get(entry.category) || 0;
            categoryCount.set(entry.category, count + 1);
        }

        return {
            totalErrors: this.errorHistory.length,
            categoryCounts: Object.fromEntries(categoryCount),
            recentErrors: this.errorHistory.slice(-10)
        };
    }

    private initializeRecoveryStrategies(): void {
        this.recoveryStrategies.set(ErrorCategory.FILE_SYSTEM, new FileSystemRecoveryStrategy());
        this.recoveryStrategies.set(ErrorCategory.VALIDATION, new ValidationRecoveryStrategy());
        this.recoveryStrategies.set(ErrorCategory.NETWORK, new NetworkRecoveryStrategy());
        this.recoveryStrategies.set(ErrorCategory.USER_INPUT, new UserInputRecoveryStrategy());
    }

    private recordError(error: ExtensionError): void {
        const entry: ErrorHistoryEntry = {
            timestamp: Date.now(),
            category: error.category,
            message: error.message,
            context: error.context
        };

        this.errorHistory.push(entry);
        
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    private async handleUnknownError(error: ExtensionError): Promise<Result<void>> {
        this.logger.error('Unknown error category', error, { category: error.category });
        
        await this.vscodeAdapter.showErrorMessage(
            `An unexpected error occurred: ${error.message}`,
            'Report Issue'
        );
        
        return failure(new Error(`No recovery strategy for category: ${error.category}`));
    }
}

abstract class RecoveryStrategy {
    abstract recover(
        error: ExtensionError, 
        vscodeAdapter: IVSCodeAdapter, 
        logger: ILogger
    ): Promise<Result<void>>;
}

class FileSystemRecoveryStrategy extends RecoveryStrategy {
    async recover(error: ExtensionError, vscodeAdapter: IVSCodeAdapter, logger: ILogger): Promise<Result<void>> {
        if (error.message.includes('ENOENT')) {
            const action = await vscodeAdapter.showErrorMessage(
                'File not found. Would you like to create it?',
                'Create File', 'Cancel'
            );
            
            if (action === 'Create File') {
                // Recovery logic would go here
                logger.info('User chose to create missing file');
                return success(undefined);
            }
        }
        
        if (error.message.includes('EACCES')) {
            await vscodeAdapter.showErrorMessage(
                'Permission denied. Please check file permissions and try again.',
                'OK'
            );
        }
        
        return failure(new Error('Could not recover from file system error'));
    }
}

class ValidationRecoveryStrategy extends RecoveryStrategy {
    async recover(error: ExtensionError, vscodeAdapter: IVSCodeAdapter): Promise<Result<void>> {
        const action = await vscodeAdapter.showErrorMessage(
            `Validation failed: ${error.message}. Would you like to fix it?`,
            'Fix', 'Ignore', 'Cancel'
        );
        
        if (action === 'Fix') {
            // Open validation fix dialog
            return success(undefined);
        }
        
        return failure(new Error('User chose not to fix validation error'));
    }
}

class NetworkRecoveryStrategy extends RecoveryStrategy {
    async recover(error: ExtensionError, vscodeAdapter: IVSCodeAdapter): Promise<Result<void>> {
        const action = await vscodeAdapter.showErrorMessage(
            'Network error occurred. Would you like to retry?',
            'Retry', 'Cancel'
        );
        
        if (action === 'Retry') {
            // Retry logic would go here
            return success(undefined);
        }
        
        return failure(new Error('User chose not to retry network operation'));
    }
}

class UserInputRecoveryStrategy extends RecoveryStrategy {
    async recover(error: ExtensionError, vscodeAdapter: IVSCodeAdapter): Promise<Result<void>> {
        await vscodeAdapter.showErrorMessage(
            `Invalid input: ${error.message}. Please try again with valid input.`,
            'OK'
        );
        
        return success(undefined);
    }
}

export interface ErrorHistoryEntry {
    timestamp: number;
    category: ErrorCategory;
    message: string;
    context: any;
}

export interface ErrorStats {
    totalErrors: number;
    categoryCounts: Record<string, number>;
    recentErrors: ErrorHistoryEntry[];
}
