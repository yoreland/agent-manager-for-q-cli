/**
 * Unit tests for context tree provider
 */

import * as vscode from 'vscode';
import { ContextTreeProvider } from '../providers/contextTreeProvider';

jest.mock('vscode');

describe('Context Tree Provider Tests', () => {
  let provider: ContextTreeProvider;

  beforeEach(() => {
    provider = new ContextTreeProvider();
    jest.clearAllMocks();
  });

  afterEach(() => {
    provider.dispose();
  });

  test('should initialize correctly', () => {
    expect(provider).toBeDefined();
    expect(provider.onDidChangeTreeData).toBeDefined();
  });

  test('should return welcome message when no context items', async () => {
    const children = await provider.getChildren();
    
    expect(children).toHaveLength(1);
    expect(children[0]?.label).toBe('Welcome to Q CLI Context Manager');
    expect(children[0]?.description).toBe('No context files added yet');
  });

  test('should return tree item correctly', () => {
    const mockContextItem = {
      label: 'Test File',
      description: 'test.ts',
      iconPath: new vscode.ThemeIcon('file'),
      contextValue: 'contextFile'
    };
    
    const treeItem = provider.getTreeItem(mockContextItem);
    
    expect(treeItem).toBeDefined();
    expect(treeItem.description).toBe('test.ts');
    expect(treeItem.iconPath).toEqual(new vscode.ThemeIcon('file'));
    expect(treeItem.contextValue).toBe('contextFile');
  });

  test('should handle tree item creation with minimal data', () => {
    const mockContextItem = {
      label: 'Minimal Item'
    };
    
    const treeItem = provider.getTreeItem(mockContextItem);
    
    expect(treeItem).toBeDefined();
    expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.None);
  });

  test('should handle tree item creation with children', () => {
    const mockContextItem = {
      label: 'Parent Item',
      children: [
        { label: 'Child 1' },
        { label: 'Child 2' }
      ]
    };
    
    const treeItem = provider.getTreeItem(mockContextItem);
    
    expect(treeItem).toBeDefined();
    expect(treeItem.collapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
  });

  test('should return children for parent items', async () => {
    const mockParentItem = {
      label: 'Parent Item',
      children: [
        { label: 'Child 1', description: 'child1.ts' },
        { label: 'Child 2', description: 'child2.ts' }
      ]
    };
    
    const children = await provider.getChildren(mockParentItem);
    
    expect(children).toHaveLength(2);
    expect(children[0]?.label).toBe('Child 1');
    expect(children[1]?.label).toBe('Child 2');
  });

  test('should add context items correctly', () => {
    const newItem = {
      label: 'New File',
      description: 'new.ts',
      iconPath: new vscode.ThemeIcon('file'),
      contextValue: 'contextFile'
    };
    
    provider.addContextItem(newItem);
    
    const contextItems = provider.getContextItems();
    expect(contextItems).toHaveLength(1);
    expect(contextItems[0]?.label).toBe('New File');
  });

  test('should handle disposal correctly', () => {
    provider.dispose();
    
    // After disposal, should return empty arrays
    expect(provider.getChildren()).resolves.toEqual([]);
    expect(provider.getContextItems()).toEqual([]);
  });
});