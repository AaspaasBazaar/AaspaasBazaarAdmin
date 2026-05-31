# Contributing

## Branching

- `main` — protected. Production. Every commit on `main` triggers a Vercel production deploy.
- `feat/<short-slug>` — feature branches.
- `fix/<short-slug>` — bug fixes.
- `chore/<short-slug>` — tooling, deps, docs.

Branches are short-lived (< 1 week). Rebase on `main` daily; never merge `main` back into a feature branch.

## Pull requests

- One topic per PR. Diff target: < 400 lines.
- PR title follows Conventional Commits: `feat(vendors): add bulk import`.
- PR description must include:
  - **What** changed (1–3 bullets).
  - **Why** (link to issue / context).
  - **How to verify** (commands or steps).
- At least one approving review before merge.
- Squash-merge to `main`. The squash commit subject is the PR title.

## Commits

Conventional Commits:

```
feat(scope): subject in imperative mood, ≤72 chars

Body explains the why, not the what. Wrap at 72.
Reference issues like #123.
```

Allowed types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `perf`, `ci`, `build`.

## Code style

- **TypeScript strict.** No `any` without an inline justification comment.
- **ESLint + Prettier** enforced by `lint-staged` in lefthook precommit. Don't disable rules per-file unless you also drop a comment explaining why.
- **Imports** absolute via `@/*` (alias to project root).
- **No default exports** except for Next.js pages / route handlers (where the framework requires them).
- **File names**: `kebab-case.ts` for modules, `PascalCase.tsx` for React components.
- **Hooks** prefixed `use*`; client-only files start with `"use client"` on line 1.

## Tests

| Layer | Tool | When required |
|-------|------|---------------|
| Unit | Vitest | For anything in `lib/` |
| Component | Vitest + React Testing Library | For non-trivial client components |
| E2E | Playwright | At least one happy-path per phase exit |

Coverage is not gated, but a PR that adds `lib/` code without a corresponding `*.test.ts` will be sent back.

Run:

```bash
pnpm test                  # unit + component
pnpm test -- --watch
pnpm test:e2e              # Playwright
pnpm test:e2e -- --ui      # debug UI
```

## Local quality gate

`pnpm check` runs everything CI runs:

```jsonc
// package.json
"scripts": {
  "check": "pnpm lint && pnpm typecheck && pnpm test --run"
}
```

Run before pushing. Lefthook also runs `lint --fix` and `typecheck --incremental` on staged files.

## Adding a dependency

Before `pnpm add`-ing a package, check:

1. Bundle size (bundlephobia.com) — anything > 50 kB gzipped needs justification.
2. Maintenance — last release in the past 12 months.
3. License — MIT / Apache-2.0 / BSD only.

Record the reason in the PR description.

## Documentation

If a PR changes behaviour visible to the API consumer or another developer, the corresponding doc under `/docs/` must change in the same PR. Examples:

- New endpoint → update `api-reference.md`.
- New env var → update `setup.md` and `deployment.md`.
- New collection or field → update `data-model.md`.
- Architectural change → update `architecture.md`.

## Release

`main` deploys automatically. No semver tags for the app itself (it is an internal tool). When a deploy needs to be referenced later (e.g. for rollback), use the Vercel deployment URL or its short SHA.

## Communication

- Open a GitHub issue for any non-trivial work before coding. Title: imperative; body: what + why + acceptance criteria.
- For decisions that shape the codebase (new auth provider, new state library, leaving Firestore), open a short ADR under `docs/adr/NNNN-title.md` describing context, decision, alternatives, consequences.
