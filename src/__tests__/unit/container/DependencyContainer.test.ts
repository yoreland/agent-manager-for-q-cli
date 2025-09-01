import { DependencyContainer } from '../../../shared/container/DependencyContainer';
import { IDependencyContainer, IDisposable } from '../../../shared/container/IDependencyContainer';

describe('DependencyContainer', () => {
    let container: IDependencyContainer;

    beforeEach(() => {
        container = new DependencyContainer();
    });

    afterEach(() => {
        container.dispose();
    });

    describe('Service Registration', () => {
        it('should register a service with factory function', () => {
            const factory = jest.fn(() => ({ value: 'test' }));
            
            container.register('testService', factory);
            
            expect(container.isRegistered('testService')).toBe(true);
        });

        it('should register a service instance directly', () => {
            const instance = { value: 'test' };
            
            container.registerInstance('testService', instance);
            
            expect(container.isRegistered('testService')).toBe(true);
        });

        it('should throw error when registering duplicate service', () => {
            container.register('testService', () => ({}));
            
            expect(() => {
                container.register('testService', () => ({}));
            }).toThrow("Service 'testService' is already registered");
        });

        it('should throw error when registering duplicate instance', () => {
            container.registerInstance('testService', {});
            
            expect(() => {
                container.registerInstance('testService', {});
            }).toThrow("Service 'testService' is already registered");
        });
    });

    describe('Service Resolution', () => {
        it('should resolve registered service', () => {
            const expectedValue = { value: 'test' };
            container.register('testService', () => expectedValue);
            
            const resolved = container.resolve('testService');
            
            expect(resolved).toBe(expectedValue);
        });

        it('should resolve registered instance', () => {
            const expectedValue = { value: 'test' };
            container.registerInstance('testService', expectedValue);
            
            const resolved = container.resolve('testService');
            
            expect(resolved).toBe(expectedValue);
        });

        it('should throw error when resolving unregistered service', () => {
            expect(() => {
                container.resolve('nonExistentService');
            }).toThrow("Service 'nonExistentService' is not registered");
        });

        it('should handle factory function errors gracefully', () => {
            container.register('errorService', () => {
                throw new Error('Factory error');
            });
            
            expect(() => {
                container.resolve('errorService');
            }).toThrow("Failed to create service 'errorService': Factory error");
        });
    });

    describe('Singleton Pattern', () => {
        it('should return same instance for singleton services', () => {
            let callCount = 0;
            container.register('singletonService', () => {
                callCount++;
                return { id: callCount };
            }, true);
            
            const instance1 = container.resolve('singletonService');
            const instance2 = container.resolve('singletonService');
            
            expect(instance1).toBe(instance2);
            expect(callCount).toBe(1);
        });

        it('should return new instance for non-singleton services', () => {
            let callCount = 0;
            container.register('transientService', () => {
                callCount++;
                return { id: callCount };
            }, false);
            
            const instance1 = container.resolve('transientService');
            const instance2 = container.resolve('transientService');
            
            expect(instance1).not.toBe(instance2);
            expect(callCount).toBe(2);
        });

        it('should default to singleton behavior', () => {
            let callCount = 0;
            container.register('defaultService', () => {
                callCount++;
                return { id: callCount };
            });
            
            const instance1 = container.resolve('defaultService');
            const instance2 = container.resolve('defaultService');
            
            expect(instance1).toBe(instance2);
            expect(callCount).toBe(1);
        });
    });

    describe('Service Dependencies', () => {
        it('should resolve service dependencies', () => {
            container.register('dependency', () => ({ name: 'dependency' }));
            container.register('service', () => {
                const dep = container.resolve('dependency');
                return { dependency: dep };
            });
            
            const service = container.resolve('service');
            
            expect((service as any).dependency).toEqual({ name: 'dependency' });
        });

        it('should handle circular dependencies gracefully', () => {
            container.register('serviceA', () => {
                const serviceB = container.resolve('serviceB');
                return { name: 'A', dependency: serviceB };
            });
            
            container.register('serviceB', () => {
                const serviceA = container.resolve('serviceA');
                return { name: 'B', dependency: serviceA };
            });
            
            // This should throw due to circular dependency
            expect(() => {
                container.resolve('serviceA');
            }).toThrow();
        });
    });

    describe('Disposal', () => {
        it('should dispose services that implement IDisposable', () => {
            const disposableMock: IDisposable = {
                dispose: jest.fn()
            };
            
            container.registerInstance('disposableService', disposableMock);
            container.resolve('disposableService'); // Ensure it's instantiated
            
            container.dispose();
            
            expect(disposableMock.dispose).toHaveBeenCalled();
        });

        it('should handle async disposal', async () => {
            const asyncDisposableMock: IDisposable = {
                dispose: jest.fn().mockResolvedValue(undefined)
            };
            
            container.registerInstance('asyncDisposableService', asyncDisposableMock);
            container.resolve('asyncDisposableService');
            
            container.dispose();
            
            // Give async disposal time to complete
            await new Promise(resolve => setTimeout(resolve, 10));
            
            expect(asyncDisposableMock.dispose).toHaveBeenCalled();
        });

        it('should handle disposal errors gracefully', () => {
            const errorDisposableMock: IDisposable = {
                dispose: jest.fn().mockImplementation(() => {
                    throw new Error('Disposal error');
                })
            };
            
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
            
            container.registerInstance('errorDisposableService', errorDisposableMock);
            container.resolve('errorDisposableService');
            
            expect(() => container.dispose()).not.toThrow();
            expect(consoleSpy).toHaveBeenCalledWith(
                "Error disposing service 'errorDisposableService':",
                expect.any(Error)
            );
            
            consoleSpy.mockRestore();
        });

        it('should prevent operations after disposal', () => {
            container.dispose();
            
            expect(() => {
                container.register('service', () => ({}));
            }).toThrow('Container has been disposed');
            
            expect(() => {
                container.resolve('service');
            }).toThrow('Container has been disposed');
        });

        it('should be safe to call dispose multiple times', () => {
            const disposableMock: IDisposable = {
                dispose: jest.fn()
            };
            
            container.registerInstance('disposableService', disposableMock);
            
            container.dispose();
            container.dispose(); // Second call should be safe
            
            expect(disposableMock.dispose).toHaveBeenCalledTimes(1);
        });
    });

    describe('Clear', () => {
        it('should clear all registrations', () => {
            container.register('service1', () => ({}));
            container.register('service2', () => ({}));
            
            expect(container.isRegistered('service1')).toBe(true);
            expect(container.isRegistered('service2')).toBe(true);
            
            container.clear();
            
            expect(container.isRegistered('service1')).toBe(false);
            expect(container.isRegistered('service2')).toBe(false);
        });

        it('should allow registration after clear', () => {
            container.register('service', () => ({}));
            container.clear();
            
            expect(() => {
                container.register('newService', () => ({}));
            }).not.toThrow();
            
            expect(container.isRegistered('newService')).toBe(true);
        });
    });

    describe('Type Safety', () => {
        interface ITestService {
            getValue(): string;
        }
        
        class TestService implements ITestService {
            getValue(): string {
                return 'test';
            }
        }

        it('should maintain type safety with TypeScript', () => {
            container.register<ITestService>('testService', () => new TestService());
            
            const service = container.resolve<ITestService>('testService');
            
            expect(service.getValue()).toBe('test');
        });
    });
});