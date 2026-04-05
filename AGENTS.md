# Repository Guidelines

## Project Structure & Module Organization
This repository is split into two modules:

- `paiagent-frontend/`: Vite + React + TypeScript UI. Main code lives in `src/`, with feature areas under `components/`, `stores/`, `api/`, `types/`, and `lib/`.
- `paiagent-backend/`: Spring Boot backend. Java sources live in `src/main/java/com/paiagent/`, grouped by `controller`, `service`, `repository`, `engine`, `llm`, `dto`, `entity`, and `exception`.
- Backend config and schema files live in `paiagent-backend/src/main/resources/`, including Flyway migrations under `db/migration/`.

Keep new files inside the existing package or feature folder instead of creating parallel structures.

## Build, Test, and Development Commands
- `cd paiagent-frontend && npm install && npm run dev`: start the frontend dev server.
- `cd paiagent-frontend && npm run build`: run TypeScript compile checks and produce a production bundle.
- `cd paiagent-backend && mvn spring-boot:run`: start the backend on port `8080`.
- `cd paiagent-backend && mvn test`: run backend tests.
- `cd paiagent-backend && mvn package`: build the backend artifact.

The backend expects MySQL from `application.yml` and uses Flyway to apply migrations automatically.

## Coding Style & Naming Conventions
Frontend uses strict TypeScript, React function components, and the `@/*` import alias for `src/*`. Match the existing style: PascalCase for components (`AppLayout.tsx`), camelCase for functions and stores (`useWorkflowStore.ts`), and short single-purpose files.

Backend follows standard Spring naming: `*Controller`, `*Service`, `*Repository`, `*Request`, and `*Response`. Use 4-space indentation in Java and keep package names under `com.paiagent`.

## Testing Guidelines
There are currently no committed frontend or backend test directories. Add backend tests under `paiagent-backend/src/test/java/` using Spring Boot test support. Add frontend tests under `paiagent-frontend/src/__tests__/` if a test runner is introduced.

At minimum, run `npm run build` for frontend changes and `mvn test` for backend changes before opening a PR.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes, for example `feat(core): ...` and `chore(git): ...`. Continue with `feat`, `fix`, `refactor`, `test`, `docs`, and a short scope when useful.

PRs should include a short summary, affected module (`frontend`, `backend`, or both), linked issue if available, and screenshots or API examples for user-facing changes. Call out config changes such as new environment variables or database migrations explicitly.

## Security & Configuration Tips
Do not hardcode API keys. Use environment variables such as `OPENAI_API_KEY`, `DEEPSEEK_API_KEY`, and `TONGYI_API_KEY`. Treat `application.yml` defaults as local-development values only.
