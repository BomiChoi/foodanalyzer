# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server at localhost:3000
npm run build    # Build production bundle
npm start        # Run production server (requires build first)
npm run lint     # Run ESLint
```

## Architecture

This is a **Next.js 16** app using the **App Router** (app/ directory), React 19, TypeScript, and Tailwind CSS v4.

- `app/layout.tsx` — Root layout; loads Geist fonts and wraps all pages
- `app/page.tsx` — Main UI: image upload, analyze button, results table (client component)
- `app/api/analyze/route.ts` — POST endpoint: receives image, calls OpenAI `/v1/responses` with `web_search_preview` tool, returns JSON with food nutrition data
- `app/globals.css` — Global styles; Tailwind import + CSS variables for light/dark theme

## Environment

Copy `.env.local.example` to `.env.local` and set `OPENAI_API_KEY`.

## Data Flow

1. User uploads image → `page.tsx` sends `FormData` to `/api/analyze`
2. API route converts image to base64, calls OpenAI Responses API (`gpt-4o` + `web_search_preview`)
3. Prompt asks model to identify foods and return JSON: `{ foods[], totalCalories, summary }`
4. Response `output_text` is parsed (handles raw JSON or ```json``` blocks)
5. Results rendered as a nutrition table on the page

**Path alias**: `@/*` resolves to the project root (configured in `tsconfig.json`).

**Styling**: Tailwind CSS v4 via PostCSS. Dark mode uses `prefers-color-scheme`. CSS variables for theme colors are defined in `globals.css`.

**ESLint**: v9 flat config format (`eslint.config.mjs`) with Next.js core web vitals + TypeScript rules.
