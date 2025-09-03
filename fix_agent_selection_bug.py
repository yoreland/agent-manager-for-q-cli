#!/usr/bin/env python3
"""
Fix for Agent Selection Bug in Q CLI Agent Manager

This script identifies and fixes the bug where clicking on an active agent
(green icon) causes the selection to toggle the active state.

The issue is in the AgentManagementService.createAgentItemFromConfig method
where the icon is dynamically determined based on terminal state every time
the tree item is created, causing state changes during selection.
"""

import os
import re
from typing import List, Tuple

def find_problematic_code(file_path: str) -> List[Tuple[int, str]]:
    """Find lines that cause the selection bug."""
    problematic_lines = []
    
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    for i, line in enumerate(lines, 1):
        # Look for the problematic icon assignment in createAgentItemFromConfig
        if 'iconPath: this.getAgentIcon(' in line:
            problematic_lines.append((i, line.strip()))
    
    return problematic_lines

def fix_agent_management_service(file_path: str) -> bool:
    """Fix the agent selection bug in AgentManagementService."""
    
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the createAgentItemFromConfig method
    method_pattern = r'(private createAgentItemFromConfig\(config: AgentConfig, filePath: string\): AgentItem \{[^}]+iconPath: this\.getAgentIcon\(config\.name\),[^}]+\})'
    
    if not re.search(method_pattern, content, re.DOTALL):
        print("Could not find the problematic method pattern")
        return False
    
    # Replace the dynamic icon assignment with static icon
    # The icon should be updated only when the agent list is refreshed, not on every tree item creation
    fixed_method = '''private createAgentItemFromConfig(config: AgentConfig, filePath: string, isRunning?: boolean): AgentItem {
        return {
            label: config.name,
            iconPath: isRunning ? 
                new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.green')) : 
                AGENT_CONSTANTS.DEFAULT_ICON,
            contextValue: AGENT_CONSTANTS.CONTEXT_VALUES.AGENT_ITEM,
            filePath,
            config,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            command: {
                command: AGENT_COMMANDS.OPEN_AGENT,
                title: 'Open Agent Configuration',
                arguments: [{ label: config.name, filePath, config }]
            }
        };
    }'''
    
    # Replace the method
    content = re.sub(
        method_pattern,
        fixed_method,
        content,
        flags=re.DOTALL
    )
    
    # Update the getAgentList method to pass the running state
    get_agent_list_pattern = r'(const agentItem = this\.createAgentItemFromConfig\(config, filePath\);)'
    replacement = '''const isRunning = this.isAgentRunning(config.name);
                    const agentItem = this.createAgentItemFromConfig(config, filePath, isRunning);'''
    
    content = re.sub(get_agent_list_pattern, replacement, content)
    
    # Write the fixed content back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    return True

def main():
    """Main function to fix the agent selection bug."""
    
    # Path to the AgentManagementService file
    service_file = "/Users/jungseob/workspace/context-manager-for-q-cli/src/services/agentManagementService.ts"
    
    if not os.path.exists(service_file):
        print(f"Error: File not found: {service_file}")
        return
    
    print("🔍 Analyzing agent selection bug...")
    
    # Find problematic code
    problematic_lines = find_problematic_code(service_file)
    
    if problematic_lines:
        print(f"📍 Found problematic code at lines: {[line[0] for line in problematic_lines]}")
        for line_num, line_content in problematic_lines:
            print(f"   Line {line_num}: {line_content}")
    else:
        print("❌ Could not find the problematic code pattern")
        return
    
    print("\n🔧 Applying fix...")
    
    # Create backup
    backup_file = service_file + ".backup"
    with open(service_file, 'r') as src, open(backup_file, 'w') as dst:
        dst.write(src.read())
    print(f"📋 Backup created: {backup_file}")
    
    # Apply fix
    if fix_agent_management_service(service_file):
        print("✅ Bug fix applied successfully!")
        print("\n📝 Changes made:")
        print("   1. Modified createAgentItemFromConfig to accept isRunning parameter")
        print("   2. Icon state is now determined during agent list refresh, not on tree item creation")
        print("   3. This prevents icon state changes during selection events")
        
        print("\n🧪 To test the fix:")
        print("   1. Rebuild the extension: npm run compile")
        print("   2. Reload VS Code window")
        print("   3. Try clicking on active agents (green icons)")
        print("   4. Selection should not affect the active state")
        
    else:
        print("❌ Failed to apply fix")
        # Restore backup
        with open(backup_file, 'r') as src, open(service_file, 'w') as dst:
            dst.write(src.read())
        print("🔄 Backup restored")

if __name__ == "__main__":
    main()
