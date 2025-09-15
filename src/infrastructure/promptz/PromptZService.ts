import * as vscode from 'vscode';
import * as https from 'https';

export interface PromptZPrompt {
  id: string;
  name: string;
  content: string;
  rules?: string[];
}

export interface PromptZRule {
  id: string;
  name: string;
  content: string;
}

export interface PromptZAgent {
  id: string;
  name: string;
  content: string;
}

export type PromptZItemType = 'prompt' | 'rule' | 'agent';

export interface PromptZItem {
  id: string;
  name: string;
  content: string;
  type: PromptZItemType;
  slug?: string;
}

export class PromptZService {
  private getConfig() {
    const config = vscode.workspace.getConfiguration('qcli-agents.promptz');
    const apiUrl = config.get<string>('apiUrl') || '';
    const apiKey = config.get<string>('apiKey') || '';
    
    if (!apiUrl || !apiKey) {
      throw new Error('PromptZ API URL and API Key must be configured in VS Code settings. Go to Settings > Extensions > Agent Manager for Q CLI > PromptZ');
    }
    
    // Validate URL format
    try {
      new URL(apiUrl);
    } catch {
      throw new Error('Invalid PromptZ API URL format. Please check your configuration.');
    }
    
    return { apiUrl, apiKey };
  }

  async getPrompts(): Promise<PromptZPrompt[]> {
    try {
      this.getConfig();
    } catch (configError) {
      throw configError;
    }

    const promptList = await this.getPromptList();
    
    // Convert to PromptZPrompt format with placeholder content
    return promptList.map(p => ({
      id: p.id,
      name: p.name,
      content: `This is a placeholder prompt for ${p.name}. You can customize this content after creating the agent.`
    }));
  }

  async getAllItems(): Promise<PromptZItem[]> {
    try {
      this.getConfig();
    } catch (configError) {
      throw configError;
    }

    const [prompts, rules, agents] = await Promise.all([
      this.getPromptList(),
      this.getRuleList(),
      this.getAgentList()
    ]);

    return [
      ...prompts.map(p => ({ ...p, type: 'prompt' as PromptZItemType, content: p.description })),
      ...rules.map(r => ({ ...r, type: 'rule' as PromptZItemType, content: r.description })),
      ...agents.map(a => ({ ...a, type: 'agent' as PromptZItemType, content: a.description }))
    ];
  }

  private async getPromptList(): Promise<{id: string, name: string, description: string, slug: string}[]> {
    const query = `
      query {
        searchPrompts {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `;

    return this.makeGraphQLRequest(query, 'searchPrompts');
  }

  private async getRuleList(): Promise<{id: string, name: string, description: string, slug: string}[]> {
    const query = `
      query {
        searchProjectRules {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `;

    return this.makeGraphQLRequest(query, 'searchProjectRules');
  }

  private async getAgentList(): Promise<{id: string, name: string, description: string, slug: string}[]> {
    const query = `
      query {
        searchAgents {
          results {
            id
            name
            description
            slug
          }
        }
      }
    `;

    return this.makeGraphQLRequest(query, 'searchAgents');
  }

  async getFullContent(slug: string, type: PromptZItemType): Promise<string> {
    let query: string;
    let queryName: string;
    let contentField: string;

    switch (type) {
      case 'prompt':
        query = `
          query ListPromptBySlug($slug: String!) {
            listPromptBySlug(slug: $slug) {
              items {
                content
              }
            }
          }
        `;
        queryName = 'listPromptBySlug';
        contentField = 'content';
        break;
      case 'rule':
        query = `
          query ListProjectRuleBySlug($slug: String!) {
            listProjectRuleBySlug(slug: $slug) {
              items {
                content
              }
            }
          }
        `;
        queryName = 'listProjectRuleBySlug';
        contentField = 'content';
        break;
      case 'agent':
        query = `
          query ListAgentBySlug($slug: String!) {
            listAgentBySlug(slug: $slug) {
              items {
                id
                name
                description
                prompt
                tools
                resources
                allowedTools
                mcpServers
                hooks
                toolsSettings
                toolAliases
                useLegacyMcpJson
                scope
                owner
                createdAt
                updatedAt
              }
            }
          }
        `;
        queryName = 'listAgentBySlug';
        contentField = 'prompt';
        break;
      default:
        throw new Error(`Unknown type: ${type}`);
    }

    const result = await this.makeGraphQLRequestWithVariables(query, { slug }, queryName);
    
    if (type === 'agent') {
      // For agents, return the full agent configuration as JSON
      const agentData = result?.items?.[0];
      if (agentData) {
        return JSON.stringify(agentData, null, 2);
      }
    }
    
    // For prompts and rules, return the content field
    return result?.items?.[0]?.[contentField] || '';
  }

  private async makeGraphQLRequestWithVariables(query: string, variables: any, resultPath: string): Promise<any> {
    const { apiUrl, apiKey } = this.getConfig();

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ query, variables });
      
      let url: URL;
      try {
        url = new URL(apiUrl);
      } catch (urlError) {
        reject(new Error(`Invalid API URL: ${apiUrl}`));
        return;
      }
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
          'x-api-key': apiKey,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`));
              return;
            }
            
            const result = JSON.parse(data);
            if (result.errors) {
              reject(new Error(`GraphQL error: ${result.errors[0].message}`));
            } else {
              resolve(result.data?.[resultPath]);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}...`));
          }
        });
      });

      req.on('error', (error) => {
        if (error.message.includes('ENOTFOUND')) {
          reject(new Error(`Cannot connect to PromptZ API: ${url.hostname} not found`));
        } else {
          reject(new Error(`Network error: ${error.message}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  private async makeGraphQLRequest(query: string, resultPath: string): Promise<any[]> {
    const { apiUrl, apiKey } = this.getConfig();

    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({ query });
      
      let url: URL;
      try {
        url = new URL(apiUrl);
      } catch (urlError) {
        reject(new Error(`Invalid API URL: ${apiUrl}`));
        return;
      }
      
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': apiKey,
          'x-api-key': apiKey,
          'Content-Length': Buffer.byteLength(postData)
        },
        timeout: 10000
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            if (res.statusCode && res.statusCode >= 400) {
              reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage || 'Request failed'}`));
              return;
            }
            
            const result = JSON.parse(data);
            if (result.errors) {
              reject(new Error(`GraphQL error: ${result.errors[0].message}`));
            } else {
              const pathParts = resultPath.split('.');
              let responseData = result.data;
              for (const part of pathParts) {
                responseData = responseData?.[part];
              }
              resolve(responseData?.results || []);
            }
          } catch (e) {
            reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}...`));
          }
        });
      });

      req.on('error', (error) => {
        if (error.message.includes('ENOTFOUND')) {
          reject(new Error(`Cannot connect to PromptZ API: ${url.hostname} not found`));
        } else {
          reject(new Error(`Network error: ${error.message}`));
        }
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.write(postData);
      req.end();
    });
  }

  /**
   * Test the PromptZ connection and configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getPrompts();
      return true;
    } catch (error) {
      console.error('PromptZ connection test failed:', error);
      return false;
    }
  }
}
