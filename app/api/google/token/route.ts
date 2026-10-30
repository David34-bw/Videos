import { NextResponse, type NextRequest } from "next/server";
import { fullDriveRead, getGoogleAccessToken } from "@/lib/auth";
import { jsonError } from "@/lib/server/http";

/** Token para el Google Picker (solo mismo origen, requiere sesión) */
export async function GET(req: NextRequest) {
  const accessToken = await getGoogleAccessToken(req);
  if (!accessToken) return jsonError("Inicia sesión con Google", 401);
  return NextResponse.json(
    {
      accessToken,
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? "",
      appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? "",
      fullRead: fullDriveRead(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
