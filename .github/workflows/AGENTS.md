## Purpose

GitHub Actions workflows for the `error-extender` npm library.

## Ownership

Library author: Joseph Baking (jpbaking).

## Local Contracts

- `ci.yml` — triggers on push to main; runs lint → test → build. No publish step.
- Node version pinned to 22 (must match the project's target runtime)
- Publishing to npm is manual: `npm publish` from the repo root (requires npm 2FA OTP). Creating a GitHub release does NOT publish.

## Work Guidance

- Run lint → test → build before any manual `npm publish`
- Do not add separate lint/test/build-only workflows unless there is a clear need (e.g., PR checks)
- If publishing is re-automated, gate the publish step behind lint and test in sequence and restore this contract

## Verification

Validate CI by inspecting the Actions tab after a push to main. Confirm a publish with `npm view error-extender version`.
