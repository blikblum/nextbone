# Changelog

## Unreleased

## [0.30.0] - 2026-04-04

### Added

- Added a new `nextbone/schema` entry point with a `withSchema` mixin/decorator for Zod v4 model validation.
- Added nested schema validation support for `preValidate()`, `validate()`, and `isValid()`, including dot-path validation for nested attributes.
- Added `createWatchedProxy()` and `createMicrotaskBatcher()` to `nextbone/class-utils`.
- Added `zod` as an optional peer dependency for schema-based validation.

### Changed

- TypeScript users can now configure the model id type with `Model<T, IdType, E>`. The default id type is now `string`.
- The published package now exposes the main declaration file at the package root as `nextbone.d.ts`.
- `nextbone/class-utils` is now built from the TypeScript source in `src/class-utils.ts` and published from `dist/class-utils.js`.

### Breaking Changes

- TypeScript code that relied on the old `Model<T, S, E>` generic shape may need to update type parameters to `Model<T, IdType, E>`.
