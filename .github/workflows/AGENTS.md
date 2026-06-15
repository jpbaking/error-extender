## Purpose

GitHub Actions workflows for the `error-extender` npm library.

## Ownership

Library author: Joseph Baking (jpbaking).

## Local Contracts

- `publish.yml` — triggers on GitHub release published; runs lint → test → build → `npm publish`
- Publish requires `NPM_TOKEN` set as a GitHub Actions secret
- No workflow may skip lint or tests before publishing

## Work Guidance

- Keep the publish step gated behind lint and test steps in sequence
- Do not add separate lint/test/build-only workflows unless there is a clear need (e.g., PR checks)
- Node version must match the project's target runtime; currently pinned to 20

## Verification

Validate by inspecting the Actions tab after a release is published.
