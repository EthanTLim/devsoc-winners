import type { Profile, JobMatch, Contact, OfficialContact } from "./schemas";

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
  {
    id: "brightlabs-frontend-0",
    title: "Frontend Engineer",
    company: "Bright Labs",
    location: "Sydney, NSW",
    url: "https://example.com/bright-labs",
    source: "example.com",
    fitRationale:
      "Bright Labs is a small Sydney product studio whose React and TypeScript stack lines up with Jordan's internal-dashboard project. A lean team like this often hires strong candidates through a direct approach rather than a formal listing.",
    kind: "potential",
    hiringLikelihood: "high",
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
  {
    id: "contact-1",
    jobId: "brightlabs-frontend-0",
    name: "Priya Chandra",
    title: "Founding Engineer",
    company: "Bright Labs",
    linkedinUrl: "https://www.linkedin.com/in/example-priya-chandra",
    draftMessage:
      "Hi Priya, I came across Bright Labs while looking into small Sydney product studios and really like the focus on lean, fast-moving teams. I don't see a listed opening, but I wanted to reach out directly. I recently built an internal dashboard used by over 40 staff and cut API response times by 30% through caching, and I'd bring that same attention to performance and usability to a Frontend Engineer role at Bright Labs. Would you be open to a short chat about where the team is headed.",
    tone: "professional",
  },
];

// Fixture "official points of contact" (public careers page + listed hiring
// email) for the demo pitch, keyed by company. Uses the same obviously-fake
// example.com style as the rest of this file's fixtures (not real people, so
// this is exempt from the "never fabricate a contact" rule, which is about
// live search results).
export const DEMO_OFFICIAL_CONTACTS: OfficialContact[] = [
  {
    company: "Acme Corp",
    careersUrl: "https://example.com/acme/careers",
    email: "careers@example.com",
    source: "https://example.com/acme/careers",
  },
  {
    company: "Bright Labs",
    careersUrl: "https://example.com/bright-labs/careers",
    email: "hello@example.com",
    source: "https://example.com/bright-labs/careers",
  },
];

export const DEMO = {
  profile,
  jobs,
  contacts,
};
