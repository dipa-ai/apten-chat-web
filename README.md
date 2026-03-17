# Apten Chat Web

Frontend for the Apten Chat messenger. This is a React + TypeScript + Vite single-page application that talks to the backend over REST and WebSocket APIs.

The app covers the main user flows for the messenger: sign in, invite-based registration, chat list and chat view, profile settings, and an admin panel for invite management.

## Features

- Invite-only registration flow
- JWT-based sign in with automatic token refresh
- Protected routes for authenticated and admin-only screens
- Direct and group chats
- Real-time message delivery over WebSocket
- Typing indicators, online presence, and read updates
- Message editing and soft delete for sent messages
- Infinite scroll for older messages
- Profile settings for updating display name
- Admin panel for creating, copying, and revoking invite links

## Tech Stack

- React 19
- TypeScript
- Vite
- React Router
- Zustand for client state
- Native Fetch API for HTTP requests
- Native WebSocket API for real-time events
- Nginx for production static hosting

## Project Layout

- `src/main.tsx`: app bootstrap and router setup
- `src/App.tsx`: route tree and route guards
- `src/pages`: route-level screens such as login, register, chat, settings, and admin
- `src/components`: reusable chat and UI components
- `src/stores`: Zustand stores for auth and chat state
- `src/api`: HTTP client, WebSocket client, and shared API types
- `Dockerfile`: production image build
- `nginx.conf`: SPA-friendly Nginx config for the built frontend

## Requirements

- Node.js 22 recommended
- npm
- A running Apten Chat backend

For the backend setup, see `../apten-chat-server`.

## Quick Start

1. Install dependencies:

   ```sh
   npm ci
   ```

2. Create a local env file:

   ```sh
   cat > .env <<'EOF'
   VITE_API_URL=http://localhost:8080
   VITE_WS_URL=ws://localhost:8080
   EOF
   ```

3. Start the development server:

   ```sh
   npm run dev
   ```

4. Open the app in the browser:

   ```text
   http://localhost:5173
   ```

If the frontend is served from the same origin as the backend through a reverse proxy, `VITE_API_URL` and `VITE_WS_URL` can be omitted.

## Available Scripts

- `npm run dev`: start the Vite development server
- `npm run build`: run TypeScript build and create a production bundle in `dist`
- `npm run preview`: serve the built bundle locally
- `npm run lint`: run ESLint

## Environment Variables

### `VITE_API_URL`

Base URL for HTTP API calls.

Example:

```env
VITE_API_URL=http://localhost:8080
```

### `VITE_WS_URL`

Base URL for the WebSocket connection.

Example:

```env
VITE_WS_URL=ws://localhost:8080
```

If not set, the app falls back to the current browser origin and derives the WebSocket protocol automatically from `http/https`.

## Authentication Flow

- Access and refresh tokens are stored in `localStorage`
- HTTP requests automatically attach the access token when present
- On `401`, the client tries to refresh the session and retries the failed request
- On successful authentication, the app opens the WebSocket connection automatically

## Production Build

Create the production bundle:

```sh
npm run build
```

The output is written to `dist/`.

## Docker

Build the production image:

```sh
docker build -t apten-chat-web .
```

The Docker image uses a multi-stage build:

- `node:22-alpine` to install dependencies and build the app
- `nginx:1.27-alpine` to serve the generated static files

The bundled Nginx config includes SPA routing via `try_files ... /index.html`.

## Manual Validation

There is no automated test suite configured in this repository yet. Before shipping changes, at minimum validate:

- `npm run lint`
- Login and logout
- Invite-based registration
- Chat list loading and opening a chat
- Real-time messaging between two browser sessions
- Admin invite creation and copy link flow

## Notes

- This repository is the frontend only
- The app expects the backend API and WebSocket endpoints exposed by `apten-chat-server`
- Local secrets and environment-specific URLs should stay in an untracked `.env` file
