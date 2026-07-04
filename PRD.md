# PRD — Inroad (working name, rename freely)

**One-liner:** Upload your resume. An AI agent finds live jobs that actually fit you, finds the real humans behind them, and drafts the message that gets you in the door.

**Hackathon theme fit (Accessibility):** Job opportunities are gated behind time, insider knowledge, and networks. Most applicants fire resumes into ATS black holes because they don't know who to talk to or how. Inroad makes opportunity *accessible*: it collapses hours of searching, company research, and cold-outreach anxiety into one flow anyone can use. Access to opportunity should not depend on already having connections.

---

## 1. Problem Statement

Job seekers (especially students and early-career applicants) face three barriers:

1. **Discovery is slow.** Job boards are noisy, duplicated, and poorly matched to an individual's actual skills.
2. **Applications go nowhere.** Cold applications through portals have very low response rates; referrals and direct outreach massively outperform them, but most people don't know who to contact.
3. **Outreach is intimidating.** Writing a personalized message to a stranger is a skill; most people either don't do it or send generic spam that gets ignored.

Inroad solves all three in a single agentic flow.

## 2. Target User

- University students and new grads applying for internships/grad roles
- Career switchers who lack networks in their target industry
- Anyone who has a resume and 5 minutes

## 3. Core User Flow (the demo)

1. **Land** on a clean single-page app. One CTA: "Upload your resume."
2. **Upload** a PDF resume. Agent parses it into a structured profile (skills, experience, education, target roles, location).
3. **Confirm** the parsed profile on an editable review screen. User can tweak target role, location preference, remote/on-site, and add a free-text "what I'm looking for" line. This step matters: it builds trust and fixes parsing errors before search.
4. **Search.** Agent runs live web search for current job postings matching the profile. Results stream in as cards: role, company, location, link, and a 1–2 sentence "why this fits you" rationale grounded in the user's actual resume.
5. **Find people.** For each job the user stars/selects, the agent finds 1–2 real people at that company (recruiter, hiring manager, team lead in the relevant function) with their public LinkedIn profile URL and role.
6. **Draft outreach.** For each person, the agent drafts a short personalized message referencing (a) the person's role/company, (b) the specific job, and (c) one concrete hook from the user's resume. One-click copy. Tone selector: Professional / Friendly / Direct.
7. **Refine.** A persistent chat input lets the user steer the agent: "more remote roles", "only Sydney", "smaller companies", "rewrite that message shorter". Agent updates results in place.

## 4. Features (priority order)

### P0 — must work end-to-end for the demo
| # | Feature | Notes |
|---|---------|-------|
| F1 | Resume PDF upload + parsing | PDF → structured JSON profile via LLM. Handle 1–3 page resumes. |
| F2 | Profile review/edit screen | Editable fields, target-role + location + remote toggle, free-text preferences. |
| F3 | Agentic job search | Live search via Exa API. Return 5–8 real, current postings with links. Each card includes LLM-generated fit rationale. Results stream in progressively. |
| F4 | People finder | Exa search filtered to linkedin.com/in/ URLs, scoped to company + relevant function. Return name, title, profile URL. Never log into or scrape LinkedIn directly — public search results only. |
| F5 | Outreach drafting | Per-person personalized message (~80–120 words), copy button, 3 tone presets. |

### P1 — build if P0 is solid
| # | Feature | Notes |
|---|---------|-------|
| F6 | Refine chat | Free-text steering that re-runs search/drafts with modified constraints. |
| F7 | Fit score | 0–100 match score per job with a small breakdown (skills / experience / location). |
| F8 | Export | Download all results + drafts as a single markdown/PDF "action plan". |

### P2 — stretch, only if time is spare
| # | Feature | Notes |
|---|---------|-------|
| F9 | Multi-resume compare | "Which of my two resumes fits this role better?" |
| F10 | Follow-up sequencing | Draft a day-7 follow-up message per contact. |

## 5. Non-Goals (do NOT build)

- No user accounts, auth, or database. All state is client-side/session only.
- No actually *sending* messages (LinkedIn has no public messaging API; drafts + copy is the product).
- No logged-in LinkedIn scraping of any kind. Public web/search results only.
- No payment, no multi-language, no mobile app.

## 6. Architecture

```
Next.js 14 (App Router) on Vercel
│
├── Frontend: React + Tailwind + shadcn/ui + Framer Motion
│   ├── / (landing + upload)
│   ├── /review (profile confirmation)
│   └── /results (jobs, people, drafts, refine chat)
│
├── API routes (route handlers)
│   ├── POST /api/parse-resume    → LLM: PDF → profile JSON
│   ├── POST /api/search-jobs     → Exa search + LLM ranking/rationale (streams)
│   ├── POST /api/find-people     → Exa linkedin.com/in/ search + LLM filtering
│   ├── POST /api/draft-message   → LLM message generation (streams)
│   └── POST /api/refine          → interprets user steering, re-triggers above
│
├── LLM layer (abstracted — see CLAUDE.md)
│   ├── Local dev/demo: Claude via Agent SDK (Pro plan monthly credit, no API key)
│   └── Deployed fallback: OpenRouter (DeepSeek) via env switch
│
└── Search: Exa API (semantic web search, category + domain filtering)
```

**Key design decision — LLM abstraction:** all model calls go through a single `lib/llm.ts` module with one `complete()` and one `streamComplete()` function. Provider chosen by env var. This lets the team build free on the Claude subscription locally and flip one env var for the deployed version.

## 7. Data Models

```ts
type Profile = {
  name: string;
  email?: string;
  location: string;
  targetRoles: string[];        // e.g. ["Software Engineer Intern"]
  skills: string[];
  experience: { title: string; company: string; duration: string; highlights: string[] }[];
  education: { degree: string; institution: string; year: string }[];
  preferences: { remote: "remote" | "hybrid" | "onsite" | "any"; locations: string[]; freeText: string };
};

type JobMatch = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;               // domain the posting was found on
  fitRationale: string;         // 1–2 sentences, references the user's resume
  fitScore?: number;            // P1
};

type Contact = {
  id: string;
  jobId: string;
  name: string;
  title: string;
  company: string;
  linkedinUrl: string;
  draftMessage: string;
  tone: "professional" | "friendly" | "direct";
};
```

## 8. Judging Criteria Mapping

| Criterion | Weight | How we win it |
|-----------|--------|---------------|
| Innovation & Creativity | 25% | The people-finding + outreach layer. Everyone builds job matchers; nobody closes the loop to the actual human. Pitch leads with this. |
| Technical Complexity & Completeness | 20% | Multi-step agentic pipeline (parse → search → rank → find people → draft), streaming UX, live web data. One complete polished flow, zero broken buttons. |
| UX & Design | 20% | shadcn + Framer Motion, streaming cards, skeleton loaders, copy-to-clipboard micro-interactions. Feels like a product, not a hackathon repo. |
| Practicality & Feasibility | 15% | Solves a real universal problem; the demo IS the use case. Judges can imagine using it that afternoon. |
| Presentation & Pitch | 10% | Demo video shows one real resume going end-to-end to a real drafted message in under 2 minutes. |
| Team Collaboration | 10% | Frequent commits from all 3 members from kickoff onwards; clear commit messages. |
| Special prize (AI/agentic/infra) | bonus | Agentic multi-step pipeline, deployed on Vercel, built with Vercel AI SDK. Say all three words in the pitch. |

## 9. Demo Script (2 min)

1. (10s) Problem: "Applying online is a black hole. The people who get jobs know someone. Most of us don't."
2. (20s) Upload a real resume live. Profile appears, tweak one field.
3. (40s) Jobs stream in with fit rationales. Star two.
4. (30s) Real people at those companies appear with LinkedIn profiles. Click one — a personalized message referencing the job, the person, and the resume is already drafted. Copy it.
5. (10s) Refine: type "only remote roles" — results update.
6. (10s) Close: "From resume to a message in a real person's inbox in 3 minutes. Opportunity, made accessible."

## 10. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Exa returns stale/dead job links | Filter by recency in query; LLM validates each result looks like a live posting; show source domain so dead links look like the internet's fault, not ours. |
| People finder returns wrong/irrelevant people | LLM filter pass on Exa results: keep only profiles whose title matches recruiting/hiring/relevant team at that company. Return fewer, better contacts. |
| Live demo network failure | Record demo video early. For live pitch, keep a cached "demo mode" JSON fixture behind a query param (?demo=1) that replays a real prior run. |
| Rate limits / credit exhaustion | Agent SDK credit is $20/mo on Pro — plenty. Keep prompts lean; cache parsed profile client-side so re-search doesn't re-parse. |
| Scope creep | P0 complete before touching P1. Completeness is worth 20%; a broken stretch feature is negative value. |

## 11. Definition of Done

- A stranger can upload their resume and get real jobs + real people + copy-ready drafts with zero errors on the happy path.
- Deployed URL live on Vercel (with OpenRouter backend or demo mode).
- Demo video recorded.
- Repo public with a README covering setup, third-party materials (Exa, shadcn, etc. — required by hackathon rules), and architecture.
- All submission-form assets written (problem statement, 200–300 word solution description, 100–200 word reflections).
