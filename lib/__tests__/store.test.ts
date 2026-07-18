import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Contact, JobMatch } from "../schemas";

// The store persists to sessionStorage at import time, so stub it before
// importing the module under test.
const backing = new Map<string, string>();
vi.stubGlobal("sessionStorage", {
  getItem: (k: string) => backing.get(k) ?? null,
  setItem: (k: string, v: string) => void backing.set(k, v),
  removeItem: (k: string) => void backing.delete(k),
});

const { useAppState } = await import("../store");

function job(id: string, overrides: Partial<JobMatch> = {}): JobMatch {
  return {
    id,
    title: "Engineer",
    company: "Acme",
    location: "Sydney",
    url: `https://example.com/${id}`,
    source: "exa",
    fitRationale: "Fits.",
    ...overrides,
  };
}

function contact(id: string): Contact {
  return {
    id,
    jobId: "j1",
    name: "Grace Hopper",
    title: "EM",
    company: "Acme",
    draftMessage: "Hi",
    tone: "professional",
  };
}

describe("useAppState store", () => {
  beforeEach(() => {
    useAppState.getState().reset();
  });

  it("sets and clears the profile", () => {
    const state = useAppState.getState();
    expect(state.profile).toBeNull();
    state.setProfile({
      name: "Ada",
      location: "Sydney",
      targetRoles: [],
      skills: [],
      experience: [],
      education: [],
      preferences: { remote: "any", locations: [], freeText: "" },
    });
    expect(useAppState.getState().profile?.name).toBe("Ada");
  });

  it("addJob dedupes by URL so re-runs never double-add a posting", () => {
    const { addJob } = useAppState.getState();
    addJob(job("a"));
    addJob(job("b", { url: "https://example.com/a" }));
    expect(useAppState.getState().jobs).toHaveLength(1);
  });

  it("clearJobsOfKind('potential') keeps listed jobs only", () => {
    const { addJob, clearJobsOfKind } = useAppState.getState();
    addJob(job("listed1"));
    addJob(job("pot1", { kind: "potential", hiringLikelihood: "high" }));
    clearJobsOfKind("potential");
    expect(useAppState.getState().jobs.map((j) => j.id)).toEqual(["listed1"]);
  });

  it("clearJobsOfKind('listed') keeps potential firms only", () => {
    const { addJob, clearJobsOfKind } = useAppState.getState();
    addJob(job("listed1"));
    addJob(job("pot1", { kind: "potential", hiringLikelihood: "high" }));
    clearJobsOfKind("listed");
    expect(useAppState.getState().jobs.map((j) => j.id)).toEqual(["pot1"]);
  });

  it("updateContact patches only the matching contact", () => {
    const { setContacts, updateContact } = useAppState.getState();
    setContacts([contact("c1"), contact("c2")]);
    updateContact("c1", { draftMessage: "Updated" });
    const contacts = useAppState.getState().contacts;
    expect(contacts[0].draftMessage).toBe("Updated");
    expect(contacts[1].draftMessage).toBe("Hi");
  });

  it("toggleJobSelected adds then removes a selection", () => {
    const { toggleJobSelected } = useAppState.getState();
    toggleJobSelected("j1");
    expect(useAppState.getState().selectedJobIds).toEqual(["j1"]);
    useAppState.getState().toggleJobSelected("j1");
    expect(useAppState.getState().selectedJobIds).toEqual([]);
  });

  it("bumpSearch increments the nonce that re-triggers searches", () => {
    useAppState.getState().bumpSearch();
    useAppState.getState().bumpSearch();
    expect(useAppState.getState().searchNonce).toBe(2);
  });

  it("reset returns to the initial state", () => {
    const { addJob, setActiveContact } = useAppState.getState();
    addJob(job("a"));
    setActiveContact("c1");
    useAppState.getState().reset();
    const state = useAppState.getState();
    expect(state.jobs).toEqual([]);
    expect(state.activeContactId).toBeNull();
  });
});
