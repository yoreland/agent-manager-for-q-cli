import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { PromptZService, PromptZItem } from '../../infrastructure/promptz/PromptZService';
import { AgentConfigService } from '../../application/agent/AgentConfigService';

export class PromptZSyncCommand {
  constructor(
    private promptzService: PromptZService,
    private agentConfigService: AgentConfigService
  ) {}

  async execute(): Promise<void> {
    try {
      // Show progress while fetching
      const items = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Fetching items from PromptZ...",
        cancellable: true
      }, async (progress, token) => {
        // Check for cancellation
        if (token.isCancellationRequested) {
          throw new Error('Operation cancelled by user');
        }
        
        progress.report({ increment: 30, message: "Connecting to PromptZ..." });
        
        const result = await this.promptzService.getAllItems();
        
        progress.report({ increment: 70, message: "Processing items..." });
        
        return result;
      });
      
      if (items.length === 0) {
        vscode.window.showInformationMessage('No items found in PromptZ. Make sure you have prompts, rules, or agents in your PromptZ account.');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        items.map(item => ({ 
          label: `${this.getTypeIcon(item.type)} ${item.name}`, 
          description: `${item.type.toUpperCase()} - ${item.id}`,
          detail: item.content.substring(0, 100) + (item.content.length > 100 ? '...' : ''),
          item: item 
        })),
        { 
          placeHolder: 'Select an item to create an agent from',
          matchOnDescription: true,
          matchOnDetail: true,
          ignoreFocusOut: true
        }
      );

      if (!selected) {
        return;
      }

      // Create agent with progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `Creating ${selected.item.type} "${selected.item.name}"...`,
        cancellable: false
      }, async () => {
        await this.createAgentFromItem(selected.item);
      });

      const itemType = selected.item.type;
      const location = itemType === 'agent' ? 'agent' : 'rule';
      const format = itemType === 'agent' ? 'JSON' : 'Markdown';
      
      vscode.window.showInformationMessage(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} "${selected.item.name}" created successfully as ${format} ${location}!`);
      
      // Refresh the agent tree
      vscode.commands.executeCommand('qcli-agents.refreshTree');
      
    } catch (error) {
      if (error instanceof Error) {
        // Handle configuration errors
        if (error.message.includes('configuration missing') || 
            error.message.includes('must be configured') ||
            error.message.includes('API URL and API Key')) {
          const action = await vscode.window.showErrorMessage(
            'PromptZ is not configured. Please set your API URL and API Key in VS Code settings. Get them from https://promptz.dev/mcp',
            'Open Settings',
            'Learn More'
          );
          
          if (action === 'Open Settings') {
            vscode.commands.executeCommand('workbench.action.openSettings', 'qcli-agents.promptz');
          } else if (action === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://promptz.dev/mcp'));
          }
          return;
        }
        
        // Handle network errors
        if (error.message.includes('Network') || 
            error.message.includes('ENOTFOUND') || 
            error.message.includes('timeout') ||
            error.message.includes('Cannot connect')) {
          vscode.window.showErrorMessage(
            `Failed to connect to PromptZ: ${error.message}. Please check your network connection and API configuration.`
          );
          return;
        }
        
        // Handle API errors
        if (error.message.includes('HTTP') || 
            error.message.includes('GraphQL') ||
            error.message.includes('Invalid JSON')) {
          vscode.window.showErrorMessage(
            `PromptZ API error: ${error.message}. Please check your API key and try again.`
          );
          return;
        }
      }
      
      // Generic error handling
      vscode.window.showErrorMessage(`PromptZ sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getTypeIcon(type: string): string {
    switch (type) {
      case 'prompt': return '💬';
      case 'rule': return '📋';
      case 'agent': return '🤖';
      default: return '📄';
    }
  }

  private async createAgentFromItem(item: PromptZItem): Promise<void> {
    const itemName = item.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    if (item.type === 'agent') {
      // Get full content from PromptZ using slug
      const fullContent = await this.promptzService.getFullContent(item.slug || item.id, item.type);
      
      // For agents, parse the JSON configuration and create a proper agent
      let agentData;
      try {
        agentData = JSON.parse(fullContent);
      } catch (error) {
        // Fallback to basic configuration if parsing fails
        agentData = { prompt: fullContent || item.content };
      }
      
      const agentConfig = this.agentConfigService.createAgentConfigFromTemplate(itemName, {
        description: `Synced from PromptZ ${item.type}: ${item.name}`,
        prompt: agentData.prompt || fullContent || item.content || null,
        additionalTools: Array.isArray(agentData.tools) ? agentData.tools : ['fs_read', 'fs_write', 'execute_bash'],
        additionalResources: Array.isArray(agentData.resources) ? agentData.resources : []
      });

      // Override with PromptZ agent configuration if available and valid
      if (Array.isArray(agentData.allowedTools)) {
        agentConfig.allowedTools = agentData.allowedTools;
      }
      
      // Parse JSON string fields
      if (agentData.mcpServers) {
        try {
          const mcpServers = typeof agentData.mcpServers === 'string' 
            ? JSON.parse(agentData.mcpServers) 
            : agentData.mcpServers;
          agentConfig.mcpServers = mcpServers;
        } catch (error) {
          // Ignore parsing errors for optional fields
        }
      }
      
      if (agentData.hooks) {
        try {
          const hooks = typeof agentData.hooks === 'string' 
            ? JSON.parse(agentData.hooks) 
            : agentData.hooks;
          agentConfig.hooks = hooks;
        } catch (error) {
          // Ignore parsing errors for optional fields
        }
      }
      
      if (agentData.toolsSettings) {
        try {
          const toolsSettings = typeof agentData.toolsSettings === 'string' 
            ? JSON.parse(agentData.toolsSettings) 
            : agentData.toolsSettings;
          agentConfig.toolsSettings = toolsSettings;
        } catch (error) {
          // Ignore parsing errors for optional fields
        }
      }
      
      if (agentData.toolAliases) {
        try {
          const toolAliases = typeof agentData.toolAliases === 'string' 
            ? JSON.parse(agentData.toolAliases) 
            : agentData.toolAliases;
          agentConfig.toolAliases = toolAliases;
        } catch (error) {
          // Ignore parsing errors for optional fields
        }
      }
      
      if (typeof agentData.useLegacyMcpJson === 'boolean') {
        agentConfig.useLegacyMcpJson = agentData.useLegacyMcpJson;
      }

      await this.agentConfigService.writeAgentConfig(agentConfig.name, agentConfig, false);
    } else {
      // Create Markdown files for prompts and rules
      const fullContent = await this.promptzService.getFullContent(item.slug || item.id, item.type);
      const contentToUse = fullContent || item.content || `${item.type}: ${item.name}`;
      await this.createMarkdownRule({ ...item, content: contentToUse }, itemName);
    }
  }

  private async createMarkdownRule(item: PromptZItem, fileName: string): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace found. Please open a workspace to sync prompts and rules.');
    }

    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const rulesDir = path.join(workspaceRoot, '.amazonq', 'rules');
    
    // Ensure rules directory exists
    await fs.mkdir(rulesDir, { recursive: true });
    
    const filePath = path.join(rulesDir, `${fileName}.md`);
    
    const markdownContent = `# ${item.name}

**Type:** ${item.type.charAt(0).toUpperCase() + item.type.slice(1)}  
**Source:** PromptZ  
**ID:** ${item.id}  
**Synced:** ${new Date().toISOString()}

## Content

${item.content}

---
*This file was automatically synced from PromptZ*
`;

    await fs.writeFile(filePath, markdownContent, 'utf-8');
  }
}
