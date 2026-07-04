#!/usr/bin/env node
// Golden-path integration test: drives the full pipeline against a running dev
// server, end to end, the same way the app does.
//
//   parse-resume -> search-jobs -> find-people -> draft-message
//
// It asserts the hard invariants from CLAUDE.md: a real parsed profile, at
// least one real job with a URL, contacts only ever from linkedin.com (never
// fabricated), and a draft that is 80-120 words with zero em dashes.
//
// Requirements (this does NOT run in CI without them):
//   1. A dev server running:            npm run dev
//   2. A text-based PDF resume at:       test-data/resume.pdf  (gitignored)
//   3. Valid keys in .env.local          (EXA_API_KEY, and either the Agent SDK
//                                          subscription or OPENROUTER_API_KEY)
//
// Run:  node scripts/golden-path.mjs
// Exits non-zero on the first failed assertion.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";

const BASE = process.env.GOLDEN_PATH_BASE ?? "http://localhost:3000";
const RESUME_PATH = process.env.GOLDEN_PATH_RESUME ?? "test-data/resume.pdf";

let failures = 0;
function check(label, condition, detail = "") {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures++;
    console.error(`  FAIL  ${label}${detail ? `  (${detail})` : ""}`);
  }
}

function wordCount(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

async function main() {
  if (!existsSync(RESUME_PATH)) {
    console.error(
      `No resume fixture at ${RESUME_PATH}. Drop a text-based PDF there (gitignored) and re-run.`
    );
    process.exit(2);
  }

  // --- 1. parse-resume ---------------------------------------------------
  console.log("\n[1/4] parse-resume");
  const pdf = await readFile(RESUME_PATH);
  const form = new FormData();
  form.append("file", new Blob([pdf], { type: "application/pdf" }), "resume.pdf");

  const parseRes = await fetch(`${BASE}/api/parse-resume`, {
    method: "POST",
    body: form,
  });
  check("parse-resume responds 200", parseRes.status === 200, `got ${parseRes.status}`);
  const { profile } = await parseRes.json();
  check("profile has a name", Boolean(profile?.name));
  check("profile has target roles", Array.isArray(profile?.targetRoles) && profile.targetRoles.length > 0);
  check("profile has skills", Array.isArray(profile?.skills) && profile.skills.length > 0);

  // --- 2. search-jobs (NDJSON stream) ------------------------------------
  console.log("\n[2/4] search-jobs");
  const jobsRes = await fetch(`${BASE}/api/search-jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile }),
  });
  check("search-jobs responds 200", jobsRes.status === 200, `got ${jobsRes.status}`);

  const jobs = [];
  const reader = jobsRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (line.trim()) jobs.push(JSON.parse(line));
    }
  }
  if (buffer.trim()) jobs.push(JSON.parse(buffer));

  check("at least one job returned", jobs.length >= 1, `got ${jobs.length}`);
  check("every job has a real URL", jobs.every((j) => typeof j.url === "string" && j.url.startsWith("http")));
  check("every job has a fit rationale", jobs.every((j) => typeof j.fitRationale === "string" && j.fitRationale.length > 0));

  // --- 3. find-people ----------------------------------------------------
  console.log("\n[3/4] find-people");
  const targetJob = jobs[0];
  const peopleRes = await fetch(`${BASE}/api/find-people`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job: targetJob }),
  });
  check("find-people responds 200", peopleRes.status === 200, `got ${peopleRes.status}`);
  const { contacts } = await peopleRes.json();
  check("contacts is an array", Array.isArray(contacts));
  // An empty result is valid (never fabricate). If any came back, they must be linkedin.
  check(
    "every contact is a real linkedin.com URL (or none returned)",
    contacts.every((c) => typeof c.linkedinUrl === "string" && c.linkedinUrl.includes("linkedin.com"))
  );

  if (contacts.length === 0) {
    console.log("  note  no public contacts found for this job; skipping draft assertions.");
    return report();
  }

  // --- 4. draft-message (text stream) ------------------------------------
  console.log("\n[4/4] draft-message");
  const contact = contacts[0];
  const draftRes = await fetch(`${BASE}/api/draft-message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile, job: targetJob, contact, tone: "professional" }),
  });
  check("draft-message responds 200", draftRes.status === 200, `got ${draftRes.status}`);
  const draft = await draftRes.text();

  const words = wordCount(draft);
  check("draft is 80-120 words", words >= 80 && words <= 120, `got ${words} words`);
  check("draft contains NO em dash", !draft.includes("—"));
  check("draft has no [placeholder] tokens", !/\[[A-Za-z ]+\]/.test(draft));

  report();
}

function report() {
  console.log("");
  if (failures > 0) {
    console.error(`Golden path FAILED with ${failures} failed assertion(s).`);
    process.exit(1);
  }
  console.log("Golden path PASSED.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Golden path crashed:", err);
  process.exit(1);
});
