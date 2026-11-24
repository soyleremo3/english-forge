# EnglishForge

A single-user English study app: vocabulary cards in groups of 8, typed quizzes, FSRS spaced repetition, sentence practice, a word bank, streaks and motivation. Later phases add AI feedback, a reader, a video library and IELTS preparation.

> Work in progress. Phase 1 (core) is under construction.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · Supabase · Vercel AI SDK (Gemini) · ts-fsrs · Zustand · Vitest · Playwright

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

Scripts: `dev`, `build`, `lint`, `typecheck`, `test`, `test:e2e`.

The full product and technical specification (in Turkish) lives in [`docs/SPEC.md`](docs/SPEC.md).

## License

Code: [MIT](LICENSE). Word list data (NGSL / NAWL derived) will be published under CC BY-SA 4.0 in `data/`.
