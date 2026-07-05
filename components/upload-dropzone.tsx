"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { FileText, UploadCloud } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { ResumeLoadingScreen } from "@/components/resume-loading-screen";
import { cn } from "@/lib/utils";
import { useAppState } from "@/lib/store";
import type { Profile } from "@/lib/schemas";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function UploadDropzone() {
  const router = useRouter();
  const setProfile = useAppState((state) => state.setProfile);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        toast.error("Only PDF files are supported. Please upload a .pdf resume.");
        return;
      }

      if (file.size > MAX_FILE_BYTES) {
        toast.error("That file is too large. Please upload a resume under 5MB.");
        return;
      }

      setFileName(file.name);
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/parse-resume", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to parse your resume. Please try again.");
        }

        setProfile(data.profile as Profile);
        setIsComplete(true);
        await new Promise((resolve) => setTimeout(resolve, 400));
        router.push("/review");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to parse your resume. Please try again.";
        toast.error(message);
        setIsUploading(false);
        setIsComplete(false);
        setFileName(null);
      }
    },
    [router, setProfile]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragging(false);
      const file = event.dataTransfer.files?.[0];
      if (file) void uploadFile(file);
    },
    [uploadFile]
  );

  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) void uploadFile(file);
      event.target.value = "";
    },
    [uploadFile]
  );

  const openFileBrowser = useCallback(() => {
    if (isUploading) return;
    inputRef.current?.click();
  }, [isUploading]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFileBrowser();
      }
    },
    [openFileBrowser]
  );

  if (isUploading) {
    return (
      <>
        <div
          className="flex w-full flex-col items-center gap-4 rounded-2xl border border-border bg-card/50 p-12 shadow-sm"
          aria-hidden="true"
        >
          <div className="flex w-full items-center gap-3">
            <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
            <span className="truncate text-sm text-foreground">{fileName}</span>
          </div>
          <div className="flex w-full flex-col gap-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
        <AnimatePresence>
          <ResumeLoadingScreen fileName={fileName} complete={isComplete} />
        </AnimatePresence>
      </>
    );
  }

  return (
    <motion.div
      role="button"
      tabIndex={0}
      aria-label="Upload your resume PDF. Drag and drop, or press Enter to browse files."
      onClick={openFileBrowser}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      whileTap={{ scale: 0.93 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex w-full cursor-pointer flex-col items-center gap-4 rounded-2xl border border-dashed p-12 shadow-sm outline-none transition-colors duration-300",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDragging
          ? "border-primary bg-accent"
          : "border-border bg-card/50 hover:border-primary/40 hover:bg-accent/40"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={handleFileInputChange}
        aria-hidden="true"
        tabIndex={-1}
      />
      <UploadCloud className="size-8 text-muted-foreground" aria-hidden="true" />
      <div className="flex flex-col items-center gap-1 text-center">
        <p className="text-sm font-medium text-foreground">
          Drag and drop your resume, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">PDF only, up to 5MB</p>
      </div>
    </motion.div>
  );
}
