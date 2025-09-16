import { BuiltInTool, ToolSection } from '../../shared/types/agentCreation';
import { ExperimentalToolsService, ExperimentalTool } from '../../domain/agent/ExperimentalToolsService';
import { ExperimentalToolWarning } from '../../shared/types/experimentalTools';

export class ToolCategoryManager {
    constructor(private experimentalToolsService: ExperimentalToolsService) {}

    categorizeTools(allTools: string[]): { standard: string[], experimental: string[] } {
        const standard: string[] = [];
        const experimental: string[] = [];

        for (const tool of allTools) {
            if (this.experimentalToolsService.isExperimentalTool(tool)) {
                experimental.push(tool);
            } else {
                standard.push(tool);
            }
        }

        return { standard, experimental };
    }

    buildToolSections(standardTools: BuiltInTool[]): ToolSection[] {
        const experimentalTools = this.experimentalToolsService.getExperimentalTools();
        
        return [
            {
                title: 'Standard Tools',
                tools: standardTools,
                isExperimental: false
            },
            {
                title: 'Experimental Tools',
                tools: this.convertExperimentalToBuiltIn(experimentalTools),
                isExperimental: true,
                warningMessage: this.experimentalToolsService.getWarningMessage()
            }
        ];
    }

    private convertExperimentalToBuiltIn(experimentalTools: ExperimentalTool[]): BuiltInTool[] {
        return experimentalTools.map(tool => ({
            name: tool.name,
            displayName: tool.displayName,
            description: tool.description,
            category: 'experimental' as const,
            defaultAllowed: false,
            isExperimental: true
        }));
    }

    validateExperimentalToolSelection(selectedTools: string[]): ExperimentalToolWarning[] {
        const warnings: ExperimentalToolWarning[] = [];

        for (const toolName of selectedTools) {
            if (this.experimentalToolsService.isExperimentalTool(toolName)) {
                const toolInfo = this.experimentalToolsService.getExperimentalToolInfo(toolName);
                if (toolInfo) {
                    warnings.push({
                        toolName,
                        level: toolInfo.warningLevel,
                        message: `${toolInfo.displayName}: ${toolInfo.stabilityNote}`,
                        canProceed: true
                    });
                }
            }
        }

        return warnings;
    }

    getExperimentalToolDetails(toolName: string): ExperimentalTool | null {
        return this.experimentalToolsService.getExperimentalToolInfo(toolName);
    }

    generateToolTooltip(tool: BuiltInTool): string {
        let tooltip = `${tool.displayName}\n${tool.description}`;
        
        if (tool.isExperimental) {
            const experimentalInfo = this.getExperimentalToolDetails(tool.name);
            if (experimentalInfo) {
                tooltip += `\n\n⚠️ Experimental Feature`;
                tooltip += `\nStability: ${experimentalInfo.stabilityNote}`;
                
                if (experimentalInfo.features.length > 0) {
                    tooltip += `\nFeatures: ${experimentalInfo.features.join(', ')}`;
                }
            }
        }

        return tooltip;
    }

    shouldShowExperimentalWarning(selectedTools: string[]): boolean {
        return selectedTools.some(tool => this.experimentalToolsService.isExperimentalTool(tool));
    }

    getExperimentalWarningMessage(selectedTools: string[]): string {
        const experimentalCount = selectedTools.filter(tool => 
            this.experimentalToolsService.isExperimentalTool(tool)
        ).length;

        if (experimentalCount === 0) return '';

        const toolWord = experimentalCount === 1 ? 'tool' : 'tools';
        return `You have selected ${experimentalCount} experimental ${toolWord}. ${this.experimentalToolsService.getWarningMessage()}`;
    }
}
