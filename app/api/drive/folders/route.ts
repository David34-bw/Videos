import { NextResponse, type NextRequest } from "next/server";
import { fullDriveRead, getGoogleAccessToken } from "@/lib/auth";
import { listFolders } from "@/lib/google/drive";
import { errorMessage, jsonError } from "@/lib/server/http";

/** Explorador de carpetas (solo con GOOGLE_DRIVE_FULL_READ=true) */
export async function GET(req: NextRequest) {
  if (!fullDriveRead()) return jsonError("Activa GOOGLE_DRIVE_FULL_READ para navegar carpetas", 403);
  const token = await getGoogleAccessToken(req);
  if (!token) return jsonError("Inicia sesión con Google", 401);
  try {
    const parent = req.nextUrl.searchParams.get("parent") ?? "root";
    return NextResponse.json({ folders: await listFolders(token, parent) });
  } catch (e) {
    return jsonError(errorMessage(e), 502);
  }
}
