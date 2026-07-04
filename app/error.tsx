"use client";

import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Root error boundary. Friendly copy + a retry action, so the app never
// white-screens.

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h1>
      <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
        That was unexpected on our end. Nothing you did caused this, give it
        another try.
      </p>
      <button
        onClick={reset}
        className={cn(buttonVariants({ size: "lg" }), "px-6")}
      >
        Try again
      </button>
    </main>
  );
}
