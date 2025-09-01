/**
 * Example usage of the Dependency Injection Container
 * This file demonstrates how to use the container in practice
 */

import { DependencyContainer } from './DependencyContainer';
import { ContainerConfiguration } from './ContainerConfiguration';
import { SERVICE_TOKENS } from './ServiceTokens';
import { IDisposable } from './IDependencyContainer';

// Example service interfaces
interface IEmailService {
    sendEmail(to: string, subject: string, body: string): Promise<void>;
}

interface IUserService {
    createUser(name: string, email: string): Promise<{ id: string; name: string; email: string }>;
}

// Example service implementations
class EmailService implements IEmailService, IDisposable {
    private connections: any[] = [];

    async sendEmail(to: string, subject: string, body: string): Promise<void> {
        console.log(`Sending email to ${to}: ${subject}`);
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    dispose(): void {
        console.log('Disposing EmailService - closing connections');
        this.connections.forEach(conn => conn.close?.());
        this.connections = [];
    }
}

class UserService implements IUserService {
    constructor(private emailService: IEmailService) {}

    async createUser(name: string, email: string): Promise<{ id: string; name: string; email: string }> {
        const user = {
            id: Math.random().toString(36).substr(2, 9),
            name,
            email
        };

        // Send welcome email
        await this.emailService.sendEmail(
            email,
            'Welcome!',
            `Hello ${name}, welcome to our service!`
        );

        return user;
    }
}

/**
 * Example of setting up and using the container
 */
export async function containerExample(): Promise<void> {
    // Create container
    const container = new DependencyContainer();

    try {
        // Configure with default services
        ContainerConfiguration.configure(container);

        // Register custom services
        container.register<IEmailService>('EmailService', () => new EmailService());
        container.register<IUserService>('UserService', () => {
            const emailService = container.resolve<IEmailService>('EmailService');
            return new UserService(emailService);
        });

        // Use the services
        const userService = container.resolve<IUserService>('UserService');
        const logger = container.resolve(SERVICE_TOKENS.LOGGER) as any;

        logger.info('Creating new user...');
        const user = await userService.createUser('John Doe', 'john@example.com');
        logger.info(`User created: ${JSON.stringify(user)}`);

        // Services are singletons by default
        const userService2 = container.resolve<IUserService>('UserService');
        console.log('Same instance?', userService === userService2); // true

    } finally {
        // Always dispose to clean up resources
        container.dispose();
    }
}

/**
 * Example of testing with the container
 */
export function testingExample(): void {
    const container = new DependencyContainer();

    try {
        // Register mock services for testing
        const mockEmailService: IEmailService = {
            sendEmail: jest.fn().mockResolvedValue(undefined)
        };

        container.registerInstance<IEmailService>('EmailService', mockEmailService);
        container.register<IUserService>('UserService', () => {
            const emailService = container.resolve<IEmailService>('EmailService');
            return new UserService(emailService);
        });

        // Test the service
        const userService = container.resolve<IUserService>('UserService');
        // ... run tests

        console.log('Testing completed with mocked dependencies');

    } finally {
        container.dispose();
    }
}

/**
 * Example of conditional service registration
 */
export function conditionalRegistrationExample(): void {
    const container = new DependencyContainer();

    try {
        const isProduction = process.env['NODE_ENV'] === 'production';

        if (isProduction) {
            // Production email service with real SMTP
            container.register<IEmailService>('EmailService', () => {
                console.log('Registering production email service');
                return new EmailService();
            });
        } else {
            // Development email service that just logs
            container.register<IEmailService>('EmailService', () => {
                console.log('Registering development email service');
                return {
                    sendEmail: async (to: string, subject: string, body: string) => {
                        console.log(`[DEV] Email to ${to}: ${subject} - ${body}`);
                    }
                };
            });
        }

        const emailService = container.resolve<IEmailService>('EmailService');
        console.log('Email service registered for environment:', isProduction ? 'production' : 'development');

    } finally {
        container.dispose();
    }
}

// Uncomment to run examples
// containerExample().catch(console.error);
// testingExample();
// conditionalRegistrationExample();