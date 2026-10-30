import "server-only";
import { execFile, spawn } from "node:child_process";

export const FFMPEG = process.env.FFMPEG_PATH || "ffmpeg";
export const FFPROBE = process.env.FFPROBE_PATH || "ffprobe";
export const YT_DLP = process.env.YT_DLP_PATH || "yt-dlp";

/** Ejecuta un binario sin shell (los argumentos no se interpretan) */
export function run(cmd: string, args: string[], opts: { maxBuffer?: number } = {}): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, { maxBuffer: opts.maxBuffer ?? 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      if (err) reject(new Error(`${cmd} falló: ${stderr?.toString().slice(-800) || err.message}`));
      else resolve({ stdout: stdout.toString(), stderr: stderr.toString() });
    });
  });
}

/** Como run, pero devuelve stdout binario (para leer audio PCM) */
export function runBuffer(cmd: string, args: string[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    const chunks: Buffer[] = [];
    let err = "";
    p.stdout.on("data", (c: Buffer) => chunks.push(c));
    p.stderr.on("data", (c: Buffer) => (err += c.toString()));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`${cmd} falló: ${err.slice(-800)}`))));
  });
}

export async function isAvailable(cmd: string): Promise<boolean> {
  try {
    await run(cmd, ["--version"]);
    return true;
  } catch {
    try {
      await run(cmd, ["-version"]);
      return true;
    } catch {
      return false;
    }
  }
}
