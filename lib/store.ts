import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Profile, JobMatch, Contact } from "./schemas";

type AppState = {
  profile: Profile | null;
  jobs: JobMatch[];
  contacts: Contact[];
  activeContactId: string | null;

  setProfile: (profile: Profile | null) => void;
  setJobs: (jobs: JobMatch[]) => void;
  addJob: (job: JobMatch) => void;
  setContacts: (contacts: Contact[]) => void;
  addContact: (contact: Contact) => void;
  updateContact: (id: string, patch: Partial<Contact>) => void;
  setActiveContact: (id: string | null) => void;
  reset: () => void;
};

const initialState = {
  profile: null,
  jobs: [],
  contacts: [],
  activeContactId: null,
} satisfies Pick<AppState, "profile" | "jobs" | "contacts" | "activeContactId">;

export const useAppState = create<AppState>()(
  persist(
    (set) => ({
      ...initialState,

      setProfile: (profile) => set({ profile }),
      setJobs: (jobs) => set({ jobs }),
      addJob: (job) => set((state) => ({ jobs: [...state.jobs, job] })),
      setContacts: (contacts) => set({ contacts }),
      addContact: (contact) => set((state) => ({ contacts: [...state.contacts, contact] })),
      updateContact: (id, patch) =>
        set((state) => ({
          contacts: state.contacts.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      setActiveContact: (id) => set({ activeContactId: id }),
      reset: () => set(initialState),
    }),
    {
      name: "inroad-app-state",
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
