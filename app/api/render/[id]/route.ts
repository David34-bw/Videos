import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/server/storage";
import { jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const job = (await getDb()).renders.find((r) => r.id === id);
  return job
    ? NextResponse.json({ job }, { headers: { "Cache-Control": "no-store" } })
    : jsonError("No encontrado", 404);
}
