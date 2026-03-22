# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Apten Chat Web — the React frontend for an invite-only chat messenger. It communicates with the `apten-chat-server` backend via REST (`/api/*`) and a single WebSocket (`/api/ws`).

## Commands

- `npm ci` — install dependencies (use instead of `npm install`)
- `npm run dev` — start Vite dev server on port 3000 with HMR and `/api` proxy to `localhost:8080`
- `npm run build` — typecheck (`tsc -b`) then bundle to `dist/`
- `npm run lint` — ESLint (run before every PR)
- `npm run preview` — serve production build locally
- No test runner is configured. Validate changes manually (login, registration, chat, settings, admin flows).

## Environment

- Node 22, React 19, TypeScript ~5.9, Vite 8
- `VITE_API_URL` / `VITE_WS_URL` — set in `.env` (untracked). Can be omitted if the frontend is behind a reverse proxy on the same origin as the backend.
- Dev server proxies `/api` to `http://localhost:8080` (configured in `vite.config.ts`).

## Architecture

**State management:** Two Zustand stores drive the entire app:
- `authStore` — user session, JWT tokens (access + refresh in localStorage), login/register/logout, profile updates. On auth success it calls `wsClient.connect()`.
- `chatStore` — chat list, active chat, messages (keyed by chatId), typing indicators, online presence, read receipts. Subscribes to WebSocket events via `initWsListeners()`.

**API layer (`src/api/`):**
- `http.ts` — thin `fetch` wrapper (`api<T>()`) that auto-attaches Bearer token, auto-refreshes on 401, and throws `ApiError`.
- `ws.ts` — singleton `WsClient` class with reconnect backoff, message queue for offline sends, and a pub/sub `subscribe()` API. Connects to `/api/ws?token=...`.
- `types.ts` — shared TypeScript interfaces for REST responses and WS event payloads.

**Routing (`App.tsx`):** `ProtectedRoute` (requires auth) and `AdminRoute` (requires `user.is_admin`) guard all routes. Routes: `/login`, `/register`, `/` and `/chat/:id` (ChatPage), `/settings`, `/admin`.

**Messages are sent via WebSocket** (`message.send` event with a `client_id`), not REST. Edits and deletes use REST. Real-time updates (new messages, typing, presence, read receipts, edits, deletes) arrive as WS events handled in `chatStore.initWsListeners()`.

## Code Style

- 2-space indentation, semicolons, single quotes, trailing commas
- PascalCase for components/pages (`MessageBubble.tsx`), camelCase for stores/utilities (`chatStore.ts`)
- ESLint config: `@eslint/js` recommended + `typescript-eslint` recommended + `react-hooks` + `react-refresh`
- No Prettier — match surrounding code style
