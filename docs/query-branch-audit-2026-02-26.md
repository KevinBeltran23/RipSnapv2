# Query Branch Audit
Date: 2026-02-26
Branch: `query`

## Snapshot
- Branch state: `query...origin/query`
- Typecheck: `yarn tsc --noEmit` passed
- Query stack is present and wired:
  - `@tanstack/react-query`
  - `@tanstack/react-query-persist-client`
  - `react-native-mmkv`
  - provider wiring in `App.tsx`

## Findings
- Query migration is active, but linting toolchain was missing on this branch before sync:
  - no `lint` / `format` / `prepare` scripts
  - missing ESLint/Prettier/Husky dev dependencies
  - missing lint-staged config
- Added these from `dev` while preserving query-branch runtime deps.

## Changes Applied
- Updated `package.json`:
  - added scripts: `lint`, `format`, `prepare`
  - added dev deps: `@react-native/eslint-config`, `eslint`, `eslint-config-prettier`, `eslint-plugin-prettier`, `husky`, `lint-staged`, `prettier`
  - added `lint-staged` block
- Added `.husky/pre-commit` with `yarn lint-staged`

## Current Blocker
- `yarn install` could not complete due environment/network `EACCES`, so `eslint` binary is not available yet.
- Next step on a normal networked machine: run `yarn install` then `yarn lint`.

