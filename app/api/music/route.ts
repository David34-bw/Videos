import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { extFromMime, saveMedia } from "@/lib/server/storage";
import { jsonError } from "@/lib/server/http";

const MUSIC_DIR = path.join(process.cwd(), "public", "music");
const AUDIO_EXT = /\.(mp3|m4a|aac|wav|ogg)$/i;

/** Pistas en public/music (libres de derechos que agregues tú) */
export async function GET() {
  let files: string[] = [];
  try {
    files = (await fs.readdir(MUSIC_DIR)).filter((f) => AUDIO_EXT.test(f));
  } catch {
    // carpeta vacía o inexistente
  }
  return NextResponse.json({
    tracks: files.map((f) => ({ name: f.replace(AUDIO_EXT, ""), src: `/music/${encodeURIComponent(f)}` })),
  });
}

/** Sube una canción propia; queda en data/media */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const f = form.get("file");
  if (!(f instanceof File) || !f.type.startsWith("audio/") || f.size > 30 * 1024 * 1024) {
    return jsonError("Sube un archivo de audio de máximo 30 MB");
  }
  const file = await saveMedia(Buffer.from(await f.arrayBuffer()), extFromMime(f.type));
  return NextResponse.json({ track: { name: f.name, src: file } });
}
