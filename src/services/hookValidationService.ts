import { AgentHook, HookValidationResult } from '../types/hook';

export class HookValidationService {
    private readonly dangerousCommands = [
        'rm', 'del', 'delete', 'format', 'mkfs',
        'dd', 'fdisk', 'parted', 'shutdown', 'reboot',
        'sudo', 'su', 'chmod 777', 'chown'
    ];
    
    private readonly networkCommands = [
        'curl', 'wget', 'ssh', 'scp', 'rsync',
        'nc', 'netcat', 'telnet', 'ftp'
    ];
    
    validateHook(hook: AgentHook): HookValidationResult {
        const result: HookValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            securityWarnings: []
        };
        
        // 이름 유효성 검사
        if (!hook.name.trim()) {
            result.errors.push('Hook 이름은 필수입니다');
            result.isValid = false;
        } else if (!/^[a-zA-Z0-9가-힣\-_\s]+$/.test(hook.name)) {
            result.errors.push('Hook 이름에는 특수문자를 사용할 수 없습니다');
            result.isValid = false;
        }
        
        // 명령어 유효성 검사
        if (!hook.command.trim()) {
            result.errors.push('명령어는 필수입니다');
            result.isValid = false;
        } else {
            this.validateCommand(hook.command, result);
        }
        
        return result;
    }
    
    private validateCommand(command: string, result: HookValidationResult): void {
        const lowerCommand = command.toLowerCase();
        
        // 위험한 명령어 검사
        for (const dangerous of this.dangerousCommands) {
            if (lowerCommand.includes(dangerous)) {
                result.securityWarnings.push(`위험한 명령어가 감지되었습니다: ${dangerous}`);
                result.warnings.push('이 명령어는 시스템에 영향을 줄 수 있습니다');
            }
        }
        
        // 네트워크 명령어 검사
        for (const network of this.networkCommands) {
            if (lowerCommand.includes(network)) {
                result.securityWarnings.push(`네트워크 명령어가 감지되었습니다: ${network}`);
                result.warnings.push('네트워크 명령어는 보안상 주의가 필요합니다');
            }
        }
        
        // 파이프 및 리다이렉션 검사
        if (command.includes('|') || command.includes('>') || command.includes('>>')) {
            result.warnings.push('파이프나 리다이렉션 사용 시 출력 크기에 주의하세요');
        }
    }
    
    validateHookList(hooks: AgentHook[]): HookValidationResult {
        const result: HookValidationResult = {
            isValid: true,
            errors: [],
            warnings: [],
            securityWarnings: []
        };
        
        // 중복 이름 검사
        const names = hooks.map(h => h.name.toLowerCase());
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
        if (duplicates.length > 0) {
            result.errors.push('중복된 Hook 이름이 있습니다');
            result.isValid = false;
        }
        
        // 개별 Hook 유효성 검사
        for (const hook of hooks) {
            const hookResult = this.validateHook(hook);
            if (!hookResult.isValid) {
                result.isValid = false;
                result.errors.push(...hookResult.errors);
            }
            result.warnings.push(...hookResult.warnings);
            result.securityWarnings.push(...hookResult.securityWarnings);
        }
        
        return result;
    }
}
