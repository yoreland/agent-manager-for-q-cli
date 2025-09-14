/**
 * @fileoverview Performance monitoring utilities for Agent Manager extension.
 * 
 * This module provides performance tracking capabilities including activation
 * time monitoring, memory usage tracking, and metrics collection to ensure
 * the extension meets performance requirements.
 * 
 * @author Agent Manager for Q CLI Extension
 * @since 0.1.0
 */

import { getExtensionState } from '../../extension';

/**
 * Performance metrics data structure.
 * 
 * Contains timing and memory usage information for performance analysis
 * and optimization of extension operations.
 * 
 * @interface PerformanceMetrics
 */
export interface PerformanceMetrics {
    /** Extension activation time in milliseconds */
    activationTime: number;
    /** Node.js memory usage statistics */
    memoryUsage: NodeJS.MemoryUsage;
    /** Timestamp when metrics were collected */
    timestamp: number;
}

/**
 * Performance monitor class for tracking extension performance.
 * 
 * Singleton class that provides performance monitoring capabilities
 * including activation time tracking, memory usage monitoring, and
 * metrics history management with configurable retention.
 * 
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 * monitor.startActivationTracking();
 * // ... extension activation code ...
 * monitor.recordActivationComplete();
 * ```
 */
export class PerformanceMonitor {
    /** Singleton instance */
    private static instance: PerformanceMonitor | undefined;
    /** Activation start timestamp */
    private activationStartTime: number = 0;
    /** Performance metrics history */
    private metrics: PerformanceMetrics[] = [];
    /** Maximum number of metrics to retain in history */
    private readonly maxMetricsHistory = 10;

    /** Private constructor for singleton pattern */
    private constructor() {}

    /**
     * Gets the singleton instance of PerformanceMonitor.
     * 
     * @returns The PerformanceMonitor singleton instance
     */
    public static getInstance(): PerformanceMonitor {
        if (!PerformanceMonitor.instance) {
            PerformanceMonitor.instance = new PerformanceMonitor();
        }
        return PerformanceMonitor.instance;
    }

    /**
     * Start tracking activation time
     */
    public startActivationTracking(): void {
        this.activationStartTime = Date.now();
    }

    /**
     * End tracking activation time and record metrics
     */
    public endActivationTracking(): PerformanceMetrics {
        const activationTime = Date.now() - this.activationStartTime;
        const memoryUsage = process.memoryUsage();
        
        const metrics: PerformanceMetrics = {
            activationTime,
            memoryUsage,
            timestamp: Date.now()
        };

        // Add to metrics history (keep only recent ones)
        this.metrics.push(metrics);
        if (this.metrics.length > this.maxMetricsHistory) {
            this.metrics.shift();
        }

        // Log performance metrics
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.logLifecycle('Performance metrics recorded', {
                activationTime: `${activationTime}ms`,
                memoryUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
                memoryTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
            });

            // Warn if activation time exceeds target
            if (activationTime > 100) {
                extensionState.logger.warn(
                    `Extension activation took ${activationTime}ms, exceeding 100ms target`
                );
            }
        }

        return metrics;
    }

    /**
     * Get current memory usage
     */
    public getCurrentMemoryUsage(): NodeJS.MemoryUsage {
        return process.memoryUsage();
    }

    /**
     * Get performance metrics history
     */
    public getMetricsHistory(): PerformanceMetrics[] {
        return [...this.metrics]; // Return copy to prevent modification
    }

    /**
     * Get average activation time from recent metrics
     */
    public getAverageActivationTime(): number {
        if (this.metrics.length === 0) {
            return 0;
        }

        const total = this.metrics.reduce((sum, metric) => sum + metric.activationTime, 0);
        return total / this.metrics.length;
    }

    /**
     * Check if performance requirements are met
     */
    public checkPerformanceRequirements(): {
        activationTimeOk: boolean;
        memoryUsageOk: boolean;
        details: {
            activationTime: number;
            memoryUsageMB: number;
            activationTimeTarget: number;
            memoryUsageTargetMB: number;
        };
    } {
        const currentMemory = this.getCurrentMemoryUsage();
        const latestMetrics = this.metrics[this.metrics.length - 1];
        const activationTime = latestMetrics?.activationTime || 0;
        const memoryUsageMB = Math.round(currentMemory.heapUsed / 1024 / 1024);

        const activationTimeTarget = 100; // 100ms target
        const memoryUsageTargetMB = 50; // 50MB target for basic extension

        return {
            activationTimeOk: activationTime <= activationTimeTarget,
            memoryUsageOk: memoryUsageMB <= memoryUsageTargetMB,
            details: {
                activationTime,
                memoryUsageMB,
                activationTimeTarget,
                memoryUsageTargetMB
            }
        };
    }

    /**
     * Force garbage collection if available (development only)
     */
    public forceGarbageCollection(): void {
        if (global.gc && process.env['NODE_ENV'] !== 'production') {
            const beforeMemory = process.memoryUsage();
            global.gc();
            const afterMemory = process.memoryUsage();
            
            const extensionState = getExtensionState();
            if (extensionState?.logger) {
                const freedMB = Math.round((beforeMemory.heapUsed - afterMemory.heapUsed) / 1024 / 1024);
                extensionState.logger.debug(`Garbage collection freed ${freedMB}MB`);
            }
        }
    }

    /**
     * Clear metrics history to free memory
     */
    public clearMetricsHistory(): void {
        this.metrics.length = 0;
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.debug('Performance metrics history cleared');
        }
    }

    /**
     * Dispose of the performance monitor
     */
    public dispose(): void {
        this.clearMetricsHistory();
        PerformanceMonitor.instance = undefined;
    }
}

/**
 * Utility function to measure execution time of async operations
 */
export async function measureAsyncOperation<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<{ result: T; duration: number }> {
    const startTime = Date.now();
    
    try {
        const result = await operation();
        const duration = Date.now() - startTime;
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.logTiming(operationName, startTime);
        }
        
        return { result, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.error(`${operationName} failed after ${duration}ms`, error as Error);
        }
        
        throw error;
    }
}

/**
 * Utility function to measure execution time of synchronous operations
 */
export function measureSyncOperation<T>(
    operation: () => T,
    operationName: string
): { result: T; duration: number } {
    const startTime = Date.now();
    
    try {
        const result = operation();
        const duration = Date.now() - startTime;
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.logTiming(operationName, startTime);
        }
        
        return { result, duration };
    } catch (error) {
        const duration = Date.now() - startTime;
        
        const extensionState = getExtensionState();
        if (extensionState?.logger) {
            extensionState.logger.error(`${operationName} failed after ${duration}ms`, error as Error);
        }
        
        throw error;
    }
}