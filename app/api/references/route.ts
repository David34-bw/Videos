import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { createReference } from "@/lib/reference/create";
import { downloadReel } from "@/lib/reference/download";
import { TMP_DIR, ensureDirs, extFromMime, getDb, newId, updateDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";

export const maxDuration = 300;

export async function GET() {
  const db = await getDb();
  return NextResponse.json({ references: db.references });
}

/** Crea una plantilla a partir de un video subido (multipart "file") o de un link ({ url }) */
export async function POST(req: NextRequest) {
  let tmpFile: string | null = null;
  try {
    let name = "";
    let sourceUrl: string | undefined;
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const f = form.get("file");
      if (!(f instanceof File) || !f.type.startsWith("video/")) return jsonError("Sube un archivo de video");
      if (f.size > 150 * 1024 * 1024) return jsonError("El video debe pesar máximo 150 MB");
      await ensureDirs();
      tmpFile = path.join(TMP_DIR, `${newId()}.${extFromMime(f.type)}`);
      await fs.writeFile(tmpFile, Buffer.from(await f.arrayBuffer()));
      name = String(form.get("name") ?? f.name.replace(/\.[^.]+$/, ""));
    } else {
      const body = (await req.json()) as { url?: string; name?: string };
      if (!body.url) return jsonError("Falta el link");
      sourceUrl = body.url;
      tmpFile = await downloadReel(body.url);
      name = body.name ?? "Reel";
    }
    const reference = await createReference(tmpFile, name, sourceUrl);
    await updateDb((db) => db.references.unshift(reference));
    return NextResponse.json({ reference });
  } catch (e) {
    const msg = errorMessage(e);
    if (/ENOENT|yt-dlp/.test(msg) && !msg.includes("descargó")) {
      return jsonError("No se pudo descargar el link. Instala yt-dlp o sube el archivo del video. Detalle: " + msg.slice(0, 300), 502);
    }
    return jsonError(msg, 500);
  } finally {
    // El video original no se guarda: solo fotogramas, audio y la línea de tiempo
    if (tmpFile) await fs.rm(tmpFile, { force: true });
  }
}
