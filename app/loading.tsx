import { Skeleton } from "@/components/ui/skeleton";

// Root loading skeleton shown during route transitions/data fetches.

export default function Loading() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 px-6 py-16">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="mt-6 h-40 w-full rounded-xl" />
    </main>
  );
}
