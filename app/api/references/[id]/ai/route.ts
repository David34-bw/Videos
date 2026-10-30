import { NextResponse, type NextRequest } from "next/server";
import { aiEnabled, refineWithAI } from "@/lib/reference/ai";
import { getDb, updateDb } from "@/lib/server/storage";
import { errorMessage, jsonError } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const maxDuration = 120;

/** Afina la plantilla con la API de Claude (envía fotogramas del video de referencia) */
export async function POST(_req: NextRequest, { params }: Ctx) {
  if (!aiEnabled()) return jsonError("Configura ANTHROPIC_API_KEY para usar esta opción", 400);
  const { id } = await params;
  const ref = (await getDb()).references.find((r) => r.id === id);
  if (!ref) return jsonError("No encontrada", 404);
  try {
    const { spec, notes } = await refineWithAI(ref.spec, ref.frames);
    const reference = await updateDb((db) => {
      const r = db.references.find((x) => x.id === id)!;
      // Conserva los textos que el usuario ya escribió
      r.spec = { ...spec, segments: spec.segments.map((s, i) => ({ ...s, text: r.spec.segments[i]?.text })) };
      r.aiNotes = notes;
      return r;
    });
    return NextResponse.json({ reference });
  } catch (e) {
    return jsonError(errorMessage(e), 502);
  }
}
