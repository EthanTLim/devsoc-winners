import { z } from "zod";

// Zod schemas + inferred types for the core Inroad data models.
// Mirrors PRD.md section 7 exactly. This file is frozen after initial landing —
// downstream feature agents import these types/schemas, they do not redefine them.

export const ExperienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  duration: z.string(),
  highlights: z.array(z.string()),
});
export type Experience = z.infer<typeof ExperienceSchema>;

export const EducationSchema = z.object({
  degree: z.string(),
  institution: z.string(),
  year: z.string(),
});
export type Education = z.infer<typeof EducationSchema>;

export const PreferencesSchema = z.object({
  remote: z.enum(["remote", "hybrid", "onsite", "any"]),
  locations: z.array(z.string()),
  freeText: z.string(),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const ProfileSchema = z.object({
  name: z.string(),
  email: z.string().optional(),
  location: z.string(),
  targetRoles: z.array(z.string()),
  skills: z.array(z.string()),
  experience: z.array(ExperienceSchema),
  education: z.array(EducationSchema),
  preferences: PreferencesSchema,
});
export type Profile = z.infer<typeof ProfileSchema>;

export const JobMatchSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  location: z.string(),
  url: z.string(),
  source: z.string(),
  fitRationale: z.string(),
  fitScore: z.number().optional(),
  // Application closing/deadline date, only ever set when a real date
  // genuinely appears in the posting text. Optional so existing data
  // (and jobs with no stated deadline) still validate.
  deadline: z.string().optional(),
  // "listed" = a real public job posting (the default when omitted).
  // "potential" = a small/mid firm surfaced as a cold-outreach prospect,
  // not an advertised role.
  kind: z.enum(["listed", "potential"]).optional(),
  // Only ever set on kind:"potential" firms. The discover-firms pipeline only
  // emits high/medium prospects; low-likelihood firms are dropped, never shown.
  hiringLikelihood: z.enum(["high", "medium"]).optional(),
});
export type JobMatch = z.infer<typeof JobMatchSchema>;

export const ContactSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  name: z.string(),
  title: z.string(),
  company: z.string(),
  // linkedinUrl is optional now: a contact found via general web search
  // (not LinkedIn) may have an email + source instead.
  linkedinUrl: z.string().optional(),
  email: z.string().optional(),
  source: z.string().optional(),
  draftMessage: z.string(),
  tone: z.enum(["professional", "friendly", "direct"]),
});
export type Contact = z.infer<typeof ContactSchema>;
