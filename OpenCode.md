# OpenCode Guidelines for Repository

## Build, Lint, and Test Commands
- **Build:** `npm run build`  
- **Lint:** `npm run lint`  
- **Test All:** `npm test`  
- **Run a Single Test:** Use `npm test -- <test file path>`, e.g., `npm test -- packages/lib/ts-lib/src/auth/server/email.test.ts`

## Code Style Guidelines
- **Imports:**  
  - Use absolute imports when possible for clarity.  
  - Group imports by source (e.g., local, third-party).
- **Formatting:**  
  - Follow Prettier configurations.  
  - Use spaces for indentation.  
- **Types:**  
  - Explicitly define types instead of using `any`.  
- **Naming Conventions:**  
  - Use camelCase for variable and function names.  
  - Use PascalCase for class names.
- **Error Handling:**  
  - Prefer throwing and catching errors over returning error codes.  
  - Provide meaningful error messages.

## Additional Notes
- Include updates on tooling configurations as necessary.