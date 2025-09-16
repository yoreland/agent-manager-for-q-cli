import { WebviewMessage, ExtensionMessage, AgentFormData } from '../../shared/types/agentCreation';
import { AgentLocation } from '../../domain/agent/AgentLocationService';
import { EnhancedAgentCreationFormService } from './EnhancedAgentCreationFormService';
import { ToolCategoryManager } from './ToolCategoryManager';
import { ILogger } from '../shared/infrastructure/ILogger';

export class MessageProtocolHandler {
    constructor(
        private formService: EnhancedAgentCreationFormService,
        private toolCategoryManager: ToolCategoryManager,
        private logger: ILogger
    ) {}

    async handleWebviewMessage(message: WebviewMessage): Promise<ExtensionMessage | null> {
        try {
            switch (message.type) {
                case 'ready':
                    return await this.handleReadyMessage();

                case 'locationChanged':
                    return await this.handleLocationChangeMessage(message.location);

                case 'requestExperimentalToolInfo':
                    return await this.handleExperimentalToolInfoRequest(message.toolName);

                case 'validateForm':
                    return await this.handleFormValidation(message.data);

                case 'submitForm':
                    return await this.handleFormSubmission(message.data);

                case 'formDataChanged':
                    return await this.handleFormDataChange(message.data);

                default:
                    this.logger.warn(`Unhandled message type: ${(message as any).type}`);
                    return null;
            }
        } catch (error) {
            this.logger.error('Error handling webview message', error);
            return {
                type: 'error',
                message: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }

    private async handleReadyMessage(): Promise<ExtensionMessage> {
        const defaultFormData = this.formService.getDefaultFormData();
        const toolSections = this.formService.getToolSections();

        return {
            type: 'initialData',
            data: defaultFormData,
            tools: [], // Legacy compatibility
            toolSections
        };
    }

    private async handleLocationChangeMessage(location: AgentLocation): Promise<ExtensionMessage> {
        const validation = await this.formService.validateLocation(location);
        
        return {
            type: 'locationValidation',
            isValid: validation.isValid,
            message: validation.message
        };
    }

    private async handleExperimentalToolInfoRequest(toolName: string): Promise<ExtensionMessage> {
        const toolInfo = this.formService.getExperimentalToolInfo(toolName);
        
        return {
            type: 'experimentalToolInfo',
            tool: toolInfo
        };
    }

    private async handleFormValidation(data: AgentFormData): Promise<ExtensionMessage> {
        const result = await this.formService.validateFormData(data);
        
        return {
            type: 'validationResult',
            result
        };
    }

    private async handleFormSubmission(data: AgentFormData): Promise<ExtensionMessage> {
        const result = await this.formService.createAgentFromFormData(data);
        
        return {
            type: 'creationResult',
            result
        };
    }

    private async handleFormDataChange(partialData: Partial<AgentFormData>): Promise<ExtensionMessage | null> {
        // Handle real-time form data changes
        if (partialData.tools?.experimental) {
            const warnings = this.toolCategoryManager.validateExperimentalToolSelection(
                partialData.tools.experimental
            );
            
            if (warnings.length > 0) {
                return {
                    type: 'error',
                    message: `Experimental tools selected: ${warnings.map(w => w.toolName).join(', ')}`
                };
            }
        }

        return null; // No response needed for most form data changes
    }
}
