---
description: "Use when working on the host app, player app, or analytics-ui packages. Covers Web Components patterns, routing, state management, polling, and Vite-based frontend conventions for quizzquizz."
applyTo: "packages/host-app/**,packages/player-app/**,packages/analytics-ui/**"
---
# Frontend Web Components Guidelines

## Stack Constraints

- **No frameworks**. Use vanilla TypeScript with native custom elements (`class Foo extends HTMLElement`).
- **No shared UI code** between `host-app`, `player-app`, and `analytics-ui` unless the repo already provides a shared component. Each app owns its own component tree.
- Build toolchain: TypeScript project references (`tsc -b`) then Vite bundle. Run `tsc -b` before `vite build`.

## Component Structure

- Register each element in a dedicated file: `customElements.define('qz-lobby', LobbyScreen)`.
- Use `connectedCallback` / `disconnectedCallback` for setup and teardown.
- Clean up timers, intervals, and event listeners in `disconnectedCallback` to avoid leaks.
- Favour composition — small, single-purpose elements over monolithic ones.

## Routing

- Hash-based routing only. Read and write `window.location.hash`.
- React to navigation with a `hashchange` listener, not a client-side router library.
- Named route shapes are defined in the app's router module; match that convention when adding routes.

## State Management

- Simple pub/sub or signal objects for cross-component state. No external state library.
- Keep component-local data in instance properties, not DOM attributes.
- Validate externally-sourced data (API responses, URL params) with the Zod schemas from `@quizzquizz/common` before trusting it.

## API Polling

- Players poll `GET /api/sessions/:id/state` every 1–2 s; do **not** replace with WebSockets.
- Guard all polling callbacks against unmounted components (`this.isConnected`) before mutating the DOM.
- Handle network errors gracefully — log them and continue polling; do not crash the component.

## TypeScript

- `strict: true` is on. No `any`, no non-null assertion (`!`) without a comment explaining why.
- Named exports only — no default exports.
- Infer UI-facing types from `@quizzquizz/common` Zod schemas; do not redefine them locally.

## Tests

- Framework: Vitest + happy-dom.
- Tests live alongside source as `*.test.ts`.
- Run a one-shot pass with `npm test -- --run -w @quizzquizz/<package>`.
- Avoid asserting exact UI text that might drift; prefer data attributes or element roles when possible.
