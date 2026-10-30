import { NextResponse, type NextRequest } from "next/server";
import { getGoogleAccessToken } from "@/lib/auth";
import { uploadVideo } from "@/lib/google/drive";
import { getDb, mediaPath, updateDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/** Sube el MP4 terminado a Google Drive (permiso drive.file: solo archivos creados por la app) */
export async function POST(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const token = await getGoogleAccessToken(req);
  if (!token) return jsonError("Inicia sesión con Google", 401);
  const job = (await getDb()).renders.find((r) => r.id === id);
  if (!job?.output || job.status !== "done") return jsonError("El video aún no está listo");
  try {
    const body = (await req.json().catch(() => ({}))) as { name?: string; folderId?: string };
    const name = (body.name?.trim() || "Momentos").slice(0, 100).replace(/[\\/]/g, "-") + ".mp4";
    const driveFileId = await uploadVideo(token, mediaPath(job.output), name, body.folderId || undefined);
    await updateDb((db) => {
      const r = db.renders.find((x) => x.id === id);
      if (r) r.driveFileId = driveFileId;
    });
    return NextResponse.json({ driveFileId, url: `https://drive.google.com/file/d/${driveFileId}/view` });
  } catch (e) {
    return jsonError(errorMessage(e), 502);
  }
}
