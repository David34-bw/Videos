import "server-only";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import readline from "node:readline";
import type { RenderJob, TemplateId, VideoProps } from "../types";
import { MEDIA_DIR, TMP_DIR, ensureDirs, mediaName, newId, updateDb } from "./storage";

const MAX_JOBS_KEPT = 30;

async function saveJob(job: RenderJob) {
  await updateDb((db) => {
    const i = db.renders.findIndex((r) => r.id === job.id);
    if (i >= 0) db.renders[i] = job;
    else db.renders.unshift(job);
    db.renders = db.renders.slice(0, MAX_JOBS_KEPT);
  });
}

/** Lanza el render en segundo plano y devuelve el trabajo (se consulta por id) */
export async function startRender(template: TemplateId, props: VideoProps): Promise<RenderJob> {
  await ensureDirs();
  const job: RenderJob = { id: newId(), status: "queued", progress: 0, createdAt: new Date().toISOString() };
  const output = mediaName("mp4");
  const jobFile = path.join(TMP_DIR, `job-${job.id}.json`);
  await fs.writeFile(jobFile, JSON.stringify({ template, props, output: path.join(MEDIA_DIR, output) }));
  await saveJob(job);

  const child = spawn(process.execPath, [path.join(process.cwd(), "scripts", "render.mjs"), jobFile], {
    cwd: process.cwd(),
    env: process.env,
  });
  let stderr = "";
  child.stderr.on("data", (c: Buffer) => (stderr = (stderr + c.toString()).slice(-2000)));

  let lastSaved = 0;
  readline.createInterface({ input: child.stdout }).on("line", (line) => {
    let msg: { progress?: number; done?: boolean; error?: string; stage?: string };
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    if (msg.stage) job.status = "rendering";
    if (typeof msg.progress === "number") job.progress = msg.progress;
    if (msg.error) {
      job.status = "error";
      job.error = msg.error;
    }
    if (msg.done) {
      job.status = "done";
      job.progress = 1;
      job.output = output;
    }
    // Guarda el progreso como mucho cada segundo
    if (Date.now() - lastSaved > 1000 || msg.done || msg.error) {
      lastSaved = Date.now();
      void saveJob({ ...job });
    }
  });

  child.on("close", (code) => {
    void fs.rm(jobFile, { force: true });
    if (code !== 0 && job.status !== "error") {
      job.status = "error";
      job.error = stderr || `El render terminó con código ${code}`;
    }
    void saveJob({ ...job });
  });

  return job;
}
