import "server-only";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { Person, Reference, RenderJob } from "../types";

export const DATA_DIR = path.join(process.cwd(), "data");
export const MEDIA_DIR = path.join(DATA_DIR, "media");
export const TMP_DIR = path.join(DATA_DIR, "tmp");
const DB_FILE = path.join(DATA_DIR, "db.json");

interface DB {
  people: Person[];
  references: Reference[];
  renders: RenderJob[];
}

const EMPTY: DB = { people: [], references: [], renders: [] };

export async function ensureDirs() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.mkdir(TMP_DIR, { recursive: true });
}

async function readDb(): Promise<DB> {
  try {
    return { ...EMPTY, ...JSON.parse(await fs.readFile(DB_FILE, "utf8")) };
  } catch {
    return structuredClone(EMPTY);
  }
}

// Escrituras en serie para no pisar cambios concurrentes
let queue: Promise<unknown> = Promise.resolve();

export function updateDb<T>(fn: (db: DB) => T | Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    await ensureDirs();
    const db = await readDb();
    const result = await fn(db);
    const tmp = `${DB_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(db, null, 2));
    await fs.rename(tmp, DB_FILE);
    return result;
  });
  queue = run.catch(() => undefined);
  return run;
}

export async function getDb(): Promise<DB> {
  await queue;
  return readDb();
}

export function newId(): string {
  return crypto.randomBytes(8).toString("hex");
}

/**
 * Nombre de archivo no adivinable: /api/media no pide sesión (el render
 * lo consume sin cookies), así que el nombre hace de "llave".
 */
export function mediaName(ext: string): string {
  const clean = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "bin";
  return `${crypto.randomBytes(16).toString("hex")}.${clean}`;
}

export const MEDIA_NAME_RE = /^[a-f0-9]{32}\.[a-z0-9]{1,5}$/;

export function mediaPath(file: string): string {
  if (!MEDIA_NAME_RE.test(file)) throw new Error("Nombre de archivo inválido");
  return path.join(MEDIA_DIR, file);
}

export async function saveMedia(data: Buffer | Uint8Array, ext: string): Promise<string> {
  await ensureDirs();
  const name = mediaName(ext);
  await fs.writeFile(path.join(MEDIA_DIR, name), data);
  return name;
}

export function extFromMime(mime: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/heic": "heic",
    "video/mp4": "mp4",
    "video/quicktime": "mov",
    "video/webm": "webm",
    "audio/mpeg": "mp3",
    "audio/mp4": "m4a",
    "audio/aac": "aac",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
  };
  return map[mime] ?? mime.split("/")[1] ?? "bin";
}
