# Inroad

**Upload your resume. An AI agent finds live jobs that actually fit you, finds the real humans behind them, and drafts the message that gets you in the door.**

Job opportunities are gated behind time, insider knowledge, and networks. Most applicants fire resumes into ATS black holes because they don't know who to talk to or how. Inroad makes opportunity accessible: it collapses hours of searching, company research, and cold-outreach anxiety into one flow anyone with a resume and five minutes can use.

> Built for the DevSoc hackathon (accessibility theme).

## What it does

1. **Upload** a PDF resume. An LLM parses it into a structured profile: skills, experience, education, target roles, location.
2. **Review** the parsed profile on an editable screen. Fix parsing mistakes, set your target role, location, and remote preference, and add a free-text "what I'm looking for" line.
3. **Search.** The agent runs live web search (Exa) for current job postings that match you. Results stream in as cards, each with a "why this fits you" rationale grounded in your actual resume. Every posting links to a real result. Nothing is fabricated.
4. **Find people.** Star the jobs you care about, and the agent finds 1-2 real, hiring-relevant people at those companies from public LinkedIn search results, with their profile URL and role.
5. **Draft outreach.** For each person, the agent drafts a short personalized message referencing their role, the specific job, and one concrete hook from your resume. Three tone presets (professional / friendly / direct) and one-click copy.

_Screenshot / demo GIF: add here before submission._

## Live demo mode

Append `?demo=1` to any page (e.g. `/results?demo=1`) to replay a captured run from local fixtures with zero network calls. This is the live-pitch insurance policy: it works offline and never depends on an API being up.

## Setup

Requires Node 18+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
```

### Environment variables

Set these in `.env.local` (never commit it):

```bash
# Which LLM provider to route model calls through
LLM_PROVIDER=claude-agent-sdk   # "claude-agent-sdk" | "openrouter"

# Only needed when LLM_PROVIDER=openrouter (the deploy path)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=deepseek/deepseek-chat

# Web search (jobs + people)
EXA_API_KEY=
```

**Two LLM provider modes** (chosen at call time by `LLM_PROVIDER`):

- **`claude-agent-sdk`** (local dev/demo). Uses the Claude Agent SDK against a Claude Pro subscription's monthly Agent SDK credit. No API key required, and none should be set. This path does not run on Vercel, which is expected.
- **`openrouter`** (the deploy path). Plain HTTPS calls to OpenRouter (DeepSeek by default). Set `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

> This project never uses `ANTHROPIC_API_KEY`. Local Claude access is via subscription auth through the Agent SDK; setting an Anthropic API key would override that and break billing.

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build (must pass before every push)
npm run lint    # lint (must pass before every push)
```

## Architecture

```
Next.js 14 (App Router) on Vercel
│
├── Frontend: React + Tailwind + shadcn/ui + Framer Motion
│   ├── /          (landing + resume upload)
│   ├── /review    (profile confirmation / edit)
│   └── /results   (jobs, people, drafts)
│
├── API routes (route handlers)
│   ├── POST /api/parse-resume    → LLM: PDF text → profile JSON
│   ├── POST /api/search-jobs     → Exa search + LLM ranking/rationale (streams NDJSON)
│   ├── POST /api/find-people     → Exa linkedin.com search + LLM filtering
│   └── POST /api/draft-message   → LLM message generation (streams text)
│
├── LLM layer (single abstraction, lib/llm.ts)
│   ├── Local dev/demo: Claude via Agent SDK (Pro plan credit, no API key)
│   └── Deployed:       OpenRouter (DeepSeek) via env switch
│
└── Search: Exa API (semantic web search, domain + recency filtering)
```

**Key design decisions:**

- **One LLM abstraction.** Every model call goes through `lib/llm.ts` (`complete`, `completeJson`, `streamComplete`). Provider is chosen by an env var, so the team builds free on a Claude subscription locally and flips one variable for deploy. No component or route imports a provider SDK directly.
- **One Exa module.** All web search goes through `lib/exa.ts`. People search is scoped to public LinkedIn results only; the app never logs into, crawls, or scrapes LinkedIn.
- **No database, no auth.** All state lives in a client-side store (Zustand) persisted to `sessionStorage`, so a refresh does not lose the run.
- **Never fabricate.** Every job maps to a real Exa result URL, and every contact is a real person from public search results. If nothing solid is found, the UI says so rather than inventing anyone.

## Third-party materials

| Material | Used for |
|----------|----------|
| [Exa API](https://exa.ai) | All web search (job postings + people) |
| [OpenRouter](https://openrouter.ai) / [DeepSeek](https://www.deepseek.com) | LLM provider for the deployed build |
| [Claude Agent SDK](https://docs.claude.com/en/api/agent-sdk/overview) (`@anthropic-ai/claude-agent-sdk`) | LLM provider for local dev/demo (subscription auth) |
| [Vercel AI SDK](https://sdk.vercel.ai) (`ai`) | Streaming LLM responses to the client |
| [shadcn/ui](https://ui.shadcn.com) | UI component primitives |
| [Tailwind CSS](https://tailwindcss.com) | Styling |
| [Framer Motion](https://www.framer.com/motion/) | Entrance and streaming reveal animations |
| [unpdf](https://github.com/unjs/unpdf) | Server-side PDF text extraction |
| [Zod](https://zod.dev) | Schema validation of LLM output |
| [Zustand](https://github.com/pmndrs/zustand) | Client state |
| [Inter](https://rsms.me/inter/) (via `next/font`) | Typeface |
| [Lucide](https://lucide.dev) | Icons |
| [Next.js](https://nextjs.org) | Framework |

## Project structure

```
app/
  page.tsx                 landing + resume upload
  review/page.tsx          profile confirmation / edit
  results/page.tsx         jobs, contacts, drafts
  api/
    parse-resume/route.ts
    search-jobs/route.ts   streams NDJSON
    find-people/route.ts
    draft-message/route.ts streams text
components/                upload, profile form, job/contact cards, draft panel, ui/
lib/
  llm.ts                   provider abstraction (the only file that knows about providers)
  exa.ts                   all Exa calls
  schemas.ts               zod schemas for Profile, JobMatch, Contact
  prompts.ts               every LLM prompt as a named export
  store.ts                 Zustand app state
  demo-fixtures.ts         cached run for ?demo=1 mode
```
