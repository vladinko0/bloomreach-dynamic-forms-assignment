# AGENTS.md

Universal instructions for AI coding agents working in this repository.

## Language

- Chat replies and commit messages: Slovak.
- Code identifiers, file names, and public API names: English.
- Code comments: English unless surrounding code uses another language.

## Package Manager

- Use `yarn` for dependency changes.
- Do not use `npm install` or `pnpm`.

## Formatting

Follow `.prettierrc.js`:

- `singleQuote: true`
- `trailingComma: 'all'`
- `bracketSpacing: false`
- `bracketSameLine: true`
- `arrowParens: 'avoid'`

After multi-file edits, run formatting on the changed paths.

## TypeScript Style

- Prefer arrow functions: `const name = () => {}`.
- Do not use the `void` operator.
- Prefer `async` / `await` over promise chains.
- Avoid magic strings and numbers in implementation code; extract reusable constants.
- Keep public types explicit and stable.
- Add the repository-relative path as the first line comment in new or edited TypeScript files.

## Validation

Before publishing changes:

- Run `tsc -p tsconfig.json`.
- Run Prettier check when Prettier is installed.

## Public Repository Hygiene

- Do not commit private company-specific rules, credentials, customer data, logs, or local machine paths.
- Keep assignment content focused on the Bloomreach SDK design and implementation.
