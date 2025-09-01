import { ILogger } from '../infrastructure/ILogger';

export class BundleOptimizer {
    private loadedModules = new Set<string>();
    private moduleLoadTimes = new Map<string, number>();

    constructor(private logger: ILogger) {}

    async loadModuleLazy<T>(
        moduleName: string,
        loader: () => Promise<T>
    ): Promise<T> {
        if (this.loadedModules.has(moduleName)) {
            this.logger.debug('Module already loaded', { moduleName });
            return loader();
        }

        const startTime = Date.now();
        
        try {
            const module = await loader();
            const loadTime = Date.now() - startTime;
            
            this.loadedModules.add(moduleName);
            this.moduleLoadTimes.set(moduleName, loadTime);
            
            this.logger.debug('Module loaded', { moduleName, loadTime });
            return module;
        } catch (error) {
            this.logger.error('Failed to load module', error as Error, { moduleName });
            throw error;
        }
    }

    getLoadedModules(): string[] {
        return Array.from(this.loadedModules);
    }

    getModuleLoadTimes(): Map<string, number> {
        return new Map(this.moduleLoadTimes);
    }

    analyzeBundle(): BundleAnalysis {
        const totalModules = this.loadedModules.size;
        const totalLoadTime = Array.from(this.moduleLoadTimes.values())
            .reduce((sum, time) => sum + time, 0);
        
        const slowestModule = this.findSlowestModule();
        
        return {
            totalModules,
            totalLoadTime,
            averageLoadTime: totalModules > 0 ? totalLoadTime / totalModules : 0,
            slowestModule
        };
    }

    private findSlowestModule(): { name: string; loadTime: number } | null {
        let slowest: { name: string; loadTime: number } | null = null;
        
        for (const [name, loadTime] of this.moduleLoadTimes.entries()) {
            if (!slowest || loadTime > slowest.loadTime) {
                slowest = { name, loadTime };
            }
        }
        
        return slowest;
    }

    logBundleAnalysis(): void {
        const analysis = this.analyzeBundle();
        
        this.logger.info('Bundle Analysis', {
            totalModules: analysis.totalModules,
            totalLoadTime: analysis.totalLoadTime,
            averageLoadTime: Math.round(analysis.averageLoadTime),
            slowestModule: analysis.slowestModule
        });
    }
}

export interface BundleAnalysis {
    totalModules: number;
    totalLoadTime: number;
    averageLoadTime: number;
    slowestModule: { name: string; loadTime: number } | null;
}
