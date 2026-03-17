# Repository Guidelines

## Project Structure & Module Organization
`src/main.tsx` bootstraps the app and router, and `src/App.tsx` defines the protected route tree. Keep route-level screens in `src/pages` (`ChatPage.tsx`, `AdminPage.tsx`), reusable UI in `src/components`, Zustand state in `src/stores`, and HTTP/WebSocket clients plus API types in `src/api`. Place bundled images in `src/assets` and static files in `public/`. Production output is generated in `dist/`; deployment files live in `Dockerfile` and `nginx.conf`.

## Build, Test, and Development Commands
Use `npm ci` to install dependencies from `package-lock.json`. Run `npm run dev` for the Vite dev server with HMR. Run `npm run build` to type-check with `tsc -b` and emit the production bundle to `dist/`. Use `npm run preview` to serve the built app locally. Run `npm run lint` before every PR. For container validation, use `docker build -t apten-chat-web .`.

## Coding Style & Naming Conventions
This repo uses TypeScript, React function components, and ES modules. Match the existing style: 2-space indentation, semicolons, single quotes, and trailing commas where the formatter would normally keep them. Use PascalCase for components and pages (`MessageBubble.tsx`), and camelCase for stores and utilities (`chatStore.ts`, `http.ts`). Keep files focused: UI behavior stays in components/pages, shared state in stores, and network logic in `src/api`. Follow `eslint.config.js`; no Prettier config is present, so keep formatting consistent with nearby files.

## Testing Guidelines
There is no automated test runner configured yet. At minimum, run `npm run lint` and manually smoke-test login, registration, chat, settings, and admin flows before submitting changes. If you add tests, prefer `*.test.tsx` next to the source file or under `src/__tests__/`, and add the test script to `package.json` in the same change.

## Commit & Pull Request Guidelines
Git history is currently minimal (`Initial commit`), so keep commit subjects short, imperative, and focused on one change, for example `Add reconnect backoff to chat socket`. PRs should include a brief summary, linked issues, validation steps, and screenshots for UI changes.

## Configuration Tips
Frontend API endpoints are driven by `VITE_API_URL` and `VITE_WS_URL`. Store local values in an untracked `.env` file and never commit secrets or environment-specific tokens.
