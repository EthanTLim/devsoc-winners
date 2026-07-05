import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Profile, JobMatch, Contact } from "./schemas";

type AppState = {
  profile: Profile | null;
  jobs: JobMatch[];
  contacts: Contact[];
  activeContactId: string | null;
  selectedJobIds: string[];
  // Bumped whenever a refine (or other) action wants job/firm lists to clear
  // their `hasStarted` re-run guard and search again. Lists include this in
  // their search-trigger useEffect deps.
  searchNonce: number;
  // Signature of the search-relevant profile fields as of the last completed
  // job search. Compared against the current profile's signature so job-list
  // knows when a profile edit should trigger a fresh search.
  lastSearchProfileSig: string | null;

  setProfile: (profile: Profile | null) => void;
  setJobs: (jobs: JobMatch[]) => void;
  addJob: (job: JobMatch) => void;
  clearJobsOfKind: (kind: "listed" | "potential") => void;
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  setActiveContact: (id: string | null) => void;
  toggleJobSelected: (id: string) => void;
  bumpSearch: () => void;
  setLastSearchProfileSig: (sig: string | null) => void;
  reset: () => void;
};

const initialState = {
  profile: null,
  jobs: [],
  contacts: [],
  activeContactId: null,
  selectedJobIds: [],
  searchNonce: 0,
  lastSearchProfileSig: null,
} satisfies Pick<
  AppState,
  | "profile"
  | "jobs"
  | "contacts"
  | "activeContactId"
  | "selectedJobIds"
  | "searchNonce"
  | "lastSearchProfileSig"
>;

export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setProfile: (profile) => set({ profile }),
      setJobs: (jobs) => set({ jobs }),
      addJob: (job) =>
        set((state) =>
          // Dedupe by URL so "Find more" (or a re-run) never adds the same
          // posting twice.
          state.jobs.some((j) => j.url === job.url)
            ? state
            : { jobs: [...state.jobs, job] }
        ),
      clearJobsOfKind: (kind) =>
        set((state) => ({
          jobs: state.jobs.filter((j) =>
            kind === "potential" ? j.kind !== "potential" : j.kind === "potential"
          ),
        })),
      setContacts: (contacts) => set({ contacts }),
      addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
      updateContact: (id, patch) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      setActiveContact: (id) => set({ activeContactId: id }),
      toggleJobSelected: (id) =>
        set((state) => ({
          selectedJobIds: state.selectedJobIds.includes(id)
            ? state.selectedJobIds.filter((j) => j !== id)
            : [...state.selectedJobIds, id],
        })),
      bumpSearch: () => set((state) => ({ searchNonce: state.searchNonce + 1 })),
      setLastSearchProfileSig: (sig) => set({ lastSearchProfileSig: sig }),
      reset: () => set(initialState),
    }),
    {
      name: "inroad-app-state",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
