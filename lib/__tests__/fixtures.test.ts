import { describe, expect, it } from "vitest";
import { DEMO } from "../demo-fixtures";
import * as prompts from "../prompts";
import { cn } from "../utils";
import { ContactSchema, JobMatchSchema, ProfileSchema } from "../schemas";

// CLAUDE.md: demo fixtures must be updated whenever the pipeline output shape
// changes — these tests turn that rule into a CI failure instead of a broken
// live demo.
describe("demo fixtures stay in sync with the schemas", () => {
  it("demo profile validates against ProfileSchema", () => {
    expect(() => ProfileSchema.parse(DEMO.profile)).not.toThrow();
  });

  it("every demo job validates against JobMatchSchema", () => {
    for (const job of DEMO.jobs) {
      expect(() => JobMatchSchema.parse(job)).not.toThrow();
    }
  });

  it("every demo contact validates against ContactSchema", () => {
    for (const contact of DEMO.contacts) {
      expect(() => ContactSchema.parse(contact)).not.toThrow();
    }
  });

  it("every demo contact references a demo job", () => {
    const jobIds = new Set(DEMO.jobs.map((j) => j.id));
    for (const contact of DEMO.contacts) {
      expect(jobIds.has(contact.jobId)).toBe(true);
    }
  });
});

describe("prompts", () => {
  it("exports only substantial, non-empty prompt strings", () => {
    const entries = Object.entries(prompts);
    expect(entries.length).toBeGreaterThanOrEqual(7);
    for (const [, value] of entries) {
      expect(typeof value).toBe("string");
      expect((value as string).length).toBeGreaterThan(100);
    }
  });

  it("DRAFT_MESSAGE enforces the no-em-dash rule for human-sounding output", () => {
    expect(prompts.DRAFT_MESSAGE.toLowerCase()).toContain("em dash");
  });
});

describe("cn", () => {
  it("merges conflicting tailwind classes, last one winning", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });

  it("drops falsy conditional classes", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });
});
