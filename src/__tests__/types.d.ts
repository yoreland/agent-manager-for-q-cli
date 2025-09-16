/**
 * Type definitions for Jest test environment
 */

declare global {
  namespace NodeJS {
    interface Global {
      mockVscode: any;
    }
  }
}

export {};