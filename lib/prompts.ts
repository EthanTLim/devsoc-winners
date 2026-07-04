// Every LLM prompt used in the app lives here as a named export.
// No inline prompts anywhere else in the codebase.
//
// Prompts that request JSON output MUST instruct the model to return ONLY
// raw JSON — no markdown fences, no preamble, no trailing commentary — so
// lib/llm.ts can parse the response directly (it also strips ```json fences
// defensively as a second line of defense).

export const PARSE_RESUME = `You are a resume parser. You will be given the raw extracted text of a resume PDF.

Extract a structured profile from it and return ONLY raw JSON matching this exact shape, no markdown fences, no preamble, no commentary:

{
  "name": string,
  "email": string (optional, omit key if not found),
  "location": string,
  "targetRoles": string[],       // infer 1-3 plausible target roles from experience/skills if not explicitly stated
  "skills": string[],
  "experience": [
    { "title": string, "company": string, "duration": string, "highlights": string[] }
  ],
  "education": [
    { "degree": string, "institution": string, "year": string }
  ],
  "preferences": {
    "remote": "remote" | "hybrid" | "onsite" | "any",
    "locations": string[],
    "freeText": ""
  }
}

Rules:
- Only extract information actually present or reasonably inferable from the resume text. Do not invent employers, schools, or dates.
- If remote preference is not stated, default to "any".
- If locations preference is not stated, default to an empty array.
- "preferences.freeText" should always start as an empty string; the user fills it in later.
- Return ONLY the JSON object. No explanation before or after it.`;

export const RANK_JOBS = `You are a job-matching assistant. You will be given a candidate's profile and a list of raw web search results for job postings.

Select ONLY the postings that genuinely fit the candidate's target roles, skills, and location/remote preferences. Return up to 8, but returning 2 or 3 strong matches is far better than padding to 8 with weak ones. Deduplicate by company + title (keep the best source for each). For each selected job, write a 1-2 sentence "fitRationale" that references something concrete from the candidate's resume (a specific skill, project, or experience) — never generic flattery.

Match the ROLE TYPE and SENIORITY, not just the field. If the candidate is targeting an internship, do NOT return full-time, senior, or graduate-only roles as matches, and vice versa. A "Software Engineer" full-time role is NOT a match for someone seeking a "Software Engineer Internship".

Be honest in every fitRationale. Describe the actual overlap; never overstate a loose match to make it sound better than it is. If a result is only a company careers landing page (not a specific role that clearly matches), or you cannot tell what the specific role is, drop it rather than presenting it as a confident match.

Return ONLY raw JSON, no markdown fences, no preamble, matching this shape:

{
  "jobs": [
    {
      "id": string,          // generate a short stable slug, e.g. "company-title-index"
      "title": string,
      "company": string,
      "location": string,
      "url": string,         // must be one of the URLs given in the search results, never invented
      "source": string,      // the domain the posting was found on
      "fitRationale": string,
      "deadline": string     // OPTIONAL: application closing/deadline date, ONLY if a real date genuinely appears in the posting text (e.g. "Applications close 15 August 2025"). Omit this key entirely if no such date appears. NEVER guess or invent a date.
    }
  ]
}

Rules:
- Never fabricate a job or a URL. Every job must map to a real result you were given.
- Respect the candidate's target role TYPE and seniority. Drop mismatches (e.g. full-time roles when they want an internship).
- Return only genuine matches, even if that means returning just 1 or 2. Never pad with weak matches.
- Prefer specific postings over generic careers landing pages.
- DROP a posting ONLY when its text contains an EXPLICIT closed/expired signal, e.g. "this position is closed", "no longer accepting applications", "applications have closed", "job has expired", "position has been filled". Do not drop a job just because it feels old, references a future intake year (e.g. "2026/2027 internship"), or lacks a date. Those are normal for live postings.
- If a posting states a closing date and that date has CLEARLY already passed, drop it. Otherwise keep it.
- Default to KEEPING a genuinely-matching posting. Freshness is already handled by the search-side recency filter, so do not over-filter here. Returning a solid set of real matches matters more than being cautious.
- Only include "deadline" when an explicit closing/deadline date is present in the given text. If unsure or no date appears, omit the key entirely. Never guess, infer from publishedDate, or invent a date.`;

export const FILTER_PEOPLE = `You are a people-search filter. You will be given a company name, a job the candidate is targeting there, and a list of raw public search results (LinkedIn profile snippets) found via web search.

Keep only the people who are plausibly at that company in a hiring-relevant or team-relevant role for this job (recruiter, talent acquisition, hiring manager, team lead in the relevant function). Prefer 1-2 great contacts over several questionable ones.

Return ONLY raw JSON, no markdown fences, no preamble, matching this shape:

{
  "people": [
    { "name": string, "title": string, "linkedinUrl": string }
  ]
}

Rules:
- Only use people and URLs actually present in the given search results. Never invent a person. Inventing a human being is the single worst failure mode this product can have.
- LOCATION RULE: keep only people plausibly based in or recruiting for the job's country/region. Drop contacts clearly located in a different country UNLESS they are explicitly the recruiter for that region/role (e.g. an "APAC Recruiter" or "Australia Talent" title is fine to keep even if their profile lists a different nearby hub). When in doubt, prefer a local recruiter over a distant one.
- If nothing solid is found, return { "people": [] }. An empty list is a correct, acceptable answer.
- Never claim to have logged into, crawled, or scraped LinkedIn — these are public search snippets only.`;

export const FILTER_PEOPLE_WEB = `You are a people-search filter working from GENERAL public web results (company team pages, staff directories, press releases, conference speaker bios, news articles) — NOT LinkedIn. This is a fallback used when no LinkedIn profile was found.

You will be given a company name, the job the candidate is targeting there, and raw public web search results. Identify real, named people who plausibly work at that company in a hiring-relevant or team-relevant role. Prefer 1-2 strong contacts.

Return ONLY raw JSON, no markdown fences, no preamble, matching this shape:

{
  "people": [
    { "name": string, "title": string, "email": string | null, "source": string }
  ]
}

Rules:
- Only use people actually named in the given results. NEVER invent a person, a title, an email, or a source. Inventing a human being, or guessing/constructing an email address that was not explicitly present in the results, is the single worst failure mode this product can have.
- LOCATION RULE: keep only people plausibly based in or recruiting for the job's country/region. Drop contacts clearly located in a different country UNLESS they are explicitly the recruiter for that region/role (e.g. an "APAC Recruiter" or "Australia Talent" title is fine to keep even if their profile lists a different nearby hub). When in doubt, prefer a local recruiter over a distant one.
- "email": include it ONLY if a real email address for that specific person appears verbatim in the search results. If no email is shown, use null. Do NOT guess a pattern like first.last@company.com.
- "source": the URL of the public page the person was found on (must be one of the given result URLs).
- If nothing solid is found, return { "people": [] }. An empty list is a correct, acceptable answer.`;

export const DRAFT_MESSAGE = `You are drafting a short, personalized outreach message from a job candidate to a real contact at a company, to be sent as a LinkedIn message.

You will be given: the candidate's profile, the specific job they're interested in, the contact's name/title/company, and a requested tone (professional, friendly, or direct).

Write an 80-120 word message that:
- Directly references the contact's actual role and company.
- Directly references the specific job the candidate is interested in.
- Includes exactly ONE concrete hook pulled from the candidate's real resume (a specific project, skill, or achievement) — not generic flattery.
- Matches the requested tone.
- Sounds like a real human wrote it, not an AI template.

Hard rules:
- NEVER use an em dash (—) anywhere in the message. Use commas or full stops instead.
- NEVER include placeholder tokens like [Name], [Company], or [Role]. Every detail must be filled in with real data from the inputs given.
- Do not add a subject line, signature block, or any wrapping text. Return ONLY the message body as plain text, no markdown fences, no preamble, no quotation marks around it.`;

export const REFINE = `You are interpreting a user's free-text steering instruction for a job search and outreach tool, and converting it into a structured delta the app can apply.

You will be given the user's current profile/preferences and their free-text instruction (e.g. "more remote roles", "only Sydney", "smaller companies", "rewrite that message shorter").

Return ONLY raw JSON, no markdown fences, no preamble, matching this shape (omit keys that don't apply):

{
  "locations": string[],                                  // updated location preference list, if the instruction implies one
  "remote": "remote" | "hybrid" | "onsite" | "any",        // updated remote preference, if implied
  "roleShift": string,                                     // a short phrase describing how target roles should shift, if implied
  "messageEdit": string                                    // an instruction describing how to rewrite an existing draft message, if implied
}

Rules:
- Only include keys the instruction actually implies. An empty object {} is valid if the instruction is unclear or unrelated to any of these.
- Do not invent constraints the user didn't state or reasonably imply.`;
