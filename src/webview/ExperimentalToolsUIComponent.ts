import { ToolSection } from '../types/agentCreation';
import { ExperimentalTool } from '../types/experimentalTools';

export class ExperimentalToolsUIComponent {
    
    static generateToolSectionHTML(section: ToolSection): string {
        const sectionClass = section.isExperimental ? 'tool-section experimental' : 'tool-section';
        
        let html = `<div class="${sectionClass}">`;
        
        // Section header
        html += `<h3>${section.title}`;
        if (section.isExperimental) {
            html += ` <span class="warning-badge">⚠️ Experimental</span>`;
        }
        html += `</h3>`;
        
        // Warning message for experimental sections
        if (section.warningMessage) {
            html += `<div class="experimental-warning">
                <div class="warning-icon">⚠️</div>
                <div class="warning-text">${section.warningMessage}</div>
            </div>`;
        }
        
        // Tools grid
        html += `<div class="tool-grid">`;
        section.tools.forEach(tool => {
            html += this.generateToolItemHTML(tool, section.isExperimental);
        });
        html += `</div>`;
        
        html += `</div>`;
        return html;
    }
    
    private static generateToolItemHTML(tool: any, isExperimental: boolean): string {
        const toolId = `tool-${tool.name}`;
        const experimentalClass = isExperimental ? ' experimental-tool' : '';
        
        return `
            <div class="tool-item${experimentalClass}" data-tool="${tool.name}">
                <div class="tool-checkbox">
                    <input type="checkbox" 
                           id="${toolId}" 
                           value="${tool.name}"
                           ${tool.defaultAllowed ? 'data-allowed="true"' : ''}
                           ${isExperimental ? 'data-experimental="true"' : ''}>
                </div>
                <div class="tool-info">
                    <div class="tool-header">
                        <label for="${toolId}" class="tool-name">${tool.displayName}</label>
                        ${isExperimental ? '<span class="experimental-badge">EXP</span>' : ''}
                    </div>
                    <div class="tool-description">${tool.description}</div>
                    ${isExperimental ? this.generateExperimentalToolDetails(tool) : ''}
                </div>
                ${isExperimental ? '<button type="button" class="tool-info-btn" data-tool="' + tool.name + '">ℹ️</button>' : ''}
            </div>
        `;
    }
    
    private static generateExperimentalToolDetails(tool: any): string {
        if (!tool.isExperimental) return '';
        
        return `
            <div class="experimental-details" style="display: none;">
                <div class="stability-note">
                    <strong>Stability:</strong> ${tool.stabilityNote || 'In active development'}
                </div>
                ${tool.features ? `
                    <div class="features-list">
                        <strong>Features:</strong>
                        <ul>
                            ${tool.features.map((feature: string) => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    static generateExperimentalToolsCSS(): string {
        return `
            .tool-section.experimental {
                border-color: var(--vscode-problemsWarningIcon-foreground);
                background-color: rgba(255, 193, 7, 0.1);
            }
            
            .experimental-warning {
                display: flex;
                align-items: flex-start;
                gap: 10px;
                background-color: var(--vscode-inputValidation-warningBackground);
                border: 1px solid var(--vscode-problemsWarningIcon-foreground);
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 15px;
            }
            
            .warning-icon {
                font-size: 1.2em;
                color: var(--vscode-problemsWarningIcon-foreground);
            }
            
            .warning-text {
                flex: 1;
                font-size: 0.9em;
                line-height: 1.4;
            }
            
            .warning-badge {
                background-color: var(--vscode-problemsWarningIcon-foreground);
                color: var(--vscode-editor-background);
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 0.75em;
                font-weight: bold;
                text-transform: uppercase;
            }
            
            .tool-item.experimental-tool {
                border-color: var(--vscode-problemsWarningIcon-foreground);
                background-color: rgba(255, 193, 7, 0.05);
            }
            
            .tool-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 4px;
            }
            
            .experimental-badge {
                background-color: var(--vscode-problemsWarningIcon-foreground);
                color: var(--vscode-editor-background);
                padding: 1px 4px;
                border-radius: 2px;
                font-size: 0.7em;
                font-weight: bold;
            }
            
            .tool-info-btn {
                background: none;
                border: 1px solid var(--vscode-input-border);
                border-radius: 50%;
                width: 24px;
                height: 24px;
                cursor: pointer;
                font-size: 0.8em;
                display: flex;
                align-items: center;
                justify-content: center;
                color: var(--vscode-foreground);
            }
            
            .tool-info-btn:hover {
                background-color: var(--vscode-list-hoverBackground);
            }
            
            .experimental-details {
                margin-top: 8px;
                padding: 8px;
                background-color: var(--vscode-editor-background);
                border: 1px solid var(--vscode-input-border);
                border-radius: 4px;
                font-size: 0.85em;
            }
            
            .stability-note {
                margin-bottom: 8px;
                color: var(--vscode-problemsWarningIcon-foreground);
            }
            
            .features-list ul {
                margin: 4px 0 0 16px;
                padding: 0;
            }
            
            .features-list li {
                margin-bottom: 2px;
            }
            
            .experimental-tool-selected {
                background-color: rgba(255, 193, 7, 0.2);
                border-color: var(--vscode-problemsWarningIcon-foreground);
            }
        `;
    }
    
    static generateExperimentalToolsJS(): string {
        return `
            function setupExperimentalToolsInteraction() {
                // Handle experimental tool info buttons
                document.addEventListener('click', (e) => {
                    if (e.target.classList.contains('tool-info-btn')) {
                        const toolName = e.target.dataset.tool;
                        vscode.postMessage({ 
                            type: 'requestExperimentalToolInfo', 
                            toolName: toolName 
                        });
                    }
                });
                
                // Handle experimental tool selection
                document.addEventListener('change', (e) => {
                    if (e.target.type === 'checkbox' && e.target.dataset.experimental === 'true') {
                        handleExperimentalToolSelection(e.target);
                    }
                });
                
                // Toggle experimental tool details
                document.addEventListener('click', (e) => {
                    if (e.target.classList.contains('tool-name') && 
                        e.target.closest('.experimental-tool')) {
                        const details = e.target.closest('.tool-item').querySelector('.experimental-details');
                        if (details) {
                            details.style.display = details.style.display === 'none' ? 'block' : 'none';
                        }
                    }
                });
            }
            
            function handleExperimentalToolSelection(checkbox) {
                const toolItem = checkbox.closest('.tool-item');
                
                if (checkbox.checked) {
                    toolItem.classList.add('experimental-tool-selected');
                    showExperimentalToolWarning(checkbox.value);
                } else {
                    toolItem.classList.remove('experimental-tool-selected');
                    updateExperimentalWarningCount();
                }
            }
            
            function showExperimentalToolWarning(toolName) {
                // Show a confirmation dialog for experimental tools
                const confirmed = confirm(
                    'You are about to enable an experimental tool: ' + toolName + '\\n\\n' +
                    'Experimental features are in active development and may change or be removed at any time. ' +
                    'Use with caution in production workflows.\\n\\n' +
                    'Do you want to continue?'
                );
                
                if (!confirmed) {
                    const checkbox = document.querySelector('input[value="' + toolName + '"]');
                    if (checkbox) {
                        checkbox.checked = false;
                        checkbox.closest('.tool-item').classList.remove('experimental-tool-selected');
                    }
                }
                
                updateExperimentalWarningCount();
            }
            
            function updateExperimentalWarningCount() {
                const selectedExperimental = document.querySelectorAll('input[data-experimental="true"]:checked');
                const warningDiv = document.querySelector('.experimental-selection-warning');
                
                if (selectedExperimental.length > 0) {
                    if (!warningDiv) {
                        const warning = document.createElement('div');
                        warning.className = 'experimental-selection-warning';
                        warning.innerHTML = 
                            '<div class="warning-icon">⚠️</div>' +
                            '<div class="warning-text">' +
                            'You have selected <strong>' + selectedExperimental.length + '</strong> experimental tool(s). ' +
                            'These features may change or be removed at any time.' +
                            '</div>';
                        
                        const toolSections = document.getElementById('tool-sections');
                        toolSections.appendChild(warning);
                    } else {
                        const warningText = warningDiv.querySelector('.warning-text');
                        warningText.innerHTML = 
                            'You have selected <strong>' + selectedExperimental.length + '</strong> experimental tool(s). ' +
                            'These features may change or be removed at any time.';
                    }
                } else if (warningDiv) {
                    warningDiv.remove();
                }
            }
            
            function handleExperimentalToolInfo(toolInfo) {
                if (!toolInfo) return;
                
                let message = toolInfo.displayName + '\\n\\n';
                message += toolInfo.description + '\\n\\n';
                message += 'Stability: ' + toolInfo.stabilityNote + '\\n\\n';
                
                if (toolInfo.features && toolInfo.features.length > 0) {
                    message += 'Features:\\n';
                    toolInfo.features.forEach(feature => {
                        message += '• ' + feature + '\\n';
                    });
                    message += '\\n';
                }
                
                if (toolInfo.usage && toolInfo.usage.length > 0) {
                    message += 'Usage Examples:\\n';
                    toolInfo.usage.forEach(usage => {
                        message += '• ' + usage + '\\n';
                    });
                }
                
                alert(message);
            }
        `;
    }
}
