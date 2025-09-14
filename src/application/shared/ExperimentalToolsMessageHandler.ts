import { ExtensionMessage } from '../../shared/types/extension';
import { ExperimentalTool, ExperimentalToolWarning } from '../../shared/types/experimentalTools';
import { ExperimentalToolsService } from '../../domain/agent/ExperimentalToolsService';
import { ToolCategoryManager } from './ToolCategoryManager';
import { ILogger } from '../../infrastructure/vscode/ILogger';

export interface ExperimentalToolMessage {
    type: 'requestExperimentalToolInfo';
    toolName: string;
}

export interface ExperimentalToolSelectionMessage {
    type: 'experimentalToolSelected';
    toolName: string;
    selected: boolean;
}

export interface ExperimentalToolValidationMessage {
    type: 'validateExperimentalTools';
    selectedTools: string[];
}

export class ExperimentalToolsMessageHandler {
    constructor(
        private experimentalToolsService: ExperimentalToolsService,
        private toolCategoryManager: ToolCategoryManager,
        private logger: ILogger
    ) {}

    async handleExperimentalToolInfoRequest(toolName: string): Promise<ExtensionMessage> {
        try {
            const toolInfo = this.experimentalToolsService.getExperimentalToolInfo(toolName);
            
            if (!toolInfo) {
                this.logger.warn(`Experimental tool not found: ${toolName}`);
                return {
                    type: 'error',
                    message: `Experimental tool '${toolName}' not found`
                };
            }

            return {
                type: 'experimentalToolInfo',
                tool: toolInfo
            };
        } catch (error) {
            this.logger.error(`Error getting experimental tool info for ${toolName}`, error);
            return {
                type: 'error',
                message: 'Failed to get experimental tool information'
            };
        }
    }

    async handleExperimentalToolSelection(toolName: string, selected: boolean): Promise<ExtensionMessage | null> {
        try {
            if (!this.experimentalToolsService.isExperimentalTool(toolName)) {
                return {
                    type: 'error',
                    message: `'${toolName}' is not an experimental tool`
                };
            }

            if (selected) {
                const toolInfo = this.experimentalToolsService.getExperimentalToolInfo(toolName);
                if (toolInfo) {
                    return this.createExperimentalToolWarningMessage(toolInfo);
                }
            }

            return null; // No specific response needed for deselection
        } catch (error) {
            this.logger.error(`Error handling experimental tool selection for ${toolName}`, error);
            return {
                type: 'error',
                message: 'Failed to process experimental tool selection'
            };
        }
    }

    async handleExperimentalToolsValidation(selectedTools: string[]): Promise<ExtensionMessage> {
        try {
            const warnings = this.toolCategoryManager.validateExperimentalToolSelection(selectedTools);
            
            if (warnings.length === 0) {
                return {
                    type: 'validationResult',
                    result: {
                        isValid: true,
                        errors: [],
                        warnings: []
                    }
                };
            }

            const warningMessages = warnings.map(warning => ({
                field: 'tools' as const,
                message: `${warning.toolName}: ${warning.message}`
            }));

            return {
                type: 'validationResult',
                result: {
                    isValid: true, // Warnings don't prevent creation
                    errors: [],
                    warnings: warningMessages
                }
            };
        } catch (error) {
            this.logger.error('Error validating experimental tools', error);
            return {
                type: 'error',
                message: 'Failed to validate experimental tools'
            };
        }
    }

    generateExperimentalToolsWarningMessage(selectedTools: string[]): ExtensionMessage | null {
        const experimentalTools = selectedTools.filter(tool => 
            this.experimentalToolsService.isExperimentalTool(tool)
        );

        if (experimentalTools.length === 0) {
            return null;
        }

        const warningMessage = this.toolCategoryManager.getExperimentalWarningMessage(experimentalTools);
        
        return {
            type: 'error', // Using error type for warning display
            message: warningMessage
        };
    }

    private createExperimentalToolWarningMessage(toolInfo: ExperimentalTool): ExtensionMessage {
        const warningLevel = toolInfo.warningLevel;
        let message = `⚠️ Experimental Tool Selected: ${toolInfo.displayName}\n\n`;
        message += `${toolInfo.description}\n\n`;
        message += `Stability: ${toolInfo.stabilityNote}\n\n`;
        
        if (toolInfo.features.length > 0) {
            message += `Features:\n${toolInfo.features.map(f => `• ${f}`).join('\n')}\n\n`;
        }
        
        message += 'This feature may change or be removed at any time. Use with caution in production workflows.';

        return {
            type: warningLevel === 'caution' ? 'error' : 'validationResult',
            ...(warningLevel === 'caution' 
                ? { message } 
                : { 
                    result: {
                        isValid: true,
                        errors: [],
                        warnings: [{ field: 'tools' as const, message }]
                    }
                }
            )
        };
    }

    getAllExperimentalToolsInfo(): ExperimentalTool[] {
        return this.experimentalToolsService.getExperimentalTools();
    }

    getExperimentalToolsWarningMessage(): string {
        return this.experimentalToolsService.getWarningMessage();
    }
}
