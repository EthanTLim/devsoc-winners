import type { Profile, JobMatch, Contact } from "./schemas";

// Cached "real run" fixture used by ?demo=1 mode, the live-pitch insurance
// policy. This is a minimal but fully-typed stub for now; issue #8 replaces
// these values with a real captured pipeline run. Keep this shape in sync
// with lib/schemas.ts whenever the pipeline output shape changes.

const profile: Profile = {
  name: "Jordan Avery",
  email: "jordan.avery@example.com",
  location: "Sydney, NSW",
  targetRoles: ["Software Engineer Intern"],
  skills: ["TypeScript", "React", "Node.js", "Python", "SQL"],
  experience: [
    {
      title: "Software Engineering Intern",
      company: "Example Co",
      duration: "Nov 2024 - Feb 2025",
      highlights: [
        "Built an internal dashboard used by 40+ staff.",
        "Reduced API response times by 30% through caching.",
      ],
    },
  ],
  education: [
    {
      degree: "Bachelor of Computer Science",
      institution: "University of New South Wales",
      year: "2026",
    },
  ],
  preferences: {
    remote: "hybrid",
    locations: ["Sydney", "Remote"],
    freeText: "Looking for a grad software engineering role in a product team.",
  },
};

const jobs: JobMatch[] = [
  {
    id: "acme-swe-intern-0",
    title: "Software Engineer Intern",
    company: "Acme Corp",
    location: "Sydney, NSW",
    url: "https://example.com/jobs/acme-swe-intern",
    source: "example.com",
    fitRationale:
      "Jordan's dashboard project and React/Node experience line up closely with Acme's internal-tools team stack.",
    fitScore: 82,
  },
];

const contacts: Contact[] = [
  {
    id: "contact-0",
    jobId: "acme-swe-intern-0",
    name: "Sam Rivera",
    title: "Engineering Manager, Internal Tools",
    company: "Acme Corp",
    linkedinUrl: "https://www.linkedin.com/in/example-sam-rivera",
    draftMessage:
      "Hi Sam, I saw you lead the Internal Tools team at Acme Corp and noticed the Software Engineer Intern opening on that team. I recently built an internal dashboard used by over 40 staff, which cut a lot of the manual reporting work. I would love to bring that same focus on real usability to the intern role. Would you be open to a quick chat about the team.",
    tone: "professional",
  },
];

export const DEMO = {
  profile,
  jobs,
  contacts,
};
