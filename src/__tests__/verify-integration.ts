/**
 * Integration verification script
 * This script verifies that all integration requirements are met
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  requirement: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details?: string;
}

class IntegrationVerifier {
  private results: TestResult[] = [];
  private packageJson: any;

  constructor() {
    // Load package.json for verification
    const packagePath = path.join(__dirname, '../../package.json');
    this.packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  }

  /**
   * Run all integration verifications
   */
  async runVerification(): Promise<void> {
    console.log('🔍 Q CLI Context Manager - Integration Verification');
    console.log('================================================\n');

    // Verify package.json structure (Requirement 5.3)
    this.verifyPackageJsonStructure();

    // Verify extension manifest (Requirements 1.1, 1.3)
    this.verifyExtensionManifest();

    // Verify command registration (Requirement 2.1)
    this.verifyCommandRegistration();

    // Verify Activity Bar integration (Requirement 3.1)
    this.verifyActivityBarIntegration();

    // Verify view configuration (Requirements 3.2, 3.3)
    this.verifyViewConfiguration();

    // Verify configuration schema (Requirement 4.4)
    this.verifyConfigurationSchema();

    // Verify activation events (Requirement 1.2)
    this.verifyActivationEvents();

    // Verify file structure
    this.verifyFileStructure();

    // Display results
    this.displayResults();
  }

  /**
   * Verify package.json follows VS Code extension standards
   */
  private verifyPackageJsonStructure(): void {
    const requiredFields = [
      'name', 'displayName', 'description', 'version', 'publisher',
      'engines', 'categories', 'main', 'contributes'
    ];

    const missingFields = requiredFields.filter(field => !this.packageJson[field]);

    if (missingFields.length === 0) {
      this.addResult('5.3', 'Package.json contains all required fields', 'PASS');
    } else {
      this.addResult('5.3', 'Package.json missing required fields', 'FAIL', 
        `Missing: ${missingFields.join(', ')}`);
    }

    // Verify VS Code engine version
    if (this.packageJson.engines?.vscode) {
      this.addResult('5.3', 'VS Code engine version specified', 'PASS');
    } else {
      this.addResult('5.3', 'VS Code engine version missing', 'FAIL');
    }

    // Verify main entry point
    if (this.packageJson.main === './out/extension.js') {
      this.addResult('5.3', 'Main entry point correctly specified', 'PASS');
    } else {
      this.addResult('5.3', 'Main entry point incorrect', 'FAIL', 
        `Expected: ./out/extension.js, Got: ${this.packageJson.main}`);
    }
  }

  /**
   * Verify extension manifest structure
   */
  private verifyExtensionManifest(): void {
    const contributes = this.packageJson.contributes;

    if (contributes) {
      this.addResult('1.1', 'Extension contributes section exists', 'PASS');
    } else {
      this.addResult('1.1', 'Extension contributes section missing', 'FAIL');
      return;
    }

    // Check for required contribution points
    const requiredContributions = ['commands', 'viewsContainers', 'views'];
    const missingContributions = requiredContributions.filter(contrib => !contributes[contrib]);

    if (missingContributions.length === 0) {
      this.addResult('1.3', 'All required contribution points present', 'PASS');
    } else {
      this.addResult('1.3', 'Missing contribution points', 'FAIL',
        `Missing: ${missingContributions.join(', ')}`);
    }
  }

  /**
   * Verify command registration
   */
  private verifyCommandRegistration(): void {
    const commands = this.packageJson.contributes?.commands || [];
    
    const requiredCommands = [
      'qcli-context.openContextManager',
      'qcli-context.refreshTree',
      'qcli-context.runIntegrationTests'
    ];

    const registeredCommands = commands.map((cmd: any) => cmd.command);
    const missingCommands = requiredCommands.filter(cmd => !registeredCommands.includes(cmd));

    if (missingCommands.length === 0) {
      this.addResult('2.1', 'All required commands registered', 'PASS');
    } else {
      this.addResult('2.1', 'Missing command registrations', 'FAIL',
        `Missing: ${missingCommands.join(', ')}`);
    }

    // Verify command structure
    const openContextManagerCmd = commands.find((cmd: any) => 
      cmd.command === 'qcli-context.openContextManager'
    );

    if (openContextManagerCmd?.title && openContextManagerCmd?.category) {
      this.addResult('2.1', 'Main command properly configured', 'PASS');
    } else {
      this.addResult('2.1', 'Main command missing title or category', 'FAIL');
    }
  }

  /**
   * Verify Activity Bar integration
   */
  private verifyActivityBarIntegration(): void {
    const viewsContainers = this.packageJson.contributes?.viewsContainers;

    if (viewsContainers?.activitybar) {
      const qcliContainer = viewsContainers.activitybar.find((container: any) => 
        container.id === 'qcli-context'
      );

      if (qcliContainer) {
        this.addResult('3.1', 'Activity Bar container registered', 'PASS');
        
        if (qcliContainer.title && qcliContainer.icon) {
          this.addResult('3.1', 'Activity Bar container properly configured', 'PASS');
        } else {
          this.addResult('3.1', 'Activity Bar container missing title or icon', 'FAIL');
        }
      } else {
        this.addResult('3.1', 'Activity Bar container not found', 'FAIL');
      }
    } else {
      this.addResult('3.1', 'Activity Bar containers not configured', 'FAIL');
    }
  }

  /**
   * Verify view configuration
   */
  private verifyViewConfiguration(): void {
    const views = this.packageJson.contributes?.views;

    if (views?.['qcli-context']) {
      const contextView = views['qcli-context'].find((view: any) => 
        view.id === 'qcli-context-tree'
      );

      if (contextView) {
        this.addResult('3.2', 'Context tree view registered', 'PASS');
        
        if (contextView.name) {
          this.addResult('3.3', 'Context tree view has name', 'PASS');
        } else {
          this.addResult('3.3', 'Context tree view missing name', 'FAIL');
        }
      } else {
        this.addResult('3.2', 'Context tree view not found', 'FAIL');
      }
    } else {
      this.addResult('3.2', 'Views not configured for qcli-context', 'FAIL');
    }

    // Verify menu contributions for refresh
    const menus = this.packageJson.contributes?.menus;
    if (menus?.['view/title']) {
      const refreshMenu = menus['view/title'].find((menu: any) => 
        menu.command === 'qcli-context.refreshTree'
      );

      if (refreshMenu) {
        this.addResult('3.4', 'Refresh menu item configured', 'PASS');
      } else {
        this.addResult('3.4', 'Refresh menu item missing', 'FAIL');
      }
    } else {
      this.addResult('3.4', 'View title menus not configured', 'FAIL');
    }
  }

  /**
   * Verify configuration schema
   */
  private verifyConfigurationSchema(): void {
    const configuration = this.packageJson.contributes?.configuration;

    if (configuration) {
      this.addResult('4.4', 'Configuration schema exists', 'PASS');

      const properties = configuration.properties || {};
      const requiredSettings = [
        'qcli-context.logLevel',
        'qcli-context.enableDebugMode',
        'qcli-context.showOutputOnError',
        'qcli-context.logToConsole'
      ];

      const missingSettings = requiredSettings.filter(setting => !properties[setting]);

      if (missingSettings.length === 0) {
        this.addResult('4.4', 'All required configuration properties present', 'PASS');
      } else {
        this.addResult('4.4', 'Missing configuration properties', 'FAIL',
          `Missing: ${missingSettings.join(', ')}`);
      }
    } else {
      this.addResult('4.4', 'Configuration schema missing', 'FAIL');
    }
  }

  /**
   * Verify activation events
   */
  private verifyActivationEvents(): void {
    const activationEvents = this.packageJson.activationEvents;

    if (activationEvents && Array.isArray(activationEvents)) {
      this.addResult('1.2', 'Activation events configured', 'PASS');

      // Check for command activation
      const hasCommandActivation = activationEvents.some(event => 
        event.startsWith('onCommand:')
      );

      if (hasCommandActivation) {
        this.addResult('1.2', 'Command activation event present', 'PASS');
      } else {
        this.addResult('1.2', 'Command activation event missing', 'FAIL');
      }
    } else {
      this.addResult('1.2', 'Activation events not configured', 'FAIL');
    }
  }

  /**
   * Verify file structure
   */
  private verifyFileStructure(): void {
    const requiredFiles = [
      'src/extension.ts',
      'src/providers/contextTreeProvider.ts',
      // webview removed - using tree view only
      'src/services/logger.ts',
      'src/types/extension.ts',
      'src/types/context.ts',
      'src/utils/performance.ts'
    ];

    const missingFiles = requiredFiles.filter(file => {
      const filePath = path.join(__dirname, '../..', file);
      return !fs.existsSync(filePath);
    });

    if (missingFiles.length === 0) {
      this.addResult('1.3', 'All required source files present', 'PASS');
    } else {
      this.addResult('1.3', 'Missing required source files', 'FAIL',
        `Missing: ${missingFiles.join(', ')}`);
    }

    // Check for test files
    const testFiles = [
      'src/__tests__/extension.test.ts',
      'src/__tests__/commands.test.ts',
      'src/__tests__/contextTreeProvider.test.ts',
      'src/__tests__/integration.test.ts',
      'src/__tests__/e2e.test.ts'
    ];

    const missingTestFiles = testFiles.filter(file => {
      const filePath = path.join(__dirname, '../..', file);
      return !fs.existsSync(filePath);
    });

    if (missingTestFiles.length === 0) {
      this.addResult('1.4', 'All test files present', 'PASS');
    } else {
      this.addResult('1.4', 'Missing test files', 'FAIL',
        `Missing: ${missingTestFiles.join(', ')}`);
    }
  }

  /**
   * Add a test result
   */
  private addResult(requirement: string, description: string, status: 'PASS' | 'FAIL' | 'SKIP', details?: string): void {
    const result: TestResult = { requirement, description, status };
    if (details) {
      result.details = details;
    }
    this.results.push(result);
  }

  /**
   * Display verification results
   */
  private displayResults(): void {
    console.log('\n📊 Verification Results');
    console.log('=======================\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    // Group results by requirement
    const groupedResults = this.results.reduce((groups, result) => {
      if (!groups[result.requirement]) {
        groups[result.requirement] = [];
      }
      groups[result.requirement]!.push(result);
      return groups;
    }, {} as Record<string, TestResult[]>);

    // Display results by requirement
    Object.keys(groupedResults).sort().forEach(requirement => {
      console.log(`\n📋 Requirement ${requirement}:`);
      groupedResults[requirement]!.forEach(result => {
        const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
        console.log(`  ${icon} ${result.description}`);
        if (result.details) {
          console.log(`     ${result.details}`);
        }
      });
    });

    // Summary
    console.log(`\n📈 Summary: ${passed}/${total} checks passed`);
    if (failed > 0) {
      console.log(`❌ ${failed} checks failed`);
    }
    if (skipped > 0) {
      console.log(`⏭️ ${skipped} checks skipped`);
    }

    // Overall result
    if (failed === 0) {
      console.log('\n🎉 All integration requirements verified successfully!');
      console.log('The extension is ready for manual testing in VS Code Extension Development Host.');
    } else {
      console.log('\n⚠️ Some integration requirements failed verification.');
      console.log('Please address the failed checks before proceeding with manual testing.');
    }

    // Next steps
    console.log('\n📝 Next Steps:');
    console.log('1. Run manual integration tests using: src/__tests__/manual-integration-test.md');
    console.log('2. Test in Extension Development Host (F5 in VS Code)');
    console.log('3. Run integration test command: "Q CLI: Run Integration Tests"');
    console.log('4. Package extension: npm run vsce:package');
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  const verifier = new IntegrationVerifier();
  verifier.runVerification().catch(console.error);
}

export { IntegrationVerifier };