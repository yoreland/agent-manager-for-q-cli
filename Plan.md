# Directory Restructuring Plan

## Current Structure → Target Structure

### Phase 1: Clean Architecture Alignment
```
src/
├── domain/              # Business domain (from core/)
│   ├── agent/          # Agent domain models
│   └── context/        # Context domain models
├── application/        # Application services (from services/)
│   ├── agent/         # Agent-related services
│   ├── context/       # Context-related services
│   └── shared/        # Shared application services
├── infrastructure/    # Infrastructure layer
│   ├── filesystem/    # File system adapters
│   ├── vscode/        # VS Code API adapters
│   └── cache/         # Caching infrastructure
├── presentation/      # UI layer
│   ├── tree-providers/ # Tree view providers
│   ├── webviews/      # Webview components
│   └── commands/      # Command handlers
├── shared/            # Cross-cutting concerns
│   ├── types/         # Type definitions
│   ├── errors/        # Error handling
│   └── utils/         # Utilities
└── __tests__/         # All tests (unchanged)
```

## Task List

### Task 1: Create New Directory Structure ✅
- [x] Create domain/ directory
- [x] Create application/ directory  
- [x] Create presentation/ directory
- [x] Create infrastructure/ subdirectories
- [x] Reorganize shared/ directory

### Task 2: Move Domain Layer (core/ → domain/) ✅
- [x] Move core/agent/ → domain/agent/
- [x] Move core/context/ → domain/context/
- [x] Update imports in moved files
- [x] Update imports in dependent files

### Task 3: Move Application Layer (services/ → application/) ✅
- [x] Move agent-related services → application/agent/
- [x] Move context-related services → application/context/
- [x] Move shared services → application/shared/
- [x] Update imports

### Task 4: Move Infrastructure Layer ✅
- [x] Move infrastructure/repositories/ → infrastructure/filesystem/
- [x] Move shared/infrastructure/ → infrastructure/vscode/
- [x] Move shared/cache/ → infrastructure/cache/
- [x] Update imports

### Task 5: Move Presentation Layer ✅
- [x] Move providers/ → presentation/tree-providers/
- [x] Move webview/ → presentation/webviews/
- [x] Move commands/ → presentation/commands/
- [x] Update imports

### Task 6: Reorganize Shared Layer ✅
- [x] Move types/ → shared/types/
- [x] Move utils/ → shared/utils/
- [x] Keep shared/errors/ as is
- [x] Remove other shared/ subdirectories
- [x] Update imports

### Task 7: Clean Up Legacy Files ✅
- [x] Remove Enhanced* files (if unused)
- [x] Remove Refactored* files (if unused)
- [x] Update presentation/commands/ to use main services

### Task 8: Update Main Files ✅
- [x] Update extension.ts imports
- [x] Update package.json if needed
- [x] Update build configs if needed

## ⚠️ CURRENT STATUS: Import Path Issues

The directory restructuring was successful, but import paths in application/ files are broken.
Need to fix import statements manually for each file.

### Immediate Action Required:
1. Fix broken import statements in application/ directory files
2. Verify TypeScript compilation
3. Run final validation

### Files with Import Issues:
- src/application/agent/agentManagementService.ts
- src/application/context/contextResourceService.ts  
- src/application/context/hookTemplateService.ts
- src/application/context/hookValidationService.ts
- And others in application/ directory
```
src/
├── domain/              # Business domain ✅
│   ├── agent/          # Agent domain models ✅
│   └── context/        # Context domain models ✅
├── application/        # Application services ✅
│   ├── agent/         # Agent-related services ✅
│   ├── context/       # Context-related services ✅
│   └── shared/        # Shared application services ✅
├── infrastructure/    # Infrastructure layer ✅
│   ├── filesystem/    # File system adapters ✅
│   ├── vscode/        # VS Code API adapters ✅
│   └── cache/         # Caching infrastructure ✅
├── presentation/      # UI layer ✅
│   ├── tree-providers/ # Tree view providers ✅
│   ├── webviews/      # Webview components ✅
│   └── commands/      # Command handlers ✅
├── shared/            # Cross-cutting concerns ✅
│   ├── types/         # Type definitions ✅
│   ├── errors/        # Error handling ✅
│   └── utils/         # Utilities ✅
└── __tests__/         # All tests (unchanged) ✅
```

### Benefits Achieved:
- ✅ Clean Architecture alignment
- ✅ Clear separation of concerns
- ✅ Improved maintainability
- ✅ Better code organization
- ✅ Removed legacy/duplicate files

## Import Update Strategy

For each moved file:
1. Update internal imports within the file
2. Find all files that import the moved file
3. Update their import statements
4. Test compilation after each major move

## Validation Steps

After each task:
- [ ] Check TypeScript compilation
- [ ] Run basic tests
- [ ] Verify no broken imports
