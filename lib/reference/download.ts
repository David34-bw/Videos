import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { YT_DLP, run } from "../server/exec";
import { TMP_DIR, ensureDirs, newId } from "../server/storage";

const ALLOWED_HOSTS = ["instagram.com", "tiktok.com", "youtube.com", "youtu.be", "facebook.com", "fb.watch"];

export function validateReelUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("El link no es válido");
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
    throw new Error("Solo se aceptan links https de Instagram, TikTok, YouTube o Facebook");
  }
  return url.toString();
}

/**
 * Descarga un reel con yt-dlp (debe estar instalado). Uso personal: respeta
 * los términos del sitio y los derechos de autor del contenido.
 */
export async function downloadReel(rawUrl: string): Promise<string> {
  const url = validateReelUrl(rawUrl);
  await ensureDirs();
  const id = newId();
  await run(YT_DLP, [
    "--no-playlist",
    "--max-filesize", "150M",
    "-f", "b[ext=mp4]/bv*+ba/b",
    "--merge-output-format", "mp4",
    "-o", path.join(TMP_DIR, `${id}.%(ext)s`),
    "--",
    url,
  ]);
  const file = (await fs.readdir(TMP_DIR)).find((f) => f.startsWith(`${id}.`));
  if (!file) throw new Error("yt-dlp no descargó ningún archivo (¿el reel es privado?)");
  return path.join(TMP_DIR, file);
}
