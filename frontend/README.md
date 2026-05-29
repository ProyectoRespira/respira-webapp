# Frontend

Frontend for Respira, built with Astro and React.

## Setup

```bash
cd frontend
pnpm install
```

## Development commands

```bash
pnpm dev            # Astro dev server
pnpm start          # astro check + dev server
pnpm build          # astro check + production build
pnpm preview        # preview built app
pnpm lint           # astro check + eslint
pnpm lint:astro     # astro check only
pnpm lint:eslint    # eslint only
pnpm format         # prettier write
pnpm format:check   # prettier check
```

## Project layout

```text
frontend/
├── public/
├── src/
│   ├── actions/
│   ├── assets/
│   ├── components/
│   ├── data/
│   ├── layouts/
│   ├── pages/
│   └── store/
├── astro.config.mjs
└── package.json
```

## Pre-commit integration

The repository pre-commit configuration runs frontend checks via pnpm:

- eslint (`eslint` hook)
- markdown formatting check (`prettier-markdown` hook)
- frontend formatting check (`prettier-local` hook)
- Astro type checks (`astro-typecheck-build` hook)
