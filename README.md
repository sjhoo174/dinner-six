# DinnerSix

DinnerSix is a React + Vite prototype for a free TimeLeft-style social dining platform.

It lets users:

- Sign up for free
- Answer a short questionnaire
- Get algorithmically grouped with 5-6 compatible strangers
- Preview who is turning up by persona, industry, and gender mix
- See a partner restaurant and subsidised percentage discount
- Store a demo match locally in the browser

This is a front-end prototype. Production use would require a backend for authentication, real user profiles, restaurant inventory, scheduling, notifications, moderation, and matching jobs.

## Tech stack

- React
- Vite
- Plain CSS
- Cloudflare Workers Static Assets / Cloudflare Pages compatible

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production output is generated in `dist/`.

## Cloudflare deployment

Cloudflare Pages settings:

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/`
- Node version: 22 or later

Workers Static Assets deploy is also supported via `wrangler.toml`:

```toml
[assets]
directory = "./dist"
not_found_handling = "single-page-application"
```

Deploy commands:

```bash
npm run deploy:cloudflare
npm run deploy:pages
```
