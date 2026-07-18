import { describe, expect, it } from "vitest";
import {
  ContactSchema,
  JobMatchSchema,
  PreferencesSchema,
  ProfileSchema,
  RefineDeltaSchema,
} from "../schemas";

const validProfile = {
  name: "Ada Lovelace",
  location: "Sydney, AU",
  targetRoles: ["Software Engineer"],
  skills: ["TypeScript", "React"],
  experience: [
    {
      title: "Engineer",
      company: "Analytical Engines",
      duration: "2023–2025",
      highlights: ["Shipped the thing"],
    },
  ],
  education: [{ degree: "BSc", institution: "UNSW", year: "2023" }],
  preferences: { remote: "hybrid", locations: ["Sydney"], freeText: "" },
};

describe("ProfileSchema", () => {
  it("accepts a complete profile", () => {
    expect(ProfileSchema.parse(validProfile)).toEqual(validProfile);
  });

  it("accepts a profile without the optional email", () => {
    expect(() => ProfileSchema.parse(validProfile)).not.toThrow();
    expect(
      ProfileSchema.parse({ ...validProfile, email: "ada@example.com" }).email
    ).toBe("ada@example.com");
  });

  it("rejects a profile missing required fields", () => {
    const { name: _name, ...missingName } = validProfile;
    expect(() => ProfileSchema.parse(missingName)).toThrow();
  });

  it("rejects malformed experience entries", () => {
    const bad = {
      ...validProfile,
      experience: [{ title: "Engineer" }],
    };
    expect(() => ProfileSchema.parse(bad)).toThrow();
  });
});

describe("PreferencesSchema", () => {
  it("accepts every valid remote value", () => {
    for (const remote of ["remote", "hybrid", "onsite", "any"]) {
      expect(() =>
        PreferencesSchema.parse({ remote, locations: [], freeText: "" })
      ).not.toThrow();
    }
  });

  it("rejects unknown remote values", () => {
    expect(() =>
      PreferencesSchema.parse({ remote: "sometimes", locations: [], freeText: "" })
    ).toThrow();
  });
});

const validJob = {
  id: "j1",
  title: "Frontend Engineer",
  company: "Acme",
  location: "Sydney",
  url: "https://example.com/job",
  source: "adzuna",
  fitRationale: "Matches React experience.",
};

describe("JobMatchSchema", () => {
  it("accepts a minimal listed job", () => {
    expect(() => JobMatchSchema.parse(validJob)).not.toThrow();
  });

  it("accepts a potential firm with hiring likelihood", () => {
    const potential = {
      ...validJob,
      kind: "potential",
      hiringLikelihood: "high",
    };
    expect(JobMatchSchema.parse(potential).kind).toBe("potential");
  });

  it("rejects a low hiring likelihood (never shown to users)", () => {
    expect(() =>
      JobMatchSchema.parse({ ...validJob, kind: "potential", hiringLikelihood: "low" })
    ).toThrow();
  });

  it("rejects an unknown kind", () => {
    expect(() => JobMatchSchema.parse({ ...validJob, kind: "imaginary" })).toThrow();
  });
});

describe("RefineDeltaSchema", () => {
  it("accepts an empty delta (model omitted everything)", () => {
    expect(RefineDeltaSchema.parse({})).toEqual({});
  });

  it("accepts a partial delta", () => {
    const delta = { locations: ["Melbourne"], remote: "remote" };
    expect(RefineDeltaSchema.parse(delta)).toEqual(delta);
  });

  it("rejects an invalid remote value", () => {
    expect(() => RefineDeltaSchema.parse({ remote: "never" })).toThrow();
  });
});

const validContact = {
  id: "c1",
  jobId: "j1",
  name: "Grace Hopper",
  title: "Engineering Manager",
  company: "Acme",
  draftMessage: "Hi Grace, saw the frontend role...",
  tone: "professional",
};

describe("ContactSchema", () => {
  it("accepts a contact without linkedinUrl (web-search fallback)", () => {
    expect(() => ContactSchema.parse(validContact)).not.toThrow();
  });

  it("accepts every valid tone", () => {
    for (const tone of ["professional", "friendly", "direct"]) {
      expect(() => ContactSchema.parse({ ...validContact, tone })).not.toThrow();
    }
  });

  it("rejects an unknown tone", () => {
    expect(() => ContactSchema.parse({ ...validContact, tone: "sarcastic" })).toThrow();
  });
});
