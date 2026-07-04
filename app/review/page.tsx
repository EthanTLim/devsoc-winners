// Profile review/edit page shell. Profile form slot filled by
// components/profile-form.tsx wired to the parsed profile in lib/store.ts.

import { ProfileForm } from "@/components/profile-form";

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

      {/* #profile-form-slot */}
      <div id="profile-form-slot">
        <ProfileForm />
      </div>
    </main>
  );
}
