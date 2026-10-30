"use client";
import { useEffect, useState } from "react";

export interface Status {
  google: boolean;
  fullDriveRead: boolean;
  ffmpeg: boolean;
  ytdlp: boolean;
  ai: boolean;
}

let cached: Promise<Status> | null = null;

export function useStatus(): Status | null {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    cached ??= fetch("/api/status").then((r) => r.json());
    cached.then(setStatus).catch(() => setStatus(null));
  }, []);
  return status;
}
