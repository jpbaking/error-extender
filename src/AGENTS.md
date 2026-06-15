## Purpose

TypeScript source for the `error-extender` npm library. Owns the public API (`extendError`) and integrates the `helpers/` sub-module.

## Ownership

Library author: Joseph Baking (jpbaking). No external contributors at time of indexing.

## Local Contracts

- `index.ts` is the sole public entry point; all exported types and the `extendError` function live here
- Exported surface: `extendError` (default + named), `ExtendOptions`, `ErrorConstructorOptions`, `ExtendedError`, `ExtendedErrorConstructor`
- Tests are co-located with source as `.test.ts` files; excluded from the TypeScript build (`tsconfig.json`)
- TypeScript strict mode is required; no `any` without an explicit suppression comment
- Build output goes to `dist/` (CommonJS, ES2020 target) — never edit `dist/` directly
- `helpers/` exports are internal; do not re-export them from `index.ts`

## Work Guidance

- `extendError(name, options)` wires the prototype chain without calling the parent constructor — preserve this invariant
- `defaultMessage` inherits from parent if the child does not set one
- `defaultData` deep-merges with parent's `defaultData` when both are plain objects; otherwise child replaces parent
- Constructor aliases (`m`, `d`, `c`) must stay in sync with their long forms (`message`, `data`, `cause`)
- `cause` must be validated as an `Error` instance at runtime before attaching

## Verification

```
npm run lint   # eslint src
npm test       # vitest run --coverage
```

## Child DOX Index

- [src/helpers/AGENTS.md](helpers/AGENTS.md) — internal utility functions (`hiddenReadOnly`, `isPlainObject`, `merge`)
