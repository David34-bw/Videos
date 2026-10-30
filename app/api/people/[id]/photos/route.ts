import fs from "node:fs/promises";
import { NextResponse, type NextRequest } from "next/server";
import { getGoogleAccessToken } from "@/lib/auth";
import { getFile, importDriveImage, listImagesInFolder } from "@/lib/google/drive";
import { extFromMime, getDb, mediaPath, saveMedia, updateDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";
import type { Photo } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

const MAX_IMPORT = 60;
const MAX_UPLOAD = 25 * 1024 * 1024;

/**
 * Agrega fotos a una persona:
 *  - JSON { driveIds: string[] }  → fotos elegidas en el Google Picker
 *  - JSON { folderId: string }    → todas las fotos de una carpeta (requiere lectura completa)
 *  - multipart "files"            → fotos subidas desde el computador
 */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const person = (await getDb()).people.find((p) => p.id === id);
  if (!person) return jsonError("Persona no encontrada", 404);

  const added: Photo[] = [];
  const errors: string[] = [];
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      for (const f of form.getAll("files")) {
        if (!(f instanceof File)) continue;
        if (!f.type.startsWith("image/") || f.size > MAX_UPLOAD) {
          errors.push(`${f.name}: debe ser una imagen de máximo 25 MB`);
          continue;
        }
        if (/hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name)) {
          errors.push(`${f.name}: el navegador no muestra HEIC, conviértela a JPG (desde Drive se convierte sola)`);
          continue;
        }
        const file = await saveMedia(Buffer.from(await f.arrayBuffer()), extFromMime(f.type));
        added.push({ file, source: "local", name: f.name });
      }
    } else {
      const body = (await req.json()) as { driveIds?: string[]; folderId?: string };
      const token = await getGoogleAccessToken(req);
      if (!token) return jsonError("Inicia sesión con Google", 401);
      const known = new Set(person.photos.map((p) => p.driveId));
      const files = body.folderId
        ? await listImagesInFolder(token, body.folderId)
        : await Promise.all((body.driveIds ?? []).slice(0, MAX_IMPORT).map((d) => getFile(token, d)));
      for (const f of files.filter((x) => !known.has(x.id)).slice(0, MAX_IMPORT)) {
        try {
          added.push(await importDriveImage(token, f));
        } catch (e) {
          errors.push(errorMessage(e));
        }
      }
    }
  } catch (e) {
    return jsonError(errorMessage(e), 502);
  }

  const updated = await updateDb((db) => {
    const p = db.people.find((x) => x.id === id)!;
    p.photos.push(...added);
    return p;
  });
  return NextResponse.json({ person: updated, added: added.length, errors });
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const file = req.nextUrl.searchParams.get("file") ?? "";
  const person = await updateDb((db) => {
    const p = db.people.find((x) => x.id === id);
    if (p) p.photos = p.photos.filter((ph) => ph.file !== file);
    return p;
  });
  if (!person) return jsonError("Persona no encontrada", 404);
  try {
    await fs.rm(mediaPath(file), { force: true });
  } catch {
    // nombre inválido: no hay nada que borrar
  }
  return NextResponse.json({ person });
}
