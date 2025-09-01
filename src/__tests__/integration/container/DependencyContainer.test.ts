import { DependencyContainer } from '../../../shared/container/DependencyContainer';

describe('DependencyContainer Integration', () => {
    let container: DependencyContainer;

    beforeEach(() => {
        container = new DependencyContainer();
    });

    afterEach(() => {
        container.dispose();
    });

    describe('service registration and resolution', () => {
        it('should register and resolve singleton services', () => {
            let instanceCount = 0;
            
            container.register('testService', () => {
                instanceCount++;
                return { id: instanceCount };
            }, true);

            const instance1 = container.resolve<{id: number}>('testService');
            const instance2 = container.resolve<{id: number}>('testService');

            expect(instance1).toBe(instance2);
            expect(instanceCount).toBe(1);
            expect(instance1.id).toBe(1);
        });

        it('should register and resolve transient services', () => {
            let instanceCount = 0;
            
            container.register('testService', () => {
                instanceCount++;
                return { id: instanceCount };
            }, false);

            const instance1 = container.resolve<{id: number}>('testService');
            const instance2 = container.resolve<{id: number}>('testService');

            expect(instance1).not.toBe(instance2);
            expect(instanceCount).toBe(2);
            expect(instance1.id).toBe(1);
            expect(instance2.id).toBe(2);
        });

        it('should resolve dependencies between services', () => {
            container.register('dependency', () => ({ name: 'dependency' }));
            container.register('service', () => {
                const dep = container.resolve<{name: string}>('dependency');
                return { dependency: dep, name: 'service' };
            });

            const service = container.resolve<{dependency: {name: string}, name: string}>('service');

            expect(service.name).toBe('service');
            expect(service.dependency.name).toBe('dependency');
        });

        it('should throw error for unregistered service', () => {
            expect(() => container.resolve('nonexistent')).toThrow('Service not registered: nonexistent');
        });
    });

    describe('service lifecycle', () => {
        it('should check if service is registered', () => {
            container.register('testService', () => ({}));

            expect(container.has('testService')).toBe(true);
            expect(container.has('nonexistent')).toBe(false);
        });

        it('should dispose services with dispose method', () => {
            const mockDispose = jest.fn();
            
            container.register('disposableService', () => ({
                dispose: mockDispose
            }));

            container.resolve('disposableService');
            container.dispose();

            expect(mockDispose).toHaveBeenCalled();
        });

        it('should handle services without dispose method', () => {
            container.register('simpleService', () => ({ name: 'simple' }));

            container.resolve('simpleService');
            
            expect(() => container.dispose()).not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should throw error when registering on disposed container', () => {
            container.dispose();

            expect(() => container.register('test', () => ({}))).toThrow('Container is disposed');
        });

        it('should throw error when resolving from disposed container', () => {
            container.register('test', () => ({}));
            container.dispose();

            expect(() => container.resolve('test')).toThrow('Container is disposed');
        });

        it('should handle disposal errors gracefully', () => {
            const mockDispose = jest.fn().mockImplementation(() => {
                throw new Error('Disposal error');
            });
            
            container.register('faultyService', () => ({
                dispose: mockDispose
            }));

            container.resolve('faultyService');
            
            // Should not throw despite disposal error
            expect(() => container.dispose()).not.toThrow();
            expect(mockDispose).toHaveBeenCalled();
        });
    });
});
