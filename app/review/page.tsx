// Profile review/edit page shell. A feature agent fills in the real
// profile-form component (components/profile-form.tsx) wired to the parsed
// profile in lib/store.ts. Kept intentionally bare.

export default function ReviewPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">
          Confirm your profile
        </h1>
        <p className="text-sm text-muted-foreground">
          Check the details Inroad pulled from your resume before we search
          for matches.
        </p>
      </div>

      {/* Profile form slot — a feature agent replaces this with
          components/profile-form.tsx bound to useAppState().profile. */}
      <div
        className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-border bg-card/50 p-10"
        aria-label="Profile form placeholder"
      >
        <p className="text-sm text-muted-foreground">Profile form goes here</p>
      </div>
    </main>
  );
}
