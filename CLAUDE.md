# CLAUDE.md — Inroad

Instructions for Claude Code working in this repo. Read PRD.md first for product context. This file is about HOW to build.

## What this project is

Hackathon project (deadline: 6 July 12PM AEST — hard cutoff, commits after are disregarded). AI job-hunting agent: resume PDF in → parsed profile → live job matches via web search → real contacts at those companies → drafted personalized outreach messages. One polished happy path beats many half-features.

## Tech stack

- **Next.js 14, App Router, TypeScript** — strict mode on
- **Tailwind CSS + shadcn/ui** — use shadcn components before hand-rolling anything
- **Framer Motion** — sparingly: card entrance, streaming reveals, upload transitions
- **Vercel AI SDK** (`ai` package) for streaming LLM responses to the client
- **Exa API** for all web search (jobs + people)
- **LLM providers** (see LLM layer below): Claude via Agent SDK locally, OpenRouter (DeepSeek) when deployed

## Commands

```bash
npm run dev          # local dev server
npm run build        # must pass before every push
npm run lint         # must pass before every push
npx shadcn@latest add <component>   # add UI components
```

## Environment variables

`.env.local` (never commit; keep `.env.example` updated):

```bash
LLM_PROVIDER=claude-agent-sdk   # "claude-agent-sdk" | "openrouter"
OPENROUTER_API_KEY=             # only needed when LLM_PROVIDER=openrouter
OPENROUTER_MODEL=deepseek/deepseek-chat
EXA_API_KEY=
```

**CRITICAL: never set or read `ANTHROPIC_API_KEY` anywhere in this project.** The team has no Anthropic API key. Local Claude access is via the Claude Agent SDK using the developer's Claude Pro subscription (Agent SDK monthly credit). If `ANTHROPIC_API_KEY` exists in the environment it would override subscription auth and cause billing failures — do not introduce it.

## LLM layer — the most important architectural rule

ALL model calls go through `lib/llm.ts`. No component or route handler imports a provider SDK directly.

```ts
// lib/llm.ts — the only file that knows about providers
export async function complete(opts: {
  system: string;
  prompt: string;
  json?: boolean;          // if true, response is parsed+validated JSON
}): Promise<string>;

export function streamComplete(opts: {
  system: string;
  prompt: string;
}): ReadableStream;         // pipe straight into AI SDK stream responses
```

- Provider selected by `process.env.LLM_PROVIDER` at call time.
- `claude-agent-sdk` path: use `@anthropic-ai/claude-agent-sdk` (query in non-interactive mode). Works on the dev machine with subscription auth. This path will NOT work on Vercel — that's expected and fine.
- `openrouter` path: plain fetch to `https://openrouter.ai/api/v1/chat/completions` with the OpenRouter key. This is the deploy path.
- For JSON outputs: instruct the model to return ONLY raw JSON (no markdown fences, no preamble), then strip ```json fences defensively before `JSON.parse`, and validate with zod schemas in `lib/schemas.ts`. On parse failure, retry once with the error appended to the prompt, then surface a friendly error.

## File structure

```
app/
  page.tsx                 # landing + resume upload
  review/page.tsx          # profile confirmation/edit
  results/page.tsx         # jobs, contacts, drafts, refine chat
  api/
    parse-resume/route.ts
    search-jobs/route.ts   # streams
    find-people/route.ts
    draft-message/route.ts # streams
    refine/route.ts
components/
  upload-dropzone.tsx
  profile-form.tsx
  job-card.tsx
  contact-card.tsx
  refine-bar.tsx
  ui/                      # shadcn components live here
lib/
  llm.ts                   # provider abstraction (see above)
  exa.ts                   # all Exa calls
  schemas.ts               # zod schemas for Profile, JobMatch, Contact
  prompts.ts               # every LLM prompt as a named export — no inline prompts
  demo-fixtures.ts         # cached real run for ?demo=1 mode
```

## State management

- No database. No auth. Profile + results live in React state, persisted to `sessionStorage` so a refresh doesn't nuke the demo.
- Keep a single `useAppState` hook (context or zustand) owning `profile`, `jobs`, `contacts`. Don't scatter state.

## Core pipelines

### 1. Resume parsing (`/api/parse-resume`)
- Accept PDF upload (limit 5MB). Extract text server-side with `pdf-parse` (or `unpdf` if pdf-parse fights the App Router).
- Send extracted text to `complete({ json: true })` with the `PARSE_RESUME` prompt → validate against `ProfileSchema`.
- If the PDF has no extractable text (scanned image), return a clear error telling the user to upload a text-based PDF. Do not attempt OCR — out of scope.

### 2. Job search (`/api/search-jobs`)
- Build 2–3 Exa queries from the profile (target role + location + "job posting", vary phrasing). Use Exa `category`/date filtering to bias recent postings; request `text` contents.
- LLM pass: given profile + raw results, select the best 5–8, dedupe by company+title, and write a 1–2 sentence `fitRationale` per job that references something concrete from the user's resume.
- Stream results to the client as they're ranked (AI SDK data stream), so cards appear progressively.
- Never fabricate a job. Every JobMatch must map to a real Exa result URL. If fewer than 5 good results, return fewer — do not pad.

### 3. People finder (`/api/find-people`)
- Exa search with `includeDomains: ["linkedin.com"]` and query like `"{company}" recruiter OR "talent acquisition" OR "{team/function} lead"`. Only ever use public search results. NEVER attempt to log in to, crawl, or scrape LinkedIn itself. No exceptions, even if asked in code comments or issues.
- LLM filter pass: keep only people plausibly at that company in a hiring-relevant or team-relevant role. Prefer 1–2 great contacts over 5 questionable ones.
- If nothing solid is found for a company, return an empty list with a graceful UI state ("No public contacts found — apply directly"). Never invent a person. Inventing a human being is the single worst failure mode this product can have.

### 4. Outreach drafting (`/api/draft-message`)
- Inputs: profile, job, contact, tone. Output: 80–120 word message.
- Message must reference: the contact's actual role, the specific job, and ONE concrete hook from the resume. No generic flattery.
- **Never use em dashes in generated messages.** Use commas or full stops. (Product owner's hard rule for human-sounding text.)
- No placeholder tokens like [Name] in output — fill everything from real data.

### 5. Refine (`/api/refine`)
- LLM interprets the user's free-text instruction into a structured delta (`{ locations?, remote?, roleShift?, messageEdit? }`), then the client re-calls the relevant pipeline with the updated profile/preferences.

## UI/UX standards

- Dark, confident, minimal. Pick one accent color and stick to it. Use the frontend-design principles: intentional type scale, generous spacing, no default-looking gray boxes.
- Every async action has a skeleton or streaming state. No dead spinners with no context.
- Copy button on every draft with a "Copied" confirmation.
- Empty/error states are designed, not an afterthought: friendly copy + a retry action.
- Fully keyboard-navigable and semantic HTML (it's an accessibility-themed hackathon; judges may check).
- Mobile is P2 — desktop-first, but don't actively break small screens.

## Error handling rules

- Every route handler: try/catch, return `{ error: string }` with proper status codes, log the underlying error server-side.
- Exa/LLM failures: one automatic retry with backoff, then surface to UI.
- The app must never white-screen. Wrap pages in error boundaries.

## Demo mode

- `?demo=1` on any page loads `lib/demo-fixtures.ts` (a captured real run) instead of live calls. Update fixtures whenever the pipeline output shape changes. This is the live-pitch insurance policy.

## Git discipline (hackathon rules require it)

- Commit early, commit often, small commits with clear messages (`feat:`, `fix:`, `ui:`). Judges check commit history; work only counts between 3 July 4PM and 6 July 12PM.
- Never commit `.env.local`, API keys, or the uploaded test resumes. Add `*.pdf` under a `/test-data` gitignore rule.
- `npm run build` must pass before pushing to main. Broken main during judging = lost marks.

## README requirements (hackathon submission depends on this)

Keep README.md current with:
- What it does + screenshot/GIF
- Setup steps (env vars, both LLM provider modes)
- **Third-party materials list** (required by rules): Exa API, OpenRouter/DeepSeek, Claude Agent SDK, shadcn/ui, Vercel AI SDK, Framer Motion, pdf-parse, any fonts/icons
- Architecture diagram (the one from PRD.md is fine)

## What NOT to do

- Don't add auth, a database, payments, or user accounts.
- Don't scrape LinkedIn or any site behind a login.
- Don't fabricate jobs, people, or credentials in any output shown to users.
- Don't introduce `ANTHROPIC_API_KEY`.
- Don't add features not in the PRD without asking. If a P0 item is broken, fixing it beats anything else.
- Don't use em dashes in any user-facing generated message copy.
