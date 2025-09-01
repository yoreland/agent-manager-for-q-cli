import { ILogger } from '../../shared/infrastructure/ILogger';
import { IVSCodeAdapter } from '../../shared/infrastructure/IVSCodeAdapter';
import { PerformanceMonitor } from '../../infrastructure/PerformanceMonitor';
import { Result } from '../../shared/errors/result';

export abstract class BaseCommandHandler {
    constructor(
        protected logger: ILogger,
        protected vscodeAdapter: IVSCodeAdapter,
        protected performanceMonitor: PerformanceMonitor
    ) {}

    protected async executeCommand<T>(
        commandName: string,
        operation: () => Promise<Result<T>>,
        successMessage?: string,
        errorMessage?: string
    ): Promise<void> {
        try {
            const result = await this.performanceMonitor.measureAsync(commandName, operation);
            
            if (result.success) {
                if (successMessage) {
                    await this.vscodeAdapter.showInformationMessage(successMessage);
                }
                this.logger.info(`Command executed successfully: ${commandName}`);
            } else {
                const message = errorMessage || `Command failed: ${result.error.message}`;
                await this.vscodeAdapter.showErrorMessage(message);
                this.logger.error(`Command failed: ${commandName}`, result.error);
            }
        } catch (error) {
            const message = errorMessage || `Unexpected error in command: ${(error as Error).message}`;
            await this.vscodeAdapter.showErrorMessage(message);
            this.logger.error(`Unexpected error in command: ${commandName}`, error as Error);
        }
    }

    protected validateInput(value: string, fieldName: string): Result<string> {
        if (!value || value.trim().length === 0) {
            return { success: false, error: new Error(`${fieldName} is required`) };
        }
        return { success: true, data: value.trim() };
    }
}
