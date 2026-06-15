## Purpose

Internal utility functions for `error-extender`. Not part of the public API; consumed only by `src/index.ts`.

## Ownership

Internal — no direct public consumers.

## Local Contracts

- `hidden-readonly.ts` — exports `hiddenReadOnly(obj, key, value)`: defines a non-enumerable, non-writable, non-configurable property on `obj`
- `merge.ts` — exports `isPlainObject(value)` (guards by `constructor === Object`) and `merge(...objects)` (deep-merge for plain objects, last-write-wins for scalars)
- Tests are co-located as `.test.ts` files; full coverage required (both files are at 100% per coverage reports)

## Work Guidance

- `hiddenReadOnly` must never expose the property to `JSON.stringify` (enumerable: false is the invariant)
- `merge` recurses only when both the accumulator key and incoming key are plain objects; any other type combination overwrites
- Do not export these helpers from `src/index.ts`

## Verification

```
npm test   # vitest run --coverage (coverage must remain at 100% for this folder)
```
